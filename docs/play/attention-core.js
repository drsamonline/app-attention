/* attention-core — the engine behind Attention.
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * ONE JOB: run a focus session, log every interruption in ONE tap, and show where the drift actually
 * happens — by hour of the day, which is the thing you cannot see from inside one session.
 *
 * The clock never pauses. Logging a distraction must not cost you the session, so an interruption is
 * a timestamp and a label and nothing else.
 *
 * It does not block sites, police your time or score your day. It records and reports; the judging is
 * yours. There is no score field in this file, and no list of blocked sites.
 *
 * Pure functions: no DOM, no network, no storage.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.AttentionCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";
  var MINUTE = 60000;

  var LABELS = [
    { id: "phone", label: "phone" },
    { id: "person", label: "someone came" },
    { id: "thought", label: "a thought" },
    { id: "notification", label: "notification" },
    { id: "tired", label: "tired" },
    { id: "other", label: "other" }
  ];

  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hhmm(ms) { var d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function hourOf(ms) { return new Date(ms).getHours(); }
  function dayOf(ms) {
    var d = new Date(ms);
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
  }
  function stamp(when) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(when || ""));
    return m ? m[3] + "-" + m[2] + "-" + m[1] : "undated";
  }

  /* -------------------------------------------------------------- sessions */

  /* A session with no task named is refused: a ledger of untitled sessions cannot show a pattern. */
  function startSession(input, now) {
    var task = clean(input && input.task);
    if (!task) return { ok: false, field: "task", reason: "a session with no task named is refused: a ledger of untitled sessions cannot show a pattern" };
    var planned = Number(input && input.plannedMinutes);
    if (isNaN(planned) || planned <= 0) return { ok: false, field: "plannedMinutes", reason: "a session needs a length in minutes, more than zero" };
    var at = now || Date.now();
    return {
      ok: true,
      session: {
        id: "s" + at,
        task: task,
        plannedMinutes: planned,
        startedAt: at,
        startedClock: hhmm(at),
        day: dayOf(at),
        interruptions: [],
        endedAt: 0,
        ended: false
      },
      says: "Started: " + task + ", " + planned + " minutes. The clock does not pause for anything you log."
    };
  }

  /* One tap: a label and the elapsed minute. An interruption with no elapsed time is refused rather
   * than counted as zero. */
  function logInterruption(session, input, now) {
    if (!session) return { ok: false, reason: "there is no session running" };
    var at = now || Date.now();
    var elapsedMs = at - session.startedAt;
    if (!(elapsedMs > 0)) {
      return { ok: false, field: "at", reason: "an interruption with no elapsed time is refused rather than counted as zero" };
    }
    var label = clean(input && input.label);
    if (!label) return { ok: false, field: "label", reason: "an interruption needs a label: one tap is the point" };
    var s = cloneSession(session);
    var entry = {
      at: Math.round(elapsedMs / MINUTE),
      atMs: at,
      clock: hhmm(at),
      hour: hourOf(at),
      label: label
    };
    s.interruptions.push(entry);
    return {
      ok: true, session: s, interruption: entry,
      says: "Logged \u201c" + label + "\u201d at " + entry.clock + " (" + entry.at + " min in). The clock kept running."
    };
  }

  /* The session ends when the clock says it ends, not when the interruptions stop. */
  function endSession(session, now) {
    if (!session) return { ok: false, reason: "there is no session to end" };
    var at = now || Date.now();
    var s = cloneSession(session);
    s.ended = true;
    s.endedAt = at;
    s.endedClock = hhmm(at);
    var elapsed = Math.round((at - session.startedAt) / MINUTE);
    s.elapsedMinutes = elapsed;
    s.interruptions = s.interruptions.filter(function (i) { return i.atMs <= at; });
    return {
      ok: true, session: s,
      says: s.task + ": " + elapsed + " of " + session.plannedMinutes + " minute(s), " + s.interruptions.length + " interruption(s). The clock was never paused."
    };
  }

  /* ---------------------------------------------------------------- report */

  /* Drift per hour of the day. The worst hour is the one with the most interruptions; a tie goes to
   * the earlier hour, so the answer is the same every time it is computed. */
  function report(sessions) {
    var list = (sessions || []).filter(function (s) { return s && s.interruptions; });
    var byHour = {};
    var byLabel = {};
    var total = 0;
    list.forEach(function (s) {
      s.interruptions.forEach(function (i) {
        total++;
        byHour[i.hour] = (byHour[i.hour] || 0) + 1;
        byLabel[i.label] = (byLabel[i.label] || 0) + 1;
      });
    });
    var hours = Object.keys(byHour).map(function (h) {
      return { hour: Number(h), label: pad(Number(h)) + ":00", count: byHour[h] };
    }).sort(function (a, b) { return b.count - a.count || a.hour - b.hour; });
    var labels = Object.keys(byLabel).map(function (l) { return { label: l, count: byLabel[l] }; })
      .sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label); });
    return {
      sessions: list.length,
      interruptions: total,
      hours: hours,
      labels: labels,
      worstHour: hours.length ? hours[0] : null,
      verdict: null,
      says: total
        ? total + " interruption(s) across " + list.length + " session(s). Worst hour: " + hours[0].label +
          " with " + hours[0].count + ". This is where the drift was, not a score for the day."
        : "No interruptions logged yet, so there is no drift to show."
    };
  }

  /* ---------------------------------------------------------------- export */

  /* One row per session. Re-importing it reproduces the same worst hour, because the interruptions
   * (and their clocks) come back with the row. */
  function exportWeek(sessions, meta) {
    var list = (sessions || []).filter(Boolean);
    return JSON.stringify({
      version: VERSION,
      format: "attention-week-1",
      exportedOn: (meta && meta.when) || "",
      sessions: list.map(function (s) {
        return {
          id: s.id, task: s.task, day: s.day, startedClock: s.startedClock,
          plannedMinutes: s.plannedMinutes, elapsedMinutes: s.elapsedMinutes || 0,
          interruptions: (s.interruptions || []).map(function (i) {
            return { at: i.at, atMs: i.atMs, clock: i.clock, hour: i.hour, label: i.label };
          })
        };
      })
    }, null, 2);
  }

  function importWeek(text) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) return { ok: false, empty: true, reason: "there is no week to import" };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) {
      return { ok: false, unreadable: true, reason: "The file cannot be read. Nothing was imported over the ledger; export the current one to keep it.", raw: raw };
    }
    if (!data || !Array.isArray(data.sessions)) {
      return { ok: false, unreadable: true, reason: "The file holds no sessions. Nothing was imported over the ledger.", raw: raw };
    }
    var sessions = data.sessions.map(function (s) {
      return {
        id: String(s.id || ""), task: String(s.task || ""), day: String(s.day || ""), startedClock: String(s.startedClock || ""),
        plannedMinutes: Number(s.plannedMinutes) || 0, elapsedMinutes: Number(s.elapsedMinutes) || 0,
        ended: true, endedAt: 0,
        interruptions: (Array.isArray(s.interruptions) ? s.interruptions : []).map(function (i) {
          return { at: Number(i.at) || 0, atMs: Number(i.atMs) || 0, clock: String(i.clock || ""), hour: Number(i.hour) || 0, label: String(i.label || "") };
        })
      };
    });
    var r = report(sessions);
    return { ok: true, sessions: sessions, report: r, says: "Imported " + sessions.length + " session(s). Worst hour: " + (r.worstHour ? r.worstHour.label : "none") + "." };
  }

  /* --------------------------------------------------------------- storage */

  function cloneSession(s) {
    return {
      id: s.id, task: s.task, plannedMinutes: s.plannedMinutes,
      startedAt: s.startedAt, startedClock: s.startedClock, day: s.day,
      interruptions: (s.interruptions || []).map(function (i) { return { at: i.at, atMs: i.atMs, clock: i.clock, hour: i.hour, label: i.label }; }),
      ended: !!s.ended, endedAt: s.endedAt || 0, endedClock: s.endedClock || "", elapsedMinutes: s.elapsedMinutes || 0
    };
  }

  function serialize(state) {
    return JSON.stringify({ version: VERSION, savedOn: (state && state.savedOn) || 0, sessions: ((state && state.sessions) || []).map(cloneSession) }, null, 2);
  }

  /* An unreadable ledger is reported and offered for export. It is never replaced with an empty one:
   * an empty ledger reads as a day with no drift at all. */
  function parseState(text) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) return { ok: false, empty: true, reason: "no session has been kept on this device yet", raw: raw };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) {
      return { ok: false, unreadable: true, reason: "The saved ledger cannot be read. It was NOT replaced with an empty one: an empty ledger reads as a day with no drift at all. Export it to keep it.", raw: raw };
    }
    if (!data || !Array.isArray(data.sessions)) {
      return { ok: false, unreadable: true, reason: "The saved file holds no sessions. Nothing was started over it; export it to keep it.", raw: raw };
    }
    return {
      ok: true,
      state: { version: data.version || VERSION, savedOn: Number(data.savedOn) || 0, sessions: data.sessions.map(cloneSession) },
      raw: raw
    };
  }

  function exportFile(what, payload, meta, writer) {
    meta = meta || {};
    if (typeof writer !== "function") return { ok: false, reason: "the file was not written: no writer is available in this browser" };
    var name, body, mime = "application/json";
    if (what === "week") { name = "attention-week-" + stamp(meta.when) + ".json"; body = exportWeek(payload.sessions, meta); }
    else if (what === "raw") { name = "attention-unreadable-" + stamp(meta.when) + ".txt"; body = String(payload.raw || ""); mime = "text/plain;charset=utf-8"; }
    else return { ok: false, reason: "nothing was written: unknown export \u201c" + what + "\u201d" };
    try {
      var wrote = writer(name, body, mime);
      if (wrote === false) return { ok: false, filename: name, reason: "the file was not written: the browser refused the save" };
      return { ok: true, filename: name, bytes: body.length };
    } catch (e) {
      var why = e && e.name === "QuotaExceededError" ? "storage is full" : (e && e.message ? e.message : "storage is unavailable");
      return { ok: false, filename: name, reason: "the file was not written: " + why };
    }
  }

  return {
    version: VERSION,
    LABELS: LABELS,
    startSession: startSession,
    logInterruption: logInterruption,
    endSession: endSession,
    report: report,
    exportWeek: exportWeek,
    importWeek: importWeek,
    serialize: serialize,
    parseState: parseState,
    exportFile: exportFile
  };
});
