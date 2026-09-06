export const formatPublicDate = (
  value: string | null,
  locale: string,
  timezone: string,
): string | null => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
      timeZone: timezone,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(date)
  }
}
