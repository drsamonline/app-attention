#!/usr/bin/env node
/* ui-tests — the Attention page in a real DOM (jsdom). SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin.   npm install --no-save jsdom && node tests/ui-tests.js */
"use strict";
var fs = require("fs"), path = require("path"), { JSDOM } = require("jsdom");
var ROOT = path.join(__dirname, ".."), PLAY = path.join(ROOT, "docs", "play");
var passed = 0, failed = [];
function ok(n, c, d) { if (c) { passed++; return; } failed.push(n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function build(seed) {
  var dom = new JSDOM(fs.readFileSync(path.join(PLAY, "index.html"), "utf8"), { url: "https://example.test/play/index.html", runScripts: "outside-only", pretendToBeVisual: true });
  var w = dom.window;
  if (seed) Object.keys(seed).forEach(function (k) { w.localStorage.setItem(k, seed[k]); });
  w.URL.createObjectURL = function () { return "blob:x"; }; w.URL.revokeObjectURL = function () {};
  w.HTMLAnchorElement.prototype.click = function () {};
  ["web-kit.js", "export-kit.js", "attention-core.js", "app.js"].forEach(function (f) { w.eval(fs.readFileSync(path.join(PLAY, f), "utf8")); });
  return dom;
}
var dom = build(null), w = dom.window, d = w.document, $ = function (id) { return d.getElementById(id); };

ok("the engine loaded", !!w.AttentionCore);
eq("no session card until started", $("runCard").hidden, true);

$("task").value = "";
$("startBtn").click();
ok("an untitled session is refused", /cannot show a pattern/.test($("status").textContent), $("status").textContent);

$("task").value = "Write the report";
$("mins").value = "25";
$("startBtn").click();
ok("the session starts", /Started: Write the report/.test($("status").textContent), $("status").textContent);
eq("the run card appears", $("runCard").hidden, false);
eq("six one-tap labels", d.querySelectorAll("#labels button").length, 6);
ok("the clock shows the plan", /of 25 minutes/.test($("ofPlanned").textContent), $("ofPlanned").textContent);

d.querySelectorAll("#labels button")[0].click();
ok("one tap logs it", /Logged/.test($("status").textContent), $("status").textContent);
eq("and the log shows one", d.querySelectorAll("#logList li").length, 1);

$("endBtn").click();
ok("ending reports the interruptions", /interruption\(s\)/.test($("status").textContent), $("status").textContent);
ok("the ledger was written", !!w.localStorage.getItem("attention:ledger"));
ok("the report shows the drift", /interruption\(s\) across 1 session/.test($("reportSays").textContent), $("reportSays").textContent);
eq("the hour table is visible", $("hourTable").hidden, false);
ok("and marks the worst hour", /worst/.test($("hourTable").textContent), $("hourTable").textContent);

$("exportBtn").click();
ok("the week exports", /Wrote attention-week-\d{4}-\d\d-\d\d\.json/.test($("ioNote").textContent), $("ioNote").textContent);

var saved = w.localStorage.getItem("attention:ledger");
var dom2 = build({ "attention:ledger": saved });
var d2 = dom2.window.document;
ok("the reload keeps the report", /1 session/.test(d2.getElementById("reportSays").textContent), d2.getElementById("reportSays").textContent);

var dom3 = build({ "attention:ledger": "{ broken ledger" });
var d3 = dom3.window.document;
ok("an unreadable ledger is reported", /cannot be read/.test(d3.getElementById("status").textContent));
ok("it was NOT replaced with an empty one", /NOT replaced with an empty one/.test(d3.getElementById("status").textContent));
ok("it offers an export", Array.prototype.some.call(d3.querySelectorAll("button"), function (b) { return /Export the unreadable ledger/.test(b.textContent); }));

var dom4 = build(null), w4 = dom4.window, d4 = dom4.window.document;
Object.defineProperty(w4, "localStorage", { configurable: true, get: function () {
  return { getItem: function () { return null; }, setItem: function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; }, removeItem: function () {}, clear: function () {} }; } });
d4.getElementById("task").value = "x";
d4.getElementById("startBtn").click();
d4.querySelectorAll("#labels button")[0].click();
d4.getElementById("endBtn").click();
ok("a failed save says NOT KEPT", /NOT KEPT:/.test(d4.getElementById("status").textContent), d4.getElementById("status").textContent);
ok("and says the pattern is never computed from an unkept session", /never computed from a session that was not kept/.test(d4.getElementById("status").textContent));

var total = passed + failed.length;
if (!total) { console.error("ui-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("ui-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("ui-tests: " + passed + "/" + total + " assertions passed");
