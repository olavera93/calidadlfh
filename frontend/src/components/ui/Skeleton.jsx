import React from 'react'
import { cn } from '../../lib/utils'

export function Skeleton({ className }) {
  return (
    <div className={cn('skeleton-shimmer rounded-lg', className)} />
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="p-4 space-y-2">
      <div className="flex gap-3 mb-4">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3" style={{ opacity: 1 - i * 0.12 }}>
          <Skeleton className="h-8 w-32" />
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ className }) {
  return (
    <div className={cn('card p-5 space-y-3', className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}
