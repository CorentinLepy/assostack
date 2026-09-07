import { sanitizeProviderError } from './secrets'

export type IntegrationFailureState = {
  lastFailureAt: string
  lastError: string
}

export const createProviderFailureState = (
  error: unknown,
  now: () => Date = () => new Date(),
): IntegrationFailureState => ({
  lastFailureAt: now().toISOString(),
  lastError: sanitizeProviderError(error),
})