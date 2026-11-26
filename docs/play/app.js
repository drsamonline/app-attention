/* app — the Attention page. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 * Wiring only: the clock, the log, the report and the storage live in attention-core.js.
 */
(function () {
  "use strict";

  var A = window.AttentionCore;
  var $ = function (id) { return document.getElementById(id); };

  var K = "attention:ledger";
  var state = { sessions: [], current: null, unreadable: null, timer: null };

  var els = {
    status: $("status"), task: $("task"), mins: $("mins"), startBtn: $("startBtn"), startCard: $("startCard"),
    runCard: $("runCard"), runTask: $("runTask"), clock: $("clock"), ofPlanned: $("ofPlanned"), clockNote: $("clockNote"),
    labels: $("labels"), endBtn: $("endBtn"), runNote: $("runNote"), logList: $("logList"),
    reportCard: $("reportCard"), reportSays: $("reportSays"), hourTable: $("hourTable"), labelTable: $("labelTable"),
    exportBtn: $("exportBtn"), importFile: $("importFile"), ioNote: $("ioNote")
  };

  function today() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
  }
  function setStatus(kind, msg) { els.status.className = "status show " + kind; els.status.textContent = msg; }
  function node(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function persist() {
    try { window.localStorage.setItem(K, A.serialize({ savedOn: Date.now(), sessions: state.sessions })); return true; }
    catch (e) {
      setStatus("bad", "NOT KEPT: " + (e && e.name === "QuotaExceededError" ? "storage is full" : "storage is unavailable") +
        ". The session runs, but the ledger will not have it \u2014 and the pattern is never computed from a session that was not kept.");
      return false;
    }
  }

  function tickClock() {
    if (!state.current) return;
    var elapsed = Math.max(0, Date.now() - state.current.startedAt);
    var mm = Math.floor(elapsed / 60000), ss = Math.floor((elapsed % 60000) / 1000);
    els.clock.firstChild.textContent = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss + " ";
  }

  function renderRun() {
    var s = state.current;
    els.runCard.hidden = !s;
    if (!s) return;
    els.runTask.textContent = s.task;
    els.ofPlanned.textContent = "of " + s.plannedMinutes + " minutes";
    els.logList.textContent = "";
    s.interruptions.forEach(function (i) {
      var li = node("li");
      li.appendChild(node("span", "when", i.clock + " \u00b7 " + i.at + " min in"));
      li.appendChild(document.createTextNode(" \u2014 " + i.label));
      els.logList.appendChild(li);
    });
    els.runNote.textContent = s.interruptions.length + " logged.";
  }

  function buildLabels() {
    els.labels.textContent = "";
    A.LABELS.forEach(function (l) {
      var b = node("button", null, l.label);
      b.addEventListener("click", function () {
        if (!state.current) { setStatus("bad", "There is no session running."); return; }
        var out = A.logInterruption(state.current, { label: l.label }, Date.now());
        if (!out.ok) { setStatus("bad", out.reason); return; }
        state.current = out.session;
        renderRun();
        setStatus("ok", out.says);
      });
      els.labels.appendChild(b);
    });
  }

  function renderReport() {
    var r = A.report(state.sessions);
    els.reportSays.textContent = r.says;
    els.hourTable.hidden = r.hours.length === 0;
    var hb = els.hourTable.querySelector("tbody");
    hb.textContent = "";
    r.hours.forEach(function (h) {
      var tr = node("tr", r.worstHour && h.hour === r.worstHour.hour ? "worst" : "");
      tr.appendChild(node("td", null, h.label + (r.worstHour && h.hour === r.worstHour.hour ? "  \u2014 worst" : "")));
      tr.appendChild(node("td", "num", String(h.count)));
      hb.appendChild(tr);
    });
    els.labelTable.hidden = r.labels.length === 0;
    var lb = els.labelTable.querySelector("tbody");
    lb.textContent = "";
    r.labels.forEach(function (l) {
      var tr = node("tr");
      tr.appendChild(node("td", null, l.label));
      tr.appendChild(node("td", "num", String(l.count)));
      lb.appendChild(tr);
    });
  }

  function start() {
    var out = A.startSession({ task: els.task.value, plannedMinutes: Number(els.mins.value) }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.current = out.session;
    els.startCard.hidden = true;
    renderRun();
    setStatus("ok", out.says);
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(tickClock, 1000);
    tickClock();
  }

  function end() {
    if (!state.current) return;
    var out = A.endSession(state.current, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.sessions.push(out.session);
    state.current = null;
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    els.startCard.hidden = false;
    renderRun();
    renderReport();
    var saved = persist();
    if (saved) setStatus("ok", out.says);
  }

  function doExport() {
    var out = A.exportFile("week", { sessions: state.sessions }, { when: today() }, function (name, text, mime) {
      if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
      window.Export.save(name, text, mime);
      return true;
    });
    if (out.ok) { els.ioNote.textContent = "Wrote " + out.filename + " \u2014 one row per session."; setStatus("ok", "Exported."); }
    else setStatus("bad", out.reason + ".");
  }

  function doImport(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = A.importWeek(String(reader.result || ""));
      if (!parsed.ok) { setStatus("bad", parsed.reason); return; }
      state.sessions = parsed.sessions;
      var saved = persist();
      renderReport();
      if (saved) setStatus("ok", parsed.says);
    };
    reader.onerror = function () { setStatus("bad", "The file could not be read."); };
    reader.readAsText(file);
  }

  els.startBtn.addEventListener("click", start);
  els.endBtn.addEventListener("click", end);
  els.exportBtn.addEventListener("click", doExport);
  els.importFile.addEventListener("change", function () { if (els.importFile.files[0]) doImport(els.importFile.files[0]); });

  buildLabels();

  var raw = null;
  try { raw = window.localStorage.getItem(K); } catch (e) { raw = null; }
  if (raw) {
    var parsed = A.parseState(raw);
    if (parsed.ok) state.sessions = parsed.state.sessions;
    else {
      state.unreadable = parsed;
      setStatus("bad", parsed.reason);
      var keep = node("button", "small", "Export the unreadable ledger");
      keep.addEventListener("click", function () {
        var out = A.exportFile("raw", parsed, { when: today() }, function (name, text, mime) {
          if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
          window.Export.save(name, text, mime);
          return true;
        });
        setStatus(out.ok ? "ok" : "bad", out.ok ? "Wrote " + out.filename + "." : out.reason);
      });
      els.ioNote.parentNode.insertBefore(keep, els.ioNote);
    }
  }

  renderReport();
  if (window.Loom && window.Loom.pwa) window.Loom.pwa.register("sw.js");
})();
