# One line per drawable message of a transcript, plus each compaction:
# {k: "u" | "a" | "b", u: uuid, ts: timestamp, t: text}. Tool calls, tool
# results, reminders and the compaction summaries are left out.
if .isSidechain == true then empty
elif .type == "system" and .subtype == "compact_boundary" then {k: "b", u: .uuid, ts: .timestamp, p: (.compactMetadata.preservedMessages.uuids // [])}
elif .type == "user" and (.isMeta | not) and (.isCompactSummary | not) and (.isVisibleInTranscriptOnly | not) then
  (.message.content | if type == "string" then . else ([.[]? | select(.type == "text") | .text] | join("\n")) end) as $t
  | select($t != "" and ($t | startswith("<") | not))
  | {k: "u", u: .uuid, ts: .timestamp, t: $t}
elif .type == "assistant" then
  ([.message.content[]? | select(.type == "text") | .text] | join("\n")) as $t
  | select($t != "")
  | {k: "a", u: .uuid, ts: .timestamp, t: $t}
else empty end
