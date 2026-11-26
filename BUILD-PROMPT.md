BUILD PROMPT — Attention   (plan row #19 of 37)

## Inputs

```
APP:        Attention
SPEC:       QUEUE/app-focus-ledger.md
REPO:       https://github.com/drsamonline/app-attention   (empty)
            the plan also matches: attention, app-focus-ledger, focus-ledger
PLAN_ROW:   #19
MERGED:     friction, context-switch-guard, focus-ledger, inbox-coach
```

This build absorbs 4 specs into one app. Their must-nots still bind, and all of them are quoted below.

---

## What you are building

One app, from its spec, into that repo. Nothing else. Not a second app, not a kit unless the
spec needs one, not a refactor of a neighbour.

### The house rules (they are not preferences)

- **Offline-first, always.** No server, no account, no telemetry, no network call at runtime.
  If the app needs a model, it ships in the app or the app says what it cannot do.
- **Single-file where possible.** One `docs/play/index.html` with its kits beside it. The
  build kit (`app-builder`) turns that into a Windows EXE and an Android APK — so the same
  bytes must work as a file:// page, an installed PWA and an APK.
- **The spec's "what it must NOT do" are test assertions, not prose.** Each one becomes a
  named test that fails if the app ever does it.
- **The spec's "what it does when things go wrong" is four cases**, and all four ship:
  bad input, no network, storage full or unavailable, corrupt saved state. An app that
  silently treats "no data" as "no matches" is not done.
- **Nothing is fabricated.** No invented data, no placeholder screenshot presented as a live
  capture, no badge nobody measures, no sample corpus passed off as the real thing. If an
  asset must be supplied by the owner, say so and leave the slot visibly empty.
- **India is the default audience**: ₹, lakh/crore, metric, dd/mm/yyyy, IST, and the local
  examples before the international ones.
- **Licence:** PolyForm Noncommercial 1.0.0 unless the spec says otherwise; SPDX headers on
  every source file; `data/SOURCE.md` recording the source, the licence of the **data**, and
  the fetch date for anything not written by us.

### Step 0 — Preflight (before you claim anything is missing)

1. Read the spec. Read its master-list row. Read its `PLAN.json` row, including `members` —
   a merged build's other specs are in `QUEUE/archive/` and their must-nots still apply.
2. **Rule 0: check the estate first.** Search the org for an app that already does this job.
   If one does, stop and report the collision with the repo name. Building the second version
   of a shipped app is the most expensive mistake available here.
3. Ask which credential you are holding. A `gh` 404 is a wrong credential, never proof of
   absence. Any finding of "impossible" must name the credential it was attempted with.
4. **You cannot create repositories.** If the repo does not exist, that is the owner's step —
   say so and stop. An empty repo that exists is yours to fill.

### Step 1 — Scope it in writing, before code

Produce a short block and keep it for the final report:

- the job, in one sentence;
- the mechanic that makes it not-generic, in one sentence;
- every **must-not**, as a test name;
- the four failure cases, as behaviour;
- the kits it needs (from the spec) and whether each already exists;
- what the app will **not** do in v1, explicitly.

If the app needs a capability no kit has: create the kit first, with its own test, and say so.

### Step 2 — Scaffold, do not hand-roll

`python3 scripts/new-app.py <app-id>` writes the shape:

```
docs/index.html          landing page (what it is, honest status, how to run it)
docs/play/index.html     the app itself
docs/play/*.js           the kits it vendors, next to the page that loads them
tests/self-tests.js      assertions, no framework
PAGES.json               the page manifest
README.md                what it does, how to run, what is not built
```

**Then prove the shape before you fill it:** every `<script src>` in the page must resolve to
a file that exists beside it. A scaffold has shipped here before with the kits in the wrong
folder, and the page 404'd its own runtime while the build stayed green.

If the repo is empty and `scripts/` is not available to you, build the same shape by hand —
the file list above is the contract, not the script.

### Step 3 — Build to the spec

Work the spec top to bottom. Where the spec is silent, choose the smaller behaviour and say
so in the report. Where the spec and the master-list one-liner disagree, **the spec body
wins** and the disagreement goes in the report (five such contradictions are already known).

### Step 4 — Tests that could fail

- `node tests/self-tests.js` — every must-not is an assertion; every failure case is a case.
- Print the count. A suite of 0 assertions is a failure, not a pass.
- **Mutation-test it**: break three things on purpose (remove a guard, make a refused input
  succeed, report a failed save as saved) and confirm the suite goes red each time. Restore.
- If the suite cannot go red, it is documentation, not a test.

### Step 5 — Deliver

- Pages on, demo live at `https://drsamonline.github.io/<repo>/`, and the demo **is** the app
  (no separate build of the page).
- A release with the EXE and APK from `app-builder`, built from the same source.
- Topics set (they are the discovery surface), licence headers, `CHANGELOG.md`, `NOTICE`.
- README states the real status: what works, what does not, what is untested.

### Step 6 — Record it

- Append one line to `PROGRESS.log`: what was built, the test counts, the demo URL, what was
  **not** built and why.
- **Do not edit `QUEUE/PLAN.json`.** `tools/queue-sync.py` flips the row to `built` when the
  repo and its Pages answer. Writing `built` by hand is how a plan starts lying.
- Do not edit `ACTIONS.md` — its build order is generated.

### Step 7 — Report in this shape

```
APP      <name>  (plan row #<order>, <n> specs merged)
REPO     <url>   commit <sha>
DEMO     <url>
TESTS    <n>/<n> assertions, mutation-tested <n> ways
BUILT    <the features that exist>
NOT BUILT <the features the spec asks for that do not, and why>
MUST-NOT <each one, and the test that holds it>
NEEDS    <what only the owner can supply: assets, keys, data, a decision>
NEXT     <the smallest honest next step for this app, or "done">
```

Never write "done" for a feature you did not prove. `unverified` with the reason is a better
line than a green claim.

---

## Definition of done (the owner's, not yours)

> A working app, with a working release, a landing page, and a live demo where the app is a
> web app — and the tests that prove the must-nots, run in CI.

Anything less is `partial`, and the report says which of the three is missing.

---

## When you are blocked

Say which of these it is, in one line, and stop:

- **no spec** → the spec is the next step, not the code;
- **the app already exists** → name the repo and the overlapping features;
- **the repo does not exist** → the owner creates it; you cannot;
- **a capability no kit has** → the kit is the next step;
- **an asset only the owner has** (a photo, a UPI ID, a licensed corpus, a key) → build the
  slot, leave it visibly empty, name what is needed;
- **a credential that cannot see the thing** → name the credential, not a verdict.

---

## The five ways this has gone wrong before

1. **Built the second version of a shipped app** — Rule 0 exists because of it.
2. **Shipped a scaffold whose page could not load its own kits** — prove every `src` resolves.
3. **Claimed a badge or a status nobody measures** — a green shield that lies is worse than none.
4. **Logged "done" from an exit code** — the verdict is the artifact on the branch, not git's
   exit status.
5. **Reported the system blocked on the strength of the wrong credential** — a 404 is a
   credential, not a fact.

---

# THE SPEC — Attention (`app-focus-ledger`)

# Focus Ledger

- **id:** app-focus-ledger
- **category:** Productivity apps
- **tier:** Rare
- **source:** the app master list, #114
- **status:** READY - spec written. Body rewritten 2026-10-26: it previously described a different app — see `registry/spec-mismatch.json`.

## Pitch

A timer that also logs every distraction, then shows your real pattern of drift.

## The job

- Run a focus session and log every interruption as it happens, so the pattern is recorded rather than remembered.

## The mechanic

- An interruption is logged in ONE tap and the clock keeps running — because stopping to write down what distracted you is itself the distraction. It then reports drift per hour of the day, which is the thing you cannot see from inside a single session.

## What it must NOT do

- block sites, police your time or score your day. It records and reports; the judging is yours.

## What it does when things go wrong

- **Bad input** — a session started with no task named is refused, because a ledger of untitled sessions
  cannot show a pattern. A distraction logged with no elapsed time is refused rather than counted as zero.
- **No network** — nothing changes. The timer and the log are on the device.
- **Storage full or unavailable** — the session runs but is not written, and the app says the ledger will
  not have this one; the pattern is never computed from a session that was not kept.
- **Corrupt saved state** — an unreadable ledger is reported and offered for export. The app does not
  start an empty ledger over it, which would read as a day with no drift at all.

## Kits it will need

- `web-kit` for the shell, storage and the PWA
- `export-kit` for the weekly export

## The data

- the sessions and their logged interruptions, on the device.

## Done means

- A **25-minute** session with three interruptions logs **three**, each with the minute it happened and its one-tap label, and the session still ends at 25 minutes — the clock does not pause. One interruption at minute 3 and two at minute 20 make the 20:00 hour the worst hour in the report. Exporting a week gives one row per session, and re-importing it reproduces the same worst hour.

---

# SPECS THIS BUILD ABSORBS (3)

## `app-friction` — Friction

**Pitch**

Deliberately adds friction before your worst habits, so you do them less.

**The job**

- See where your time actually leaks, without tracking every minute.

**The mechanic**

- It measures FRICTION, not hours: the number of times you were interrupted and had to restart.

**What it must NOT do**

- monitor your screen. It counts the interruptions you log.

**What it does when things go wrong**

- **Bad input** — a habit with no stated cost is refused, because friction with no reason attached is
  just an obstacle. A delay of zero is refused as not friction.
- **No network** — nothing changes. The gate is on the device.
- **Storage full or unavailable** — the interruption still happens; the log entry is not written and the
  app says the pattern will be incomplete, rather than reporting a clean day.
- **Corrupt saved state** — an unreadable log is reported and offered for export, and the gates stay
  active from the defaults until the user restores it — failing towards friction, not towards ease.

**Kits it will need**

- `web-kit` for the shell, storage and the PWA
- web-kit, export-kit

## `app-context-switch-guard` — Context Switch Guard

**Pitch**

Notices when you're thrashing between tasks and forces a single-thread block.

**The job**

- Notice when you are switching tasks too often, and show it.

**The mechanic**

- It measures SWITCHING, not time: the number of context changes per hour, which is the thing that actually costs you.

**What it must NOT do**

- block anything or take over your screen. It shows the number.

**What it does when things go wrong**

- **Bad input** — a switch with no destination task is refused, because a switch to nowhere is exactly
  the thrashing the app exists to catch. A block shorter than the minimum is refused with the minimum.
- **No network** — nothing changes. The log is on the device.
- **Storage full or unavailable** — the block still runs; the log is not written and the app says the
  session will not be counted, rather than reporting a guard that did not happen.
- **Corrupt saved state** — an unreadable log is reported and offered for export; the app starts a new
  log only with agreement, so a broken file cannot look like a clean day.

**Kits it will need**

- `web-kit` for the shell, storage and the PWA
- web-kit, export-kit

## `app-inbox-coach` — Inbox Coach

**Pitch**

Sorts and triages a messy inbox into act / read / archive, and teaches the triage.

**The job**

- See why your inbox is out of control, and what to do about it.

**The mechanic**

- It measures the PATTERN: who sends the most, what you never open, and what you answer instantly - the causes, not the count.

**What it must NOT do**

- read your mail or send anything. It analyses what you export.

**What it does when things go wrong**

- **Bad input** — a mailbox export that does not parse is refused with the format it expected, and no
  triage is offered from a partial read. A message with no sender is grouped as unknown rather than
  guessed into a folder.
- **No network** — nothing changes, and nothing is uploaded: the export is read on the device. The app
  says the export must be produced elsewhere, since it does not connect to a mailbox.
- **Storage full or unavailable** — the analysis runs in memory; the triage result is not saved and the
  app says so before the user acts on it.
- **Corrupt saved state** — an unreadable previous analysis is reported and offered for export; it is
  never used to fill gaps in a new one.

**Kits it will need**

- `web-kit` for the shell, storage and the PWA
- web-kit, export-kit

---

## After the build

- Append one line to `PROGRESS.log`. Do **not** edit `QUEUE/PLAN.json` — `tools/queue-sync.py` moves row #19 to `built` when the repo and its Pages answer.
- Report in the shape the brief asks for. Anything you did not prove is `unverified`, not done.
