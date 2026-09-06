export type OperationalLogLevel = 'info' | 'warn' | 'error'

type OperationalLogContext = Record<string, boolean | number | string | null | undefined>

export const logOperationalEvent = (
  level: OperationalLogLevel,
  event: string,
  context: OperationalLogContext = {},
): void => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  }

  const line = JSON.stringify(entry)

  if (level === 'error') {
    console.error(line)
    return
  }

  if (level === 'warn') {
    console.warn(line)
    return
  }

  console.info(line)
}
