import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date for display
export function formatDate(date: string | Date | undefined): string {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format date with time for display
export function formatDateTime(date: string | Date | undefined, time?: string): string {
  if (!date) return '';
  
  const d = new Date(date);
  
  // Apply time if provided
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    d.setHours(hours, minutes);
  }
  
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Calculate time difference in hours
export function calculateHours(
  startDate?: string | Date,
  endDate?: string | Date,
  startTime?: string,
  endTime?: string
): number {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Apply times if available
  if (startTime) {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    start.setHours(startHours, startMinutes);
  }
  
  if (endTime) {
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    end.setHours(endHours, endMinutes);
  }
  
  // Calculate hours difference
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100; // Round to 2 decimal places
}

// Currency options
export const currencyOptions = [
  { value: 'PHP', label: 'PHP (₱)', symbol: '₱' },
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { value: 'SGD', label: 'SGD (S$)', symbol: 'S$' },
  { value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
];

// Get or set the user's preferred currency
export function getUserCurrency(): string {
  const savedCurrency = localStorage.getItem('preferredCurrency');
  return savedCurrency || 'PHP'; // Default to PHP
}

export function setUserCurrency(currency: string): void {
  localStorage.setItem('preferredCurrency', currency);
}

// Get currency symbol
export function getCurrencySymbol(currencyCode: string): string {
  const currency = currencyOptions.find(c => c.value === currencyCode);
  return currency?.symbol || '₱'; // Default to PHP symbol
}

// Format currency
export function formatCurrency(amount: number | undefined, currency?: string): string {
  if (amount === undefined) return `${getCurrencySymbol(getUserCurrency())}0.00`;
  
  const currencyCode = currency || getUserCurrency();
  
  if (currencyCode === 'PHP') {
    return `₱${amount.toFixed(2)}`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(amount);
}

// Format pricing display
export function formatPricing(task: { pricingType: string, hourlyRate?: number, fixedPrice?: number }): string {
  if (task.pricingType === 'hourly' && task.hourlyRate) {
    return `${formatCurrency(task.hourlyRate / 100)}/hr`;
  } else if (task.pricingType === 'fixed' && task.fixedPrice) {
    return formatCurrency(task.fixedPrice / 100);
  }
  return 'N/A';
}

// Format hours display
export function formatHours(task: { 
  startDate?: string | Date, 
  endDate?: string | Date,
  startTime?: string,
  endTime?: string,
  pricingType?: string
}): string {
  if (!task.startDate || !task.endDate) {
    return 'N/A';
  }
  
  if (task.pricingType === 'fixed') {
    return 'Fixed Price';
  }
  
  const hours = calculateHours(task.startDate, task.endDate, task.startTime, task.endTime);
  
  if (hours <= 0) {
    return 'N/A';
  }
  
  return `${hours} hr${hours !== 1 ? 's' : ''}`;
}

// Status color mapping
export function getStatusColor(status: string): { bg: string, text: string } {
  switch (status) {
    case 'todo':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'in_progress':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'completed':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

// Format status display
export function formatStatus(status: string): string {
  switch (status) {
    case 'todo':
      return 'To Do';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

// Get time ago for timestamps
export function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.round((now.getTime() - d.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  
  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (days < 7) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(d);
  }
}

// Get initials from name
export function getInitials(name: string): string {
  if (!name) return '';
  
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

// Parse comma-separated tags
export function parseTags(tagsString: string): string[] {
  if (!tagsString) return [];
  
  return tagsString.split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

// Format tags array to comma-separated string
export function formatTags(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return '';
  
  return tags.join(', ');
}
