'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CHOIR_STATUS_LABELS, CHOIR_STATUS_PILL_CLASSES } from './choir-status-constants'

interface ChoirStatusBadgeProps {
  serviceId: string
  churchId: string
  choirStatus: string
  userRole: string
}

export function ChoirStatusBadge({
  serviceId,
  churchId,
  choirStatus,
  userRole,
}: ChoirStatusBadgeProps) {
  const [currentStatus, setCurrentStatus] = useState(choirStatus)
  const isEditor = userRole === 'EDITOR' || userRole === 'ADMIN'

  async function handleChange(newStatus: string) {
    const previous = currentStatus
    setCurrentStatus(newStatus)
    try {
      const res = await fetch(`/api/churches/${churchId}/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choirStatus: newStatus }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      setCurrentStatus(previous)
    }
  }

  if (isEditor) {
    return (
      <select
        value={currentStatus}
        onChange={(e) => handleChange(e.target.value)}
        className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-border bg-background hover:border-foreground transition-colors"
        aria-label="Choir status"
      >
        {Object.entries(CHOIR_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    )
  }

  // MEMBER: show static pill only for non-default statuses
  if (currentStatus === 'CHOIR_REQUIRED') {
    return null
  }

  return (
    <span
      className={cn(
        'text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5',
        CHOIR_STATUS_PILL_CLASSES[currentStatus] ?? 'bg-gray-100 text-gray-600 border border-gray-300'
      )}
    >
      {CHOIR_STATUS_LABELS[currentStatus] ?? currentStatus}
    </span>
  )
}
