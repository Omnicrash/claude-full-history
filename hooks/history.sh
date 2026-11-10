#!/usr/bin/env bash
# history.sh <session id> <jq filter> [<compaction uuid>]
# Prints one JSON object: {anchor, boundary, items}. `boundary` is that
# compaction (the last one when none is given), `anchor` the first message a
# resume shows after it (one the compaction kept, else the first after it), and
# `items` every message the resume left out, oldest first, earlier compactions
# included. {} when the session was never compacted. Long sessions keep their
# newest 1500 items, each at most 20000 characters, which stays under what one
# process run hands back to the mod (4 MiB).
set -u
f=$(ls ~/.claude/projects/*/"$1".jsonl 2>/dev/null | head -1)
[ -n "$f" ] || { echo '{}'; exit 0; }
jq -c -f "$2" "$f" 2>/dev/null | jq -cs --arg cut "${3:-}" '
    reduce .[] as $x ({seen: {}, out: []};
        if .seen[$x.u] then . else .seen[$x.u] = true | .out += [$x] end) | .out
    | (if $cut != "" then (map(.u) | index($cut))
       else ([to_entries[] | select(.value.k == "b") | .key] | last) end) as $i
    | if $i == null then {} else
        (.[$i].p // []) as $keep
        | ([.[:$i][] | select(.k == "b" or (.u as $u | $keep | index($u) | not))]) as $hist
        | ([.[:$i][] | select(.k != "b" and (.u as $u | $keep | index($u)))]
           + [.[$i + 1:][] | select(.k != "b")] | first) as $a
        | {anchor: $a.u, boundary: .[$i].u,
           items: ($hist[-1500:] | map(if .t then .t |= .[:20000] else . end) | map(del(.p)))}
      end'
