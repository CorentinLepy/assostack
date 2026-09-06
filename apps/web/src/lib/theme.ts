import type { PublicSiteTheme } from '../../../../packages/contracts/src/public-content'

const fontStacks: Record<PublicSiteTheme['fontFamily'], string> = {
  system: 'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  humanist: '"Trebuchet MS",Candara,Calibri,Segoe,ui-sans-serif,sans-serif',
  serif: 'Georgia,"Times New Roman",Times,serif',
  mono: '"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace',
}

const radii: Record<PublicSiteTheme['radius'], string> = {
  none: '0px',
  small: '0.35rem',
  medium: '0.75rem',
  large: '1.25rem',
}

const safeColor = (value: string, fallback: string): string =>
  /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback

export const themeStyle = (theme: PublicSiteTheme): string => {
  const colors = {
    accent: safeColor(theme.colors.accent, '#2563EB'),
    background: safeColor(theme.colors.background, '#FBFBF9'),
    muted: safeColor(theme.colors.muted, '#6B7280'),
    primary: safeColor(theme.colors.primary, '#161616'),
    surface: safeColor(theme.colors.surface, '#F7F7F5'),
    text: safeColor(theme.colors.text, '#161616'),
  }

  return [
    `--as-color-accent:${colors.accent}`,
    `--as-color-background:${colors.background}`,
    `--as-color-muted:${colors.muted}`,
    `--as-color-primary:${colors.primary}`,
    `--as-color-surface:${colors.surface}`,
    `--as-color-text:${colors.text}`,
    `--as-font-family:${fontStacks[theme.fontFamily] ?? fontStacks.system}`,
    `--as-radius:${radii[theme.radius] ?? radii.medium}`,
  ].join(';')
}
