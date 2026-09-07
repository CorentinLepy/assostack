export type SecretReference = {
  key: string
  provider?: string
}

export type SecretStore = {
  resolve: (reference: SecretReference) => Promise<unknown>
}

export const createEnvironmentSecretStore = (environment: NodeJS.ProcessEnv = process.env): SecretStore => ({
  resolve: async ({ key }) => environment[key],
})

export const isSecretReference = (value: unknown): value is SecretReference =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as SecretReference).key === 'string' &&
      (value as SecretReference).key.trim().length > 0,
  )

export const sanitizeProviderError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Provider execution failed.'
  }

  return error.message
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/(token|secret|password|api[-_]?key)=([^\s&]+)/gi, '$1=[redacted]')
    .slice(0, 500)
}