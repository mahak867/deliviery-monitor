import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import type { DeliveryStatus } from '@/types'

// ── Tailwind class merging ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ── Date formatting ───────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`
    if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`
    return format(date, 'd MMM yyyy, h:mm a')
  } catch {
    return dateStr
  }
}

export function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd MMM yyyy')
  } catch {
    return dateStr
  }
}

// ── Phone number validation ───────────────────────────────────────────────────

export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return /^91[6-9]\d{9}$/.test(cleaned)
  }
  return /^[6-9]\d{9}$/.test(cleaned)
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return phone
}

export function normalisePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned.slice(2)
  return cleaned
}

// ── Status helpers ────────────────────────────────────────────────────────────

export function getStatusIcon(status: DeliveryStatus): string {
  const icons: Record<DeliveryStatus, string> = {
    order_placed:     '📋',
    packed:           '📦',
    shipped:          '🚚',
    in_transit:       '🔄',
    out_for_delivery: '🛵',
    delivered:        '✅',
    delayed:          '⚠️',
    cancelled:        '❌',
    returned:         '↩️',
    failed_delivery:  '🚫',
  }
  return icons[status] ?? '📦'
}

export function isActiveStatus(status: DeliveryStatus): boolean {
  return ['shipped', 'in_transit', 'out_for_delivery', 'packed'].includes(status)
}

// ── Tracking number detection ─────────────────────────────────────────────────

export function detectCourier(trackingNumber: string): string | null {
  const patterns: Array<[RegExp, string]> = [
    [/^\d{12}$/, 'delhivery'],
    [/^[A-Z]{3}\d{9}IN$/, 'india_post'],
    [/^[0-9]{10}$/, 'dtdc'],
    [/^FMPP\d+$/, 'ekart'],
    [/^AMZN\d+$/, 'amazon_logistics'],
    [/^B\d{10}$/, 'bluedart'],
    [/^XB\d+$/, 'xpressbees'],
  ]
  for (const [regex, courier] of patterns) {
    if (regex.test(trackingNumber.trim())) return courier
  }
  return null
}

// ── Weight & dimensions formatting ───────────────────────────────────────────

export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`
  return `${grams} g`
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ── Truncate text ─────────────────────────────────────────────────────────────

export function truncate(str: string, n: number): string {
  return str.length > n ? `${str.slice(0, n - 3)}...` : str
}
