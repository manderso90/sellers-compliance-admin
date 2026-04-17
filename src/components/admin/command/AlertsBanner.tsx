'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComputedAlert } from '@/lib/queries/command-center'

export function AlertsBanner({ alerts }: { alerts: ComputedAlert[] }) {
  const [dismissed, setDismissed] = useState(false)

  if (alerts.length === 0 || dismissed) return null

  return (
    <div className="bg-[#D4AF37] border-2 border-[#2B2B2B] rounded-xl neo-shadow-sm px-5 py-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <AlertTriangle className="w-4 h-4 text-[#2B2B2B] mt-0.5 shrink-0" />
          <div className="space-y-1">
            {alerts.map((alert, i) => (
              <p
                key={i}
                className={cn(
                  'text-sm font-semibold',
                  alert.severity === 'critical' ? 'text-[#2B2B2B]' : 'text-[#2B2B2B]/70'
                )}
              >
                {alert.message}
              </p>
            ))}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[#2B2B2B]/40 hover:text-[#2B2B2B] shrink-0 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
