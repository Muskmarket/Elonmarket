import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a UTC date string to the user's local time.
 * Explicitly treats the input as UTC to ensure the browser performs the correct shift.
 */
export function formatToLocalTime(dateString: string | undefined | null) {
  if (!dateString) return "";
  
  try {
    // Force UTC interpretation by ensuring it ends with Z if no offset is present
    const utcDateString = dateString.includes('Z') || dateString.includes('+') 
      ? dateString 
      : `${dateString.replace(' ', 'T')}Z`;

    const date = new Date(utcDateString);
    
    if (isNaN(date.getTime())) return "Invalid Date";

    // Use Intl.DateTimeFormat to explicitly convert to local time
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(date);
  } catch (error) {
    console.error("Format error:", error);
    return "Error formatting date";
  }
}

/**
 * Formats a UTC date string to the user's local time (full date).
 */
export function formatToLocalFullDate(dateString: string | undefined | null) {
  if (!dateString) return "";
  
  try {
    const utcDateString = dateString.includes('Z') || dateString.includes('+') 
      ? dateString 
      : `${dateString.replace(' ', 'T')}Z`;

    const date = new Date(utcDateString);
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(date);
  } catch (error) {
    return "Error";
  }
}
