export const APP_NAME = 'Adbar';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AU'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PRODUCT_CATEGORIES = [
  'UI Kits',
  'Templates',
  'Icons',
  'Plugins',
  'Themes',
  'Graphics',
  'Audio',
  'Video',
] as const;

export const JOB_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'Design',
  'Writing',
  'Marketing',
  'Data Entry',
  'Translation',
] as const;

export const ORDER_STATUSES = [
  'pending',
  'processing',
  'completed',
  'cancelled',
  'disputed',
  'refunded',
] as const;

export const PAYMENT_METHODS = ['wallet', 'card', 'bank_transfer'] as const;

export const PAGINATION_LIMIT = 20;
