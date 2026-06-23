import { Injectable } from '@nestjs/common';
import { IdentityVerificationProvider } from './adapters/identity-verification-provider.interface';

/**
 * Identity Verification Registry
 * Follows the same registry pattern as PaymentProviderRegistry.
 * Manages identity verification provider adapters.
 */
@Injectable()
export class IdentityVerificationRegistry {
  private readonly providers: Map<string, IdentityVerificationProvider> = new Map();

  /**
   * Register an identity verification provider adapter
   */
  register(provider: IdentityVerificationProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get a provider by name
   */
  get(name: string): IdentityVerificationProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   */
  getAll(): IdentityVerificationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers that support a specific document type
   */
  getByDocumentType(documentType: string): IdentityVerificationProvider[] {
    return this.getAll().filter((provider) =>
      provider.supportsDocumentType(documentType),
    );
  }

  /**
   * Check if a provider is registered
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
}
