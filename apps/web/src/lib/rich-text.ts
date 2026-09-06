export type PublicTextBlock =
  | {
      kind: 'heading'
      level: 2 | 3 | 4
      text: string
    }
  | {
      kind: 'paragraph'
      text: string
    }

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const childrenOf = (value: unknown): unknown[] => {
  const record = asRecord(value)
  return Array.isArray(record?.children) ? record.children : []
}

const collectText = (value: unknown): string => {
  const node = asRecord(value)
  if (!node) {
    return ''
  }

  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text
  }

  return childrenOf(node)
    .map(collectText)
    .join('')
}

const headingLevel = (tag: unknown): 2 | 3 | 4 => {
  if (tag === 'h3') return 3
  if (tag === 'h4') return 4
  return 2
}

/**
 * Projects Payload/Lexical JSON onto the small block set the generic AssoStack
 * website currently supports. Unknown nodes are ignored and no raw HTML is
 * ever trusted or emitted.
 */
export const toPublicTextBlocks = (richText: unknown): PublicTextBlock[] => {
  const document = asRecord(richText)
  const root = asRecord(document?.root)
  if (!root) {
    return []
  }

  const blocks: PublicTextBlock[] = []

  for (const child of childrenOf(root)) {
    const node = asRecord(child)
    if (!node) continue

    const text = collectText(node).trim()
    if (!text) continue

    if (node.type === 'heading') {
      blocks.push({
        kind: 'heading',
        level: headingLevel(node.tag),
        text,
      })
      continue
    }

    if (node.type === 'paragraph') {
      blocks.push({
        kind: 'paragraph',
        text,
      })
    }
  }

  return blocks
}
