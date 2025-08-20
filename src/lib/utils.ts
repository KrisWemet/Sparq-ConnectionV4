import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function formatRelativeTime(input: string | number | Date): string {
  const date = new Date(input)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) {
    return "Just now"
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  } else if (diffInHours < 48) {
    return "Yesterday"
  } else {
    return formatDate(date)
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return `${first}${last}` || '??'
}

export function calculateRelationshipDuration(startDate: string): string {
  const start = new Date(startDate)
  const now = new Date()
  const diffInMs = now.getTime() - start.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''}`
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  } else {
    const years = Math.floor(diffInDays / 365)
    const remainingMonths = Math.floor((diffInDays % 365) / 30)
    if (remainingMonths > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
    }
    return `${years} year${years > 1 ? 's' : ''}`
  }
}

export function getRelationshipHealthColor(score: number): string {
  if (score >= 8) return 'text-growth-600'
  if (score >= 6) return 'text-trust-600'
  if (score >= 4) return 'text-connection-600'
  if (score >= 2) return 'text-orange-600'
  return 'text-crisis-600'
}

export function getRelationshipHealthLabel(score: number): string {
  if (score >= 8) return 'Thriving'
  if (score >= 6) return 'Healthy'
  if (score >= 4) return 'Growing'
  if (score >= 2) return 'Needs Attention'
  return 'Requires Support'
}