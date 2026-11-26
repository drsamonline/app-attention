# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates: dd/mm/yyyy.

## [Unreleased]

## [1.0.0] — 26/11/2026

### Added
- Focus sessions with a **named task** and a length. An untitled session is refused, because a ledger of
  untitled sessions cannot show a pattern.
- **One-tap interruptions**: six labels, each stored with the elapsed minute and the clock time. An
  interruption with no elapsed time is refused rather than counted as zero.
- The clock **never pauses**: a 25-minute session with three interruptions still ends at 25 minutes.
- A drift report by **hour of the day** and by **label**, with the worst hour marked. Ties go to the
  earlier hour so the answer is the same every time.
- A **week export** with one row per session, and an import that reproduces the same worst hour.
- No score, no grade, no rating, no streak, no blocklist — asserted, not just promised.
- An unreadable ledger is reported and offered for export, and **never replaced with an empty one** — an
  empty ledger reads as a day with no drift at all.
- A failed save says **NOT KEPT**, the session still runs, and the pattern is never computed from a
  session that was not kept.
- PWA shell, CI (60 engine assertions + 21 in jsdom + page smoke), and the app-builder pipeline pinned
  to the canonical SHA for the EXE/APK/Linux release.
