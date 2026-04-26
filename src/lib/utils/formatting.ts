/**
 * Currency and number formatting utilities.
 */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyPrecise(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number, decimals: number = 1): string {
  if (Number.isInteger(value)) return value.toLocaleString('en-US')
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a Postgres `time` value (HH:MM or HH:MM:SS) as 12-hour with AM/PM.
 * Returns '' for null/empty/non-parseable input so callers can `|| '—'`.
 */
export function formatTime12Hour(time: string | null | undefined): string {
  if (!time) return ''
  const [hRaw, mRaw] = time.split(':')
  const h = Number.parseInt(hRaw ?? '', 10)
  if (!Number.isFinite(h)) return ''
  const minute = (mRaw ?? '00').padStart(2, '0').slice(0, 2)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${minute} ${period}`
}
