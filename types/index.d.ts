/** Where the earlier conversation goes: above the first row drawn after the last compaction. */
export type Anchor = {
  /** The transcript entry id of that row, which is the row's requestId. */
  row: string
  /** The compaction it follows; the history is everything before it. */
  boundary: string
}

declare module 'claude-code' {
  interface PluginState {
    'full-history': { anchor: Anchor | null; isChecked: boolean }
  }
}
