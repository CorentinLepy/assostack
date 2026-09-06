export const builtInPublicRouteOptions = [
  {
    label: 'News',
    value: 'news',
  },
] as const

export type BuiltInPublicRoute = (typeof builtInPublicRouteOptions)[number]['value']

const builtInPublicRouteHrefs: Record<BuiltInPublicRoute, string> = {
  news: '/news',
}

export const isBuiltInPublicRoute = (value: unknown): value is BuiltInPublicRoute =>
  typeof value === 'string' && value in builtInPublicRouteHrefs

export const resolveBuiltInPublicRoute = (value: unknown): string | null =>
  isBuiltInPublicRoute(value) ? builtInPublicRouteHrefs[value] : null
