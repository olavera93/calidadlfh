import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases Tailwind sin conflictos.
 * Uso: cn('px-2 py-1', isActive && 'bg-brand-600', className)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
