# Attention

Run a focus session, log every interruption in **one tap**, and see where the drift actually happens —
by hour of the day, which is the thing you cannot see from inside a single session.

**It records and reports; the judging is yours.**

- **Demo:** https://drsamonline.github.io/app-attention/play/index.html
- **Landing page:** https://drsamonline.github.io/app-attention/
- **Release:** https://github.com/drsamonline/app-attention/releases/tag/app-latest
- **Plan row:** #19 of 37 in `drsamonline/forge` → `QUEUE/PLAN.json`
- **Specs absorbed:** `app-focus-ledger` (lead) + 3 absorbed specs
- **Licence:** PolyForm Noncommercial 1.0.0

## Status

| | |
|---|---|
| **Built** | Named sessions; six one-tap labels; every interruption with minute + clock; a clock that never pauses; drift by hour and by label with the worst hour marked; week export/import that reproduces the worst hour. |
| **Release** | Windows EXE, Android APK and Linux binary, built from this source by `app-builder` in CI. |
| **Not built** | Site or app blocking, notifications, any policing of time. There is no score, grade, rating or streak in the engine — asserted. |
| **Untested** | Whether knowing your worst hour changes anything. The arithmetic and the ranking are asserted; the behaviour change is not something a test can see. |

## The spec's "done means", counted

| The spec says | The test |
|---|---|
| a 25-minute session with three interruptions logs three, each with its minute and label | 3 logged: minute 3 (`phone`), minute 20 (`thought`), minute 21 (`someone came`) |
| the session still ends at 25 minutes — the clock does not pause | `elapsedMinutes === 25` after all three logs, and the app says the clock was never paused |
| one at minute 3 and two at minute 20 make 20:00 the worst hour | `worstHour = 20:00, count 2`, against 19:00 with 1 |
| a week exports one row per session and re-imports to the same worst hour | 2 sessions → 2 rows → import → same `worstHour.label` and count |

The fixture starts at **19:40**, so minute 3 is 19:43 and minute 20 is 20:00 — that is how the spec's
own example works, and it is worth writing down because it is not obvious.

## Why the clock never pauses

Logging a distraction must not cost you the session. An interruption is a timestamp and a label and
nothing else — no modal, no confirm, no pause. A timer that stops when you tap it is a timer that
punishes you for using it.

## What it will not do

- **Score your day.** No score, grade, rating or streak field exists.
- **Block anything.** No blocklist anywhere in the engine.
- **Run an untitled session.** A ledger of untitled sessions cannot show a pattern.
- **Count an interruption with no elapsed time** as zero.
- **Compute a pattern from a session it could not keep.**
- **Start an empty ledger over an unreadable one.**

## When things go wrong

| Case | Behaviour |
|---|---|
| **Bad input** | No task, no length, no label, no elapsed time — each refused with the field named. |
| **No network** | Nothing changes. |
| **Storage full or unavailable** | **NOT KEPT**; the session runs, the ledger will not have it, and the pattern is never computed from it. |
| **Corrupt saved state** | Reported, offered for export, never replaced with an empty ledger. |

## Tests

```bash
npm test                      # all three suites
node tests/self-tests.js      # engine — 60 assertions, including the done-means
node tests/ui-tests.js        # the page in jsdom — 21 assertions
node tests/page-smoke.js      # every local src/href resolves, nothing off-origin
```

Mutation-tested six ways on 26/11/2026. Five failed cleanly: a clock that pauses (2 failures), the worst
hour chosen as the latest instead of the most (3), an untitled session allowed (4), a zero-elapsed
interruption counted (3), an unreadable ledger starting empty (6). The sixth — an export that drops the
interruptions — **crashed the suite** rather than failing an assertion; recorded as such, because a
crash is red but tells you less than a named failure.

## Layout

```
docs/index.html            landing page
docs/play/index.html       the app — start, the clock, the labels, the report, export
docs/play/app.js           DOM wiring: the timer, one-tap logging, the report, export/import
docs/play/attention-core.js  the engine — sessions, interruptions, report, storage
docs/play/web-kit.js       vendored kit (unmodified)
docs/play/export-kit.js    vendored kit (unmodified)
tests/self-tests.js        engine suite (60)
tests/ui-tests.js          page suite (21, jsdom)
tests/page-smoke.js        shape on disk
PAGES.json                 landing = docs/index.html, app = docs/play/index.html
```

## Where the spec was silent, and what was chosen

- **The worst hour is the one with the most interruptions; a tie goes to the earlier hour**, so the report is deterministic rather than dependent on object key order.
- **Labels are a fixed set of six**, one tap each. A free-text field would be a second thing to do in the moment the app exists to protect.
- **The interruption keeps both the elapsed minute and the wall clock**, because the report needs the hour and the person needs the minute.
- **An unkept session is not in the ledger at all** — not kept-but-flagged. A pattern built from sessions that were not stored would be a pattern built on air.
- **The export is JSON with a `format` field**, so a future version can refuse a file it does not understand.

## What is not built, and why

**Blocking, policing and scoring.** All three are forbidden by the spec, and all three would turn a
record into a judge. The one thing this app is for is seeing the pattern you cannot see from inside a
session — and that only works if you are not being graded while you look.
