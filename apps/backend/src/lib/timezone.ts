const DEFAULT_TIMEZONE = 'UTC'

function getParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value)
  return {
    year: get('year'),
    month: get('month') - 1,
    day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

function getTimezoneOffsetHours(date: Date, timezone: string): number {
  const p = getParts(date, timezone)
  const noonUTC = Date.UTC(p.year, p.month, p.day, 12, 0, 0, 0)
  const noonParts = getParts(new Date(noonUTC), timezone)
  return noonParts.hour - 12
}

function localMidnightToUTC(year: number, month: number, day: number, timezone: string): Date {
  const naiveUTC = Date.UTC(year, month, day, 0, 0, 0, 0)
  const noonUTC = Date.UTC(year, month, day, 12, 0, 0, 0)
  const noonParts = getParts(new Date(noonUTC), timezone)
  const offsetHours = noonParts.hour - 12
  return new Date(naiveUTC - offsetHours * 3600000)
}

export function getStartOfDayInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  const now = new Date()
  const p = getParts(now, timezone)
  return localMidnightToUTC(p.year, p.month, p.day, timezone)
}

export function getStartOfMonthInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  const now = new Date()
  const p = getParts(now, timezone)
  return localMidnightToUTC(p.year, p.month, 1, timezone)
}

export function getStartOfYearInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  const now = new Date()
  const p = getParts(now, timezone)
  return localMidnightToUTC(p.year, 0, 1, timezone)
}

export function getStartOfWeekInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  const now = new Date()
  const p = getParts(now, timezone)

  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  })
  const weekday = dayFormatter.format(now)
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dayOfWeek = dayMap[weekday] ?? 0
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const monday = new Date(Date.UTC(p.year, p.month, p.day - diff, 12, 0, 0, 0))
  const mondayParts = getParts(monday, timezone)
  return localMidnightToUTC(mondayParts.year, mondayParts.month, mondayParts.day, timezone)
}

export function getHourInTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  })
  const hour = parseInt(formatter.format(date))
  return hour === 24 ? 0 : hour
}

export function getDateKeyInTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

export function getDateRangeInTimezone(
  period: string,
  timezone: string = DEFAULT_TIMEZONE,
  from?: string,
  to?: string,
): { start: Date; end: Date } {
  const now = new Date()
  let start: Date
  let end: Date

  switch (period) {
    case 'today':
      start = getStartOfDayInTimezone(timezone)
      end = now
      break
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      end = now
      break
    case 'month':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      end = now
      break
    case 'year':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      end = now
      break
    case 'custom': {
      if (!from || !to) {
        start = getStartOfDayInTimezone(timezone)
        end = now
        break
      }
      const fromParts = from.split('-').map(Number)
      start = localMidnightToUTC(fromParts[0], fromParts[1] - 1, fromParts[2], timezone)
      const toParts = to.split('-').map(Number)
      const endDate = localMidnightToUTC(toParts[0], toParts[1] - 1, toParts[2], timezone)
      endDate.setUTCHours(23, 59, 59, 999)
      return { start, end: endDate }
    }
    default:
      start = getStartOfDayInTimezone(timezone)
      end = now
  }

  return { start, end }
}

export function getDateKeyToday(timezone: string = DEFAULT_TIMEZONE): string {
  const now = new Date()
  return getDateKeyInTimezone(now, timezone)
}

export function getTodayStartISO(timezone: string = DEFAULT_TIMEZONE): string {
  return getStartOfDayInTimezone(timezone).toISOString()
}

export function getMonthStartISO(timezone: string = DEFAULT_TIMEZONE): string {
  return getStartOfMonthInTimezone(timezone).toISOString()
}

export function getPreviousPeriodRange(start: Date, end: Date): { prevStart: Date; prevEnd: Date } {
  const duration = end.getTime() - start.getTime()
  return {
    prevStart: new Date(start.getTime() - duration),
    prevEnd: new Date(start.getTime()),
  }
}
