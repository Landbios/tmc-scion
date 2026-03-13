import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  const visiblePart = localPart.slice(0, 3);
  const maskedPart = '*'.repeat(Math.max(0, localPart.length - 3));
  return `${visiblePart}${maskedPart}@${domain}`;
}
