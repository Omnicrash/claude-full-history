# full-history

A Claude Code mod that shows a resumed session's whole conversation again.

When a long session gets compacted and you later resume it, Claude Code opens at the
compaction: everything before it is summarized for the model and left out of the view. The
messages are still in the session's transcript file, but you can't scroll up to them. This mod
draws them back in place, above the first message the resume shows, so scrolling up simply
continues into the earlier conversation.

- Your messages and Claude's replies, oldest first, with a dim line where each earlier
  compaction happened.
- Tool calls and their results are left out; bold and inline-code marks are dropped, since these
  rows are plain text.
- Only sessions that were compacted before you resumed them change. A compaction later in the
  same session leaves its rows on screen anyway, so nothing is drawn twice.
- It reads, never writes: the transcript and the conversation the model sees stay as they are.

## Install

At the prompt of a terminal session:

```
/plugin install full-history --marketplace Omnicrash/claude-full-history
```

From a shell:

```
claude plugin install full-history --marketplace Omnicrash/claude-full-history
```

Answer `y` to add the marketplace and pick a scope. In the desktop app, where `/plugin` does not
run: click + next to the prompt box, then Plugins, Add marketplace with
`Omnicrash/claude-full-history`, then Add plugin.

## Requirements

`bash` and [`jq`](https://jqlang.org/) on the PATH: the mod reads the transcript with a small
script, since transcripts often outgrow what a mod may read directly (4 MiB). That means Linux,
macOS or WSL; Claude Code running natively on Windows has no `bash` to run it with.

Very long histories keep their newest 1500 earlier messages, each cut at 20000 characters.

## How it works

At session start the mod looks up the session's transcript under `~/.claude/projects/` and finds
the last compaction that was already there. A compaction may keep its most recent messages
unsummarized; the first of those (or else the first message after the compaction) is where the
resumed view begins. That message's row is drawn with the earlier conversation above it.

## License

MIT
