export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'seller' | 'admin';
  avatar?: string;
  bio?: string;
  skills?: string[];
  hourlyRate?: string;
  rating?: number;
  completedJobs?: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  images: string[];
  seller: {
    id: string;
    name: string;
    rating: number;
  };
  rating: number;
  reviews: number;
  features?: string[];
  createdAt: string;
}

export interface Order {
  id: string;
  productId: string;
  product: string;
  buyerId: string;
  sellerId: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'disputed' | 'refunded';
  total: number;
  currency: string;
  paymentMethod: string;
  shippingAddress?: string;
  date: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balances: WalletBalance[];
  transactions: WalletTransaction[];
}

export interface WalletBalance {
  currency: string;
  amount: number;
  rate: number;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface Payment {
  id: string;
  orderId: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  budget: string;
  duration: string;
  category: string;
  skills: string[];
  clientId: string;
  client: {
    name: string;
    rating: number;
    jobs: number;
  };
  proposals: number;
  posted: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
}

export interface Proposal {
  id: string;
  jobId: string;
  jobTitle: string;
  freelancerId: string;
  amount: string;
  coverLetter: string;
  status: 'pending' | 'accepted' | 'rejected';
  submitted: string;
}

export interface KYCSubmission {
  id: string;
  userId: string;
  userName: string;
  documentType: string;
  documentUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted: string;
  reviewedAt?: string;
}
