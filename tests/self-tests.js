#!/usr/bin/env node
/* self-tests — Attention. No framework, no dependencies.
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * The spec's "done means" is countable, so it is counted:
 *
 *   "A 25-minute session with three interruptions logs three, each with the minute it happened and its
 *    one-tap label, and the session still ends at 25 minutes — the clock does not pause. One
 *    interruption at minute 3 and two at minute 20 make the 20:00 hour the worst hour in the report.
 *    Exporting a week gives one row per session, and re-importing it reproduces the same worst hour."
 *
 *   node tests/self-tests.js
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var A = require(path.join(ROOT, "docs", "play", "attention-core.js"));

var passed = 0, failed = [], group = "";
function section(n) { group = n; }
function ok(name, cond, detail) { if (cond) { passed++; return; } failed.push(group + " :: " + name + (detail ? " — " + detail : "")); }
function eq(name, a, b) { ok(name, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }

/* 19:40 start, so minute 3 is 19:43 and minute 20 is 20:00 */
var T0 = new Date(2026, 10, 26, 19, 40, 0).getTime();
var MIN = 60000;

function session25() {
  var s = A.startSession({ task: "Write the report", plannedMinutes: 25 }, T0).session;
  s = A.logInterruption(s, { label: "phone" }, T0 + 3 * MIN).session;
  s = A.logInterruption(s, { label: "thought" }, T0 + 20 * MIN).session;
  s = A.logInterruption(s, { label: "someone came" }, T0 + 20 * MIN + 30000).session;
  return s;
}

/* ================================================ the spec's own "done means" */

section("done means — three interruptions, each with its minute and its label");
var s = session25();
eq("three are logged", s.interruptions.length, 3);
eq("the first is at minute 3", s.interruptions[0].at, 3);
eq("the second is at minute 20", s.interruptions[1].at, 20);
eq("each carries its clock", s.interruptions.map(function (i) { return i.clock; }).join(","), "19:43,20:00,20:00");
eq("each carries a one-tap label", s.interruptions.map(function (i) { return i.label; }).join(","), "phone,thought,someone came");

section("done means — the session still ends at 25 minutes: the clock does not pause");
var ended = A.endSession(s, T0 + 25 * MIN);
eq("it ends", ended.ok, true);
eq("at 25 minutes", ended.session.elapsedMinutes, 25);
eq("against a plan of 25", ended.session.plannedMinutes, 25);
ok("the app says the clock was never paused", /never paused/.test(ended.says), ended.says);
eq("and the interruptions are all still there", ended.session.interruptions.length, 3);

section("done means — minute 3 and two at minute 20 make 20:00 the worst hour");
var r = A.report([ended.session]);
eq("the worst hour is 20:00", r.worstHour.label, "20:00");
eq("with two interruptions", r.worstHour.count, 2);
eq("and 19:00 has one", r.hours.filter(function (h) { return h.hour === 19; })[0].count, 1);
eq("three interruptions in total", r.interruptions, 3);
ok("the report says where the drift was", /Worst hour: 20:00/.test(r.says), r.says);
ok("and calls itself not a score", /not a score for the day/.test(r.says), r.says);

section("done means — a week exports one row per session and re-imports to the same worst hour");
var second = A.startSession({ task: "Read the paper", plannedMinutes: 25 }, T0 + 3 * 60 * MIN).session;
second = A.logInterruption(second, { label: "notification" }, T0 + 3 * 60 * MIN + 5 * MIN).session;
second = A.endSession(second, T0 + 3 * 60 * MIN + 25 * MIN).session;
var week = A.exportWeek([ended.session, second], { when: "26/11/2026" });
eq("one row per session", JSON.parse(week).sessions.length, 2);
var back = A.importWeek(week);
eq("it imports", back.ok, true);
eq("two sessions come back", back.sessions.length, 2);
eq("the worst hour is the same", back.report.worstHour.label, r.worstHour.label);
eq("with the same count", back.report.worstHour.count, r.worstHour.count);
eq("and the same total", back.report.interruptions, r.interruptions + 1);
ok("the file says what it is", JSON.parse(week).format, "attention-week-1");

/* ============================================================ must-nots */

section("must-not — a session with no task named is refused");
var noTask = A.startSession({ plannedMinutes: 25 }, T0);
eq("it is refused", noTask.ok, false);
eq("the field is named", noTask.field, "task");
ok("and says why", /cannot show a pattern/.test(noTask.reason), noTask.reason);
eq("no length is refused too", A.startSession({ task: "x", plannedMinutes: 0 }, T0).field, "plannedMinutes");
eq("no session is returned to run", noTask.session, undefined);

section("must-not — an interruption with no elapsed time is refused, not counted as zero");
var fresh = A.startSession({ task: "x", plannedMinutes: 25 }, T0).session;
var zero = A.logInterruption(fresh, { label: "phone" }, T0);
eq("it is refused", zero.ok, false);
eq("the field is the elapsed time", zero.field, "at");
ok("and says it is not counted as zero", /counted as zero/.test(zero.reason), zero.reason);
eq("a label is required", A.logInterruption(fresh, {}, T0 + MIN).field, "label");
eq("a refused log does not touch the session", fresh.interruptions.length, 0);

section("must-not — it must not block sites, police time or score the day");
var core = read("docs/play/attention-core.js");
ok("no score, grade or rating field", !/\b(score|grade|rating|streak|points)\s*[:=]/i.test(core));
ok("no blocklist anywhere", !/blocklist|blockedSites|denylist|allowlist/i.test(core));
eq("the report carries no verdict", r.verdict, null);
ok("the page says the judging is yours", /the judging is yours/.test(read("docs/play/index.html")));
ok("no network call", !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(core + read("docs/play/app.js")));
ok("the page forbids connections", /connect-src 'none'/.test(read("docs/play/index.html")));

section("must-not — an unreadable ledger is never replaced with an empty one");
var bad = A.parseState("{ broken ledger");
eq("it is reported", bad.ok, false);
eq("it is marked unreadable", bad.unreadable, true);
ok("it says it was NOT replaced", /NOT replaced with an empty one/.test(bad.reason), bad.reason);
ok("and why an empty ledger is worse", /a day with no drift at all/.test(bad.reason), bad.reason);
eq("the raw text is kept for export", bad.raw, "{ broken ledger");
eq("nothing saved yet is distinguished from a broken one", A.parseState("").empty, true);

section("the pattern is only ever computed from sessions that were kept");
ok("the page says the pattern is never computed from an unkept session", /never computed from a session that was not kept/.test(read("docs/play/app.js")));
eq("a session that was not pushed to the ledger is not in the report", A.report([]).interruptions, 0);
eq("and the report says there is no drift to show", A.report([]).worstHour, null);

section("failure case — storage full or unavailable");
var thrown = A.exportFile("week", { sessions: [ended.session] }, { when: "26/11/2026" }, function () {
  var e = new Error("quota"); e.name = "QuotaExceededError"; throw e;
});
eq("a failed write is reported as failed", thrown.ok, false);
ok("it says the file was not written", /not written/.test(thrown.reason), thrown.reason);
ok("it names the cause", /storage is full/.test(thrown.reason));
eq("no writer means no file", A.exportFile("week", { sessions: [] }, {}, null).ok, false);
eq("a broken import is refused", A.importWeek("{ broken").ok, false);
ok("and says nothing was imported over the ledger", /Nothing was imported over the ledger/.test(A.importWeek("{ broken").reason));

section("shape — every script the page loads exists beside it");
var page = read("docs/play/index.html");
var srcs = (page.match(/<script[^>]+src="([^"]+)"/g) || []).map(function (t) { return t.replace(/.*src="([^"]+)"/, "$1"); });
srcs.forEach(function (sc) { ok("script src resolves: " + sc, fs.existsSync(path.join(ROOT, "docs", "play", sc.replace(/^\.\//, "")))); });
ok("the landing page exists", fs.existsSync(path.join(ROOT, "docs", "index.html")));
ok("the page manifest exists", fs.existsSync(path.join(ROOT, "PAGES.json")));

var total = passed + failed.length;
if (!total) { console.error("self-tests: 0 assertions ran. That is a failure, not a pass."); process.exit(1); }
if (failed.length) {
  console.error("self-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED");
  failed.slice(0, 12).forEach(function (f) { console.error("  FAIL " + f); });
  process.exit(1);
}
console.log("self-tests: " + passed + "/" + total + " assertions passed");
