export enum UserEventTopics {
  USER_REGISTERED = 'user.registered',
  USER_VERIFIED = 'user.verified',
  USER_UPDATED = 'user.updated',
  USER_DEACTIVATED = 'user.deactivated',
  USER_LOGIN = 'user.login',
  USER_PASSWORD_CHANGED = 'user.password_changed',
  USER_KYC_SUBMITTED = 'user.kyc_submitted',
  USER_KYC_APPROVED = 'user.kyc_approved',
  USER_KYC_REJECTED = 'user.kyc_rejected',
}

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  role: string;
  registrationMethod: string;
}

export interface UserVerifiedEvent {
  userId: string;
  verifiedBy: string;
  verificationType: string;
}

export interface UserUpdatedEvent {
  userId: string;
  updatedFields: string[];
  previousValues?: Record<string, unknown>;
}

export interface UserDeactivatedEvent {
  userId: string;
  reason: string;
  deactivatedBy: string;
}

export interface UserLoginEvent {
  userId: string;
  ipAddress: string;
  userAgent: string;
  loginMethod: string;
  success: boolean;
}

export interface UserPasswordChangedEvent {
  userId: string;
  changedVia: 'reset' | 'profile';
}

export interface UserKycSubmittedEvent {
  userId: string;
  documentType: string;
  submittedAt: string;
}

export interface UserKycApprovedEvent {
  userId: string;
  approvedBy: string;
  approvedAt: string;
}

export interface UserKycRejectedEvent {
  userId: string;
  rejectedBy: string;
  reason: string;
  rejectedAt: string;
}

export type UserEvents = {
  [UserEventTopics.USER_REGISTERED]: UserRegisteredEvent;
  [UserEventTopics.USER_VERIFIED]: UserVerifiedEvent;
  [UserEventTopics.USER_UPDATED]: UserUpdatedEvent;
  [UserEventTopics.USER_DEACTIVATED]: UserDeactivatedEvent;
  [UserEventTopics.USER_LOGIN]: UserLoginEvent;
  [UserEventTopics.USER_PASSWORD_CHANGED]: UserPasswordChangedEvent;
  [UserEventTopics.USER_KYC_SUBMITTED]: UserKycSubmittedEvent;
  [UserEventTopics.USER_KYC_APPROVED]: UserKycApprovedEvent;
  [UserEventTopics.USER_KYC_REJECTED]: UserKycRejectedEvent;
};
