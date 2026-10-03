/** "15 August 2014", "August 2014" or "2014", depending on how much of the date is known. */
export function formatTaken(taken: string, locale?: string) {
  const [year, month, day] = taken.slice(0, 10).split('-').map(Number)

  if (!month) {
    return String(year)
  }

  const date = new Date(year, month - 1, day || 1)
  return date.toLocaleDateString(locale, day ? { day: 'numeric', month: 'long', year: 'numeric' } : { month: 'long', year: 'numeric' })
}
