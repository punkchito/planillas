// src/app/models/user.model.ts
export interface User {
  id?: number;
  name: string;
  email: string;
  dni?: string;
  phone?: string;
  status: 'active' | 'inactive';
  role: string;
  role_name?: string;
  role_type?: 'admin' | 'user' | 'viewer';
  role_description?: string;
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  created_by_name?: string;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: string;
  dni?: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: User;
    expires_in?: number;
  };
  errors?: string[];
}

export interface ProfileResponse {
  success: boolean;
  data: {
    user: User;
    permissions: string[];
    role_details: {
      id: string;
      name: string;
      type: string;
      description?: string;
    };
  };
  message?: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
  error_code?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  avatar?: string;
}

// Enums para tipos de datos
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export enum RoleType {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer'
}

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  ACTIVATED = 'activated',
  DEACTIVATED = 'deactivated',
  ROLE_CHANGED = 'role_changed'
}