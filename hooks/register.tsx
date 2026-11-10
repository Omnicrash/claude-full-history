import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Anchor } from '../types'

// A resumed session opens at the last compaction and leaves everything before
// it out of the view. This draws those earlier messages back, above the first
// row the resume shows, so scrolling up reads the whole conversation again.
// Tool calls are left out; the messages come from the session's own transcript.

type Item = { k: 'u' | 'a' | 'b'; u: string; ts: string; t?: string }
type History = { anchor?: string | null; boundary?: string; items?: Item[] }

const anchorAtom = atom({ plugin: 'full-history', key: 'anchor' } as const, null)
const isCheckedAtom = atom({ plugin: 'full-history', key: 'isChecked' } as const, false)

// The earlier messages, read once per load of the module
let items: Item[] | null = null

// The live rows render markdown and these are plain text, so drop the marks
// that would otherwise show as-is: bold and inline code
function plain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`\n]+)`/g, '$1')
}

async function load($: EngineInterface, boundary?: string): Promise<History> {
  const id = await $.session.id()
  const root = $.plugin.root
  const argv = ['bash', `${root}/hooks/history.sh`, id, `${root}/hooks/history.jq`]
  if (boundary) {
    argv.push(boundary)
  }
  const { exitCode, stdout } = await $.process.run(argv, { timeoutMs: 60000 })
  if (exitCode !== 0 || !stdout.trim()) {
    return {}
  }
  try {
    return JSON.parse(stdout) as History
  } catch {
    return {}
  }
}

async function draw($: EngineInterface, e: any, next: (e: any) => Promise<any>) {
  const anchor = await read($, anchorAtom)
  if (!anchor || e.requestId !== anchor.row) {
    return next(e)
  }
  if (items === null) {
    // after a reload: the same cut, read again
    items = (await load($, anchor.boundary)).items ?? []
  }
  if (items.length === 0) {
    return next(e)
  }

  const { Box, Text } = $.ui.resolve(e)
  const rows = items.map((item, i) => {
    if (item.k === 'b') {
      return (
        <Box key={`b${i}`} marginTop={1}>
          <Text dimColor>✻ Conversation compacted here</Text>
        </Box>
      )
    }
    if (item.k === 'u') {
      return (
        <Box key={item.u} marginTop={1} flexDirection="row">
          <Text bold>{'❯ '}</Text>
          <Box flexShrink={1}>
            <Text>{plain(item.t ?? '')}</Text>
          </Box>
        </Box>
      )
    }

    return (
      <Box key={item.u} marginTop={1} flexDirection="row">
        <Text>{'● '}</Text>
        <Box flexShrink={1}>
          <Text>{plain(item.t ?? '')}</Text>
        </Box>
      </Box>
    )
  })

  return (
    <Box flexDirection="column">
      <Text dimColor>── Earlier in this conversation, from its transcript (tool calls left out) ──</Text>
      {rows}
      <Box marginTop={1} marginBottom={1}>
        <Text dimColor>── Conversation compacted · what follows is what the resume loaded ──</Text>
      </Box>
      {await next(e)}
    </Box>
  )
}

export const register: Register = on => {
  // Fixed once per session, from the compactions that were already there when
  // it started: a compaction later in the session keeps its rows on screen, and
  // a reload must not move the history under them.
  on('session.start', async ($, e, next) => {
    if (e.isInteractive && !(await read($, isCheckedAtom))) {
      await update($, isCheckedAtom, () => true)
      const found = await load($)
      if (found.anchor && found.boundary) {
        const anchor: Anchor = { row: found.anchor, boundary: found.boundary }
        await update($, anchorAtom, () => anchor)
        items = found.items ?? []
      }
    }

    return next(e)
  })

  on('ui.render', { component: 'UserMessage' }, ($, e, next) => draw($, e, next))
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => draw($, e, next))
}
