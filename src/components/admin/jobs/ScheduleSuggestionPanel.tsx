'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateSuggestions, applySuggestion, type SuggestionResult } from '@/lib/actions/scheduling-actions'
import type { ScheduleSuggestion } from '@/services/scheduling-suggestions'
import { Sparkles, Clock, User, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

interface ScheduleSuggestionPanelProps {
  jobId: string
  /** Whether the job is in a terminal state (completed/cancelled) — hides the panel */
  isTerminal: boolean
}

export function ScheduleSuggestionPanel({ jobId, isTerminal }: ScheduleSuggestionPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<SuggestionResult | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)

  if (isTerminal) return null

  function handleGenerate() {
    setIsCollapsed(false)
    setError(null)
    setResult(null)
    setApplied(false)
    startTransition(async () => {
      try {
        const data = await generateSuggestions(jobId)
        setResult(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate suggestions')
      }
    })
  }

  function handleApply(suggestion: ScheduleSuggestion) {
    setError(null)
    const key = `${suggestion.inspectorId}-${suggestion.date}-${suggestion.time}`
    setApplyingId(key)
    startTransition(async () => {
      try {
        const res = await applySuggestion(
          jobId,
          suggestion.inspectorId,
          suggestion.date,
          suggestion.time,
          suggestion.durationMinutes
        )
        if (!res.success) {
          setError(res.error ?? 'Failed to apply suggestion')
          setApplyingId(null)
        } else {
          setApplied(true)
          setApplyingId(null)
          router.refresh()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to apply suggestion')
        setApplyingId(null)
      }
    })
  }

  function formatTime(time: string): string {
    const [hh, mm] = time.split(':')
    const hour = parseInt(hh, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${h12}:${mm} ${ampm}`
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function scoreColor(score: number): string {
    if (score >= 80) return 'text-green-700 bg-green-50 border-green-300'
    if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-300'
    return 'text-slate-600 bg-slate-50 border-slate-300'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsCollapsed((c) => !c)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide hover:text-slate-900 transition-colors"
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
          <Sparkles className="w-4 h-4 text-[#FDE047]" />
          Smart Scheduling
        </button>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-[#FDE047] text-black border-2 border-black rounded-md hover:bg-yellow-300 transition-colors disabled:opacity-50"
        >
          {isPending && !applyingId ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              {result ? 'Refresh' : 'Get Suggestions'}
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <>
      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Applied success */}
      {applied && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-xs text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Schedule applied successfully. Page data refreshed.</span>
        </div>
      )}

      {/* Duration estimate */}
      {result && (
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Estimated duration: <strong>{result.durationEstimate.estimatedMinutes} min</strong>
          <span className="text-slate-400">
            ({result.durationEstimate.basis === 'explicit' ? 'user-set' : 'rule-based'})
          </span>
        </div>
      )}

      {/* Empty state */}
      {result && result.suggestions.length === 0 && (
        <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md">
          No available slots found. Try adjusting the date or check inspector availability.
        </div>
      )}

      {/* Suggestion list */}
      {result && result.suggestions.length > 0 && !applied && (
        <div className="space-y-2">
          {result.suggestions.map((s, i) => {
            const key = `${s.inspectorId}-${s.date}-${s.time}`
            const isApplying = applyingId === key
            return (
              <div
                key={key}
                className="bg-white border-2 border-black rounded-lg p-3 flex items-start justify-between gap-3 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-shadow"
              >
                <div className="flex-1 space-y-1.5">
                  {/* Rank + Score */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${scoreColor(s.score)}`}>
                      {s.score}/100
                    </span>
                  </div>

                  {/* Inspector + Date/Time */}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 font-medium text-slate-900">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {s.inspectorName}
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(s.date)} at {formatTime(s.time)}
                    </span>
                  </div>

                  {/* Workload */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{s.existingJobCount} job{s.existingJobCount !== 1 ? 's' : ''} that day</span>
                    <span>{s.durationMinutes} min</span>
                  </div>

                  {/* Score breakdown */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>Workload: {s.factors.workload}</span>
                    <span className="text-slate-300">·</span>
                    <span>Time: {s.factors.timePreference}</span>
                  </div>

                  {/* Reasons */}
                  <div className="text-[11px] text-slate-400 italic">
                    {s.reasons.join(' · ')}
                  </div>
                </div>

                {/* Apply button */}
                <button
                  onClick={() => handleApply(s)}
                  disabled={isPending}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-bold bg-[#2563EB] text-white border-2 border-black rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isApplying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
        </>
      )}
    </div>
  )
}
