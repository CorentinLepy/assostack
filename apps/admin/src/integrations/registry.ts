import { integrationProviders, type IntegrationAdapter, type IntegrationProvider } from './types'

export class IntegrationRegistry {
  private readonly adapters = new Map<IntegrationProvider, IntegrationAdapter>()

  register(adapter: IntegrationAdapter): void {
    if (this.adapters.has(adapter.provider)) {
      throw new Error(`An integration adapter is already registered for ${adapter.provider}.`)
    }

    this.adapters.set(adapter.provider, adapter)
  }

  get(provider: string): IntegrationAdapter | undefined {
    return this.adapters.get(provider as IntegrationProvider)
  }

  list(): IntegrationProvider[] {
    return [...this.adapters.keys()]
  }
}

const acceptsObjectConfig = (config: unknown): config is Record<string, unknown> =>
  Boolean(config && typeof config === 'object' && !Array.isArray(config))

const createPlaceholderAdapter = (provider: IntegrationProvider): IntegrationAdapter => ({
  provider,
  capabilities: ['execute'],
  validateConfig: acceptsObjectConfig,
  execute: async () => ({ status: 'not-implemented' }),
})

export const createDefaultIntegrationRegistry = (): IntegrationRegistry => {
  const registry = new IntegrationRegistry()
  for (const provider of integrationProviders) {
    registry.register(createPlaceholderAdapter(provider))
  }
  return registry
}