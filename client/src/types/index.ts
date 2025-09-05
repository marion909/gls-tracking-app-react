export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
}

export interface Package {
  id: string;
  trackingNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  fromAddress: string;
  toAddress: string;
  weight?: number;
  dimensions?: string;
  description?: string;
  status: PackageStatus;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  user?: User;
  trackingEvents?: TrackingEvent[];
}

export interface TrackingEvent {
  id: string;
  packageId: string;
  status: string;
  location: string;
  description: string;
  timestamp: string;
}

export type PackageStatus = 
  | 'PENDING'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_DELIVERY'
  | 'RETURNED'
  | 'CANCELLED';

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CreatePackageData {
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  fromAddress: string;
  toAddress: string;
  weight?: number;
  dimensions?: string;
  description?: string;
  estimatedDelivery?: string;
}
