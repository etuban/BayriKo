// User related types
export type UserRole = 'supervisor' | 'team_lead' | 'staff';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  position?: string;
  createdAt: string;
}

// Project related types
export interface Project {
  id: number;
  name: string;
  description?: string;
  createdById: number;
  createdAt: string;
  creator?: User;
  taskCount?: number;
}

// Task related types
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type PricingType = 'hourly' | 'fixed';
export type CurrencyType = 'PHP' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'SGD' | 'AUD' | 'CAD';

export interface Task {
  id: number;
  title: string;
  description?: string;
  projectId: number;
  project?: Project;
  assignedToId?: number;
  assignedTo?: User;
  createdById: number;
  createdBy?: User;
  tags?: string[];
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  dueDate?: string;
  pricingType: PricingType;
  currency?: CurrencyType;
  hourlyRate?: number;
  fixedPrice?: number;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  hours?: number | 'Fixed';
  totalAmount?: number;
}

// Task Comment related types
export interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  user?: User;
  content: string;
  attachments?: string[];
  createdAt: string;
}

// Task History related types
export interface TaskHistory {
  id: number;
  taskId: number;
  userId: number;
  user?: User;
  action: string;
  details?: any;
  createdAt: string;
}

// Notification related types
export type NotificationType = 'task_assigned' | 'task_status_changed' | 'task_comment' | 'task_due_soon';

export interface Notification {
  id: number;
  userId: number;
  taskId?: number;
  task?: Task;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}

// Form related types
export interface TaskFormValues {
  title: string;
  description?: string;
  projectId: number;
  assignedToId?: number;
  tags?: string[];
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  dueDate?: string;
  pricingType: PricingType;
  currency?: CurrencyType;
  hourlyRate?: number;
  fixedPrice?: number;
  status: TaskStatus;
}

export interface ProjectFormValues {
  name: string;
  description?: string;
}

export interface UserFormValues {
  username: string;
  email: string;
  password?: string;
  fullName: string;
  role?: UserRole;
  position?: string;
  avatarUrl?: string;
}

export interface TaskPayableFilters {
  startDate?: string;
  endDate?: string;
  projectId?: number;
}

export interface InvoiceDetails {
  billFrom: string;
  billTo: string;
  paymentTerms: string;
}