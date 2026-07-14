import React from 'react'
import { cn } from '../../lib/utils'

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-14 px-6 text-center', className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <Icon size={22} className="text-surface-400" />
        </div>
      )}
      <p className="text-sm font-medium text-surface-700">{title}</p>
      {description && (
        <p className="text-sm text-surface-400 mt-1 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
