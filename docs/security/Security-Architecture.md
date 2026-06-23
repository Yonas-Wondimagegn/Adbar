# Adbar (አድባር) — Security Architecture

**Version:** 1.0.0  
**Date:** 2026-06-21  

---

## 1. Security Principles

1. **Defense in Depth:** Multiple security layers
2. **Least Privilege:** Minimal permissions for each role
3. **Zero Trust:** Verify every request
4. **Privacy by Design:** Data minimization
5. **Compliance First:** PCI DSS, GDPR, CCPA, NBE regulations

---

## 2. Authentication Architecture

### 2.1 JWT Token Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────>│  Gateway │────>│   Auth   │────>│   User   │
│          │     │          │     │  Service │     │   DB     │
│          │<────│          │<────│          │<────│          │
│  Store   │     │ Validate │     │ Generate │     │ Verify   │
│  Tokens  │     │  Token   │     │  Tokens  │     │  Creds   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 2.2 Token Configuration

```typescript
// backend/services/auth/src/config/jwt.config.ts

export const jwtConfig = {
  access: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: '15m',           // Short-lived
    algorithm: 'RS256',         // Asymmetric
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '7d',            // Longer-lived
    algorithm: 'RS256',
  },
  issuer: 'adbar-platform',
  audience: 'adbar-api',
};
```

### 2.3 Multi-Factor Authentication

```typescript
// backend/services/auth/src/mfa/mfa.service.ts

import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qr-code';

@Injectable()
export class MfaService {
  generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `Adbar (${email})`,
      issuer: 'Adbar',
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    };
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step tolerance
    });
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }
}
```

---

## 3. Authorization (RBAC)

### 3.1 Role Hierarchy

```
SUPER_ADMIN
  └── ADMIN
       ├── MODERATOR
       ├── COMPLIANCE_OFFICER
       ├── SELLER
       │    └── BUYER
       ├── FREELANCER
       │    └── CLIENT
       └── BUYER
```

### 3.2 Permission Matrix

| Permission | BUYER | SELLER | FREELANCER | CLIENT | MODERATOR | COMPLIANCE | ADMIN | SUPER_ADMIN |
|-----------|-------|--------|------------|--------|-----------|------------|-------|-------------|
| Browse products | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Purchase | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Sell products | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Post jobs | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Submit proposals | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Moderate content | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ |
| Review KYC | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Manage users | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage payments | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| System settings | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### 3.3 RBAC Guard Implementation

```typescript
// backend/shared/common/src/guards/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// Decorator
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// Usage
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getUsers() { ... }
}
```

---

## 4. Data Protection

### 4.1 Encryption at Rest

```typescript
// backend/shared/common/src/encryption/encryption.service.ts

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex'),
    };
  }

  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### 4.2 Encryption in Transit
- **TLS 1.3** for all API communications
- **mTLS** for service-to-service communication
- **Certificate pinning** for mobile apps

### 4.3 Sensitive Data Handling

| Data Type | Storage | Encryption | Access |
|-----------|---------|------------|--------|
| Passwords | Hashed (bcrypt, cost 12) | N/A | Never readable |
| Payment tokens | Provider-side only | Provider-managed | Never stored |
| ID documents | AWS S3 (encrypted) | AES-256 | Compliance only |
| Phone numbers | Database | AES-256-GCM | User + Admin |
| Email | Database | AES-256-GCM | User + Admin |
| Wallet balances | Database | Application-level | User + Audit |
| Session tokens | Redis | Encrypted | Auth service only |

---

## 5. OWASP Top 10 Protections

| Threat | Protection | Implementation |
|--------|-----------|----------------|
| A01: Broken Access Control | RBAC + ABAC | Guards, middleware |
| A02: Cryptographic Failures | AES-256-GCM, TLS 1.3 | Encryption service |
| A03: Injection | Parameterized queries | Prisma ORM, input validation |
| A04: Insecure Design | Threat modeling | Security review process |
| A05: Security Misconfiguration | IaC, config validation | Terraform, CI checks |
| A06: Vulnerable Components | Dependency scanning | Snyk, npm audit |
| A07: Auth Failures | JWT + MFA + rate limiting | Auth service |
| A08: Data Integrity | Checksums, signed webhooks | Webhook validation |
| A09: Logging Failures | Centralized audit logging | ELK Stack |
| A10: SSRF | URL validation, allowlists | Input validation |

---

## 6. Rate Limiting

```typescript
// backend/api-gateway/src/middleware/rate-limit.middleware.ts

export const rateLimitConfig = {
  // Global
  global: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 1000,                   // 1000 requests per window
  },
  // Auth endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 20,                     // 20 attempts per 15 min
  },
  // Payment endpoints
  payment: {
    windowMs: 60 * 1000,        // 1 minute
    max: 10,                     // 10 payment attempts per minute
  },
  // USSD endpoints
  ussd: {
    windowMs: 60 * 1000,
    max: 30,                     // 30 USSD requests per minute
  },
  // Search
  search: {
    windowMs: 60 * 1000,
    max: 60,                     // 60 searches per minute
  },
};
```

---

## 7. DDoS Mitigation

### 7.1 Multi-Layer Defense

```
Internet
  │
  ▼
┌─────────────────────────────────┐
│  CloudFlare / AWS Shield        │  ← Layer 3/4 DDoS protection
│  - Anycast network              │
│  - Automatic mitigation         │
│  - WAF rules                    │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  AWS ALB + Auto Scaling         │  ← Layer 7 load distribution
│  - Health checks                │
│  - Connection draining          │
│  - Cross-AZ balancing           │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  API Gateway Rate Limiting      │  ← Application-level throttling
│  - Per-IP limits                │
│  - Per-user limits              │
│  - Burst protection             │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  Kubernetes HPA                 │  ← Auto-scaling
│  - CPU-based scaling            │
│  - Custom metrics scaling       │
│  - Pod disruption budgets       │
└─────────────────────────────────┘
```

---

## 8. Audit Logging

```typescript
// backend/shared/common/src/audit/audit.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        ...data,
        oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : null,
        newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : null,
      },
    });
  }
}

// Critical events that MUST be logged:
const AUDIT_EVENTS = {
  // Payment events
  'payment.initiated': 'INFO',
  'payment.success': 'INFO',
  'payment.failed': 'WARN',
  'payment.refund': 'WARN',
  'payout.requested': 'INFO',
  'payout.completed': 'INFO',
  
  // Wallet events (AU mutations)
  'wallet.credit': 'INFO',
  'wallet.debit': 'INFO',
  'wallet.currency_mismatch': 'CRITICAL',  // Fraud signal
  
  // Auth events
  'auth.login': 'INFO',
  'auth.login_failed': 'WARN',
  'auth.mfa_enabled': 'INFO',
  'auth.password_changed': 'INFO',
  
  // KYC events
  'kyc.submitted': 'INFO',
  'kyc.verified': 'INFO',
  'kyc.rejected': 'WARN',
  
  // Dispute events
  'dispute.opened': 'WARN',
  'dispute.resolved': 'INFO',
  
  // Admin events
  'admin.user_suspended': 'CRITICAL',
  'admin.provider_disabled': 'WARN',
  'admin.settings_changed': 'INFO',
};
```

---

## 9. Compliance

### 9.1 PCI DSS Compliance

| Requirement | Implementation |
|------------|----------------|
| 1. Firewall | AWS Security Groups, WAF |
| 2. No default passwords | Enforced password policy |
| 3. Encrypted stored data | AES-256-GCM for PII |
| 4. Encrypted transmission | TLS 1.3 |
| 5. Antivirus | Container scanning (Trivy) |
| 6. Secure systems | Patch management, Snyk |
| 7. Need-to-know access | RBAC |
| 8. Unique IDs | UUID for all entities |
| 9. Physical access | AWS data center compliance |
| 10. Audit trails | Immutable audit logs |
| 11. Security testing | Penetration testing, SAST |
| 12. Security policy | Documented security policy |

**Note:** Adbar does NOT store card data — all card processing is delegated to PCI-compliant providers (Chapa, SantimPay, Stripe) via hosted checkout flows.

### 9.2 GDPR Compliance

| Principle | Implementation |
|-----------|----------------|
| Lawful basis | Consent at registration |
| Data minimization | Only collect necessary data |
| Right to access | `GET /api/v1/users/me` returns all data |
| Right to erasure | `DELETE /api/v1/users/me` (soft delete + anonymization) |
| Data portability | Export to JSON/CSV |
| Privacy by design | Encryption, access controls |
| Breach notification | Automated alerting within 72 hours |
| DPO | Designated Data Protection Officer role |

### 9.3 NBE Compliance

- Adbar integrates **licensed PSOs** (Chapa, SantimPay) — it is NOT a PSO itself
- **AU currency-tagging** prevents cross-currency conversion (core AML control)
- All payment webhook events are immutably audit-logged
- KYC/AML checks via Fayda integration
- Transaction monitoring for suspicious patterns

---

## 10. Secrets Management

```yaml
# infrastructure/kubernetes/base/secrets.yaml (template — never commit actual values)

apiVersion: v1
kind: Secret
metadata:
  name: adbar-payment-secrets
  namespace: adbar
type: Opaque
stringData:
  CHAPA_SECRET_KEY: "${CHAPA_SECRET_KEY}"       # Injected by CI/CD
  SANTIMPAY_PRIVATE_KEY: "${SANTIMPAY_PRIVATE_KEY}"
  STRIPE_SECRET_KEY: "${STRIPE_SECRET_KEY}"
  PAYPAL_CLIENT_SECRET: "${PAYPAL_CLIENT_SECRET}"
  
---
# Production: Use AWS Secrets Manager or HashiCorp Vault
# Development: Use .env files (gitignored)
# CI/CD: Inject from GitHub Secrets / GitLab CI Variables
```

### Secret Rotation Policy
- Payment provider keys: Rotate every 90 days
- JWT signing keys: Rotate every 30 days
- Database credentials: Rotate every 60 days
- Encryption keys: Rotate annually with re-encryption
