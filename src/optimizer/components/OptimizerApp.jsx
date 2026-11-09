import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseJson, unwrapInput, RULE_TYPES, WALK_RULE_TYPES } from "../generatedLab/input.js";
import { makeDemoRequest } from "../generatedLab/demo.js";
import { equipmentIdsOf, protocolRefs, scenarioFromDatabase } from "../generatedLab/database.js";
import { damplabRules } from "../generatedLab/equipmentRules.js";
import { dbHealth, dbLayout, dbLayouts, dbProtocolData, dbValidatedProtocols, optimizeOnServer } from "../generatedLab/dbClient.js";
import FloorPlan from "./FloorPlan.jsx";
import { CompareLegend, ProgressChart, StepChart, TotalBars, fmt } from "./Charts.jsx";
import { runColors, zoneColor } from "./planDraw.js";

// ---- Small helpers -----------------------------------------------------------
// Per-tab session memory for inputs (never results that could go stale
// silently). Storage can be unavailable or full; the app works without it.
function usePersisted(key, initial) {
  const [value, setValue] = useState(() => {
    try { const raw = sessionStorage.getItem(key); return raw === null ? initial : JSON.parse(raw); } catch { return initial; }
  });
  useEffect(() => { try { const s = JSON.stringify(value); if (s.length < 4_500_000) sessionStorage.setItem(key, s); } catch { /* storage full or blocked */ } }, [key, value]);
  return [value, setValue];
}
function download(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function hashText(text) { let h = 0; for (let i = 0; i < text.length; i += Math.max(1, text.length >> 12)) h = (h * 31 + text.charCodeAt(i)) | 0; return `${text.length}:${h}`; }
const RULE_LABEL = { notSameBench: "Never on the same bench", sameBench: "On the same bench", maxWalkFt: "Within walking distance", minWalkFt: "At least a walking distance apart" };
const SOLVING_KEY = "co.solving";
function markSolving(on) {
  try { if (on) sessionStorage.setItem(SOLVING_KEY, String(Date.now())); else sessionStorage.removeItem(SOLVING_KEY); } catch { /* storage blocked */ }
}
const ZONE_SOURCE = { chosen: "chosen", cellType: "cell type", "auto-coverage": "auto" };
// Temporarily optimize walking distance only: soft rules (DAMPLab's or your
// own) are not sent to MiniZinc and the focus is pinned to walking. Hard
// rules still apply. Set to false to bring back soft rules and the slider.
const WALKING_ONLY = true;
const hardOnly = rs => (WALKING_ONLY ? rs.filter(r => r.severity !== "soft") : rs);

export default function OptimizerApp() {
  // Inputs
  const [layoutText, setLayoutText] = usePersisted("co.layout", "");
  const [layoutLabel, setLayoutLabel] = usePersisted("co.layoutLabel", "");
  const [overrides, setOverrides] = usePersisted("co.overrides", {});
  const [extra, setExtra] = usePersisted("co.extraProtocols", []);
  const [rules, setRules] = usePersisted("co.rules", []);
  const [settings, setSettings] = usePersisted("co.settings", { balance: null, timeLimitMs: 30000, exploratory: false, skipUnresolved: false });
  // Database
  const [db, setDb] = useState({ state: "checking", message: "" });
  const [validated, setValidated] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [protocolData, setProtocolData] = useState(null);
  const [dbBusy, setDbBusy] = useState(false);
  const [dbError, setDbError] = useState("");
  // Runs
  const [geometry, setGeometry] = useState(null);
  const [result, setResult] = useState(null);
  const [resultKey, setResultKey] = useState(null);
  const [busy, setBusy] = useState(null);
  const [progress, setProgress] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [interrupted, setInterrupted] = useState(null);
  // View
  const [tab, setTab] = useState("layout");
  const [mapView, setMapView] = useState("both");
  // Which protocols the map and the charts show: a zone ("all" or a zone id)
  // and the protocols unticked within it. Kept separately for each view.
  const [mapFilter, setMapFilter] = useState({ zone: null, hidden: [] });
  const [chartFilter, setChartFilter] = useState({ zone: "all", hidden: [] });
  const [legMode, setLegMode] = useState(false);
  const worker = useRef(null);
  const solveController = useRef(null);

  const parsed = useMemo(() => {
    if (!layoutText.trim()) return null;
    try {
      const input = parseJson(layoutText, "Lab JSON"), unwrapped = unwrapInput(input);
      if (!unwrapped.layout?.plan) return { error: "This JSON has no plan. Use Cirrus's Download plan JSON." };
      return { input, envelope: input.optimizerSchemaVersion !== undefined ? input : null, layout: unwrapped.layout, plan: unwrapped.layout.plan };
    } catch (e) { return { error: e.message }; }
  }, [layoutText]);
  const plan = parsed?.plan ?? null;
  const refs = useMemo(() => (plan ? protocolRefs(plan, extra) : []), [plan, extra]);
  const balance = WALKING_ONLY ? 1 : settings.balance ?? plan?.options?.optimizerBalance ?? 0.5;
  // DAMPLab's equipment placement rules, as Cirrus sends them with every
  // optimization (built from the plan; nothing is stored in the database).
  // Soft by default: weighed against walking by the optimizer-focus slider.
  const useDamplab = settings.damplabRules !== false, damplabSeverity = settings.damplabSeverity === "hard" ? "hard" : "soft";
  const damplab = useMemo(() => { try { return plan ? damplabRules(plan) : { rules: [], unreachable: [] }; } catch { return { rules: [], unreachable: [] }; } }, [plan]);
  const damplabSent = useMemo(() => (useDamplab ? hardOnly(damplab.rules.map(r => ({ ...r, severity: damplabSeverity }))) : []), [useDamplab, damplab, damplabSeverity]);
  const ownSent = useMemo(() => hardOnly(rules), [rules]);

  // ---- Database -------------------------------------------------------------
  useEffect(() => {
    dbHealth().then(h => { setDb({ state: "ok", message: `${h.database} @ ${h.uri}` }); return Promise.all([dbValidatedProtocols().then(setValidated), dbLayouts().then(setLayouts)]); })
      .catch(e => setDb({ state: "error", message: e.message }));
  }, []);
  const equipmentIds = useMemo(() => (plan ? equipmentIdsOf(plan) : []), [plan]);
  const fetchProtocols = useCallback(async () => {
    if (!plan || db.state !== "ok" || !refs.length) return;
    setDbBusy(true); setDbError("");
    try { setProtocolData(await dbProtocolData(refs.map(r => r.protocolId), equipmentIds)); } catch (e) { setDbError(e.message); } finally { setDbBusy(false); }
  }, [plan, db.state, refs, equipmentIds]);
  const refsKey = refs.map(r => r.protocolId).join(",");
  useEffect(() => { setProtocolData(null); fetchProtocols(); }, [layoutText, refsKey, db.state]); // eslint-disable-line react-hooks/exhaustive-deps
  const scenario = useMemo(() => (plan && protocolData ? scenarioFromDatabase(plan, protocolData, { overrides, extraProtocols: extra }) : null), [plan, protocolData, overrides, extra]);

  // ---- Worker ---------------------------------------------------------------
  function run(kind) {
    if (kind !== "inspect" && refs.length && !parsed.envelope?.protocols?.length && (!scenario || dbBusy || dbError)) {
      setDiagnostics([{ path: "protocols", message: "Wait for the database protocol mapping, or import a request with embedded protocols." }]); return;
    }
    setDiagnostics([]); setProgress(null);
    const w = new Worker(new URL("../generatedLab/worker.js", import.meta.url), { type: "module" });
    worker.current?.terminate(); worker.current = w; setBusy(kind);
    const key = inputsKey;
    w.onmessage = ({ data }) => {
      if (worker.current !== w) return;
      if (data.type === "progress") { setProgress(data.progress); return; }
      setBusy(null); w.terminate(); worker.current = null;
      if (data.type === "geometry") setGeometry({ layout: data.layout, key: layoutKey });
      else if (data.type === "result") { setResult(data.result); setResultKey(key); setMapView(data.optimized ? "both" : "baseline"); setTab(kind === "optimize" ? "charts" : "layout"); }
      else setDiagnostics(data.diagnostics);
    };
    w.onerror = e => { setBusy(null); setDiagnostics([{ path: "worker", message: e.message }]); w.terminate(); worker.current = null; };
    if (kind === "inspect") { w.postMessage({ input: parsed.input, inspectOnly: true }); return; }
    const companion = { constraints: [...damplabSent, ...ownSent] };
    if (scenario && refs.length && !parsed.envelope?.protocols?.length) {
      const { protocolSummaries, ...s } = scenario;
      Object.assign(companion, s);
    }
    companion.settings = { validationMode: settings.exploratory ? "exploratory" : "strict", timeLimitMs: Math.min(600000, Math.max(100, Math.round(Number(settings.timeLimitMs ?? 30000)) || 30000)), optimizerBalance: balance, unresolvedVisits: settings.skipUnresolved ? "exclude" : "block" };
    if (kind === "optimize") {
      w.terminate(); worker.current = null;
      const controller = new AbortController(); solveController.current = controller;
      markSolving(true); setInterrupted(null);
      const solve = constraints => optimizeOnServer(parsed.input, { ...companion, constraints }, controller.signal);
      // As Cirrus does: when DAMPLab's rules are hard and leave no feasible
      // placement, drop its "keep near" rules, then all of its rules (your
      // own rules always stay), and say so on the result. Soft rules never
      // make a lab infeasible.
      const near = damplabSeverity === "hard" ? damplabSent : [], own = near.length ? ownSent : [...damplabSent, ...ownSent], apart = near.filter(r => r.kind === "apart");
      const attempts = [[[...near, ...own], null], ...(apart.length < near.length ? [[[...apart, ...own], "near"]] : []), ...(near.length ? [[own, "all"]] : [])];
      (async () => {
        let body = null;
        for (const [i, [constraints, dropped]] of attempts.entries()) {
          if (i) setProgress({ message: dropped === "near" ? "No feasible placement with every DAMPLab rule — retrying without the keep-near rules…" : "Still infeasible — retrying without DAMPLab's rules…" });
          body = { ...(await solve(constraints)), damplabDropped: dropped };
          if (body.status !== "no-feasible-placement") break;
        }
        if (solveController.current !== controller) return;
        setResult(body); setResultKey(key); setMapView("both"); setTab("charts");
      })().catch(e => { if (e.name !== "AbortError") setDiagnostics(e.diagnostics ?? [{ path: "solver", message: e.message }]); })
        .finally(() => { if (solveController.current === controller) { solveController.current = null; setBusy(null); markSolving(false); } });
    } else w.postMessage({ input: parsed.input, scenario: companion, optimize: false });
  }
  function stop() {
    solveController.current?.abort(); solveController.current = null; markSolving(false);
    worker.current?.terminate(); worker.current = null; setBusy(null); setProgress(null);
    setDiagnostics([{ path: "search", message: "Stopped. The last completed result is kept; the interrupted search was discarded." }]);
  }
  useEffect(() => () => { worker.current?.terminate(); solveController.current?.abort(); }, []);
  // A solve still marked as running when the page loads was cut off by a
  // reload — in development, usually the Vite server restarting after a
  // change to solver/server code, which drops the request and reloads the page.
  useEffect(() => {
    let started = null;
    try { started = sessionStorage.getItem(SOLVING_KEY); sessionStorage.removeItem(SOLVING_KEY); } catch { /* storage blocked */ }
    if (started) setInterrupted(new Date(Number(started)).toLocaleTimeString());
  }, []);

  // Validate and draw the lab as soon as it is loaded.
  const layoutKey = useMemo(() => hashText(layoutText), [layoutText]);
  useEffect(() => { setGeometry(null); if (parsed && !parsed.error) run("inspect"); }, [layoutKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // When a lab loads, adopt its embedded rules (request envelopes) and its
  // own optimizer-focus setting.
  const loadLayout = (text, label) => {
    setLayoutText(text); setLayoutLabel(label); setOverrides({}); setExtra([]); setResult(null); setResultKey(null); setTab("layout"); setMapFilter({ zone: null, hidden: [] }); setChartFilter({ zone: "all", hidden: [] });
    try { const env = JSON.parse(text); setRules(Array.isArray(env?.constraints) ? env.constraints : []); } catch { setRules([]); }
    setSettings(s => ({ ...s, balance: null }));
  };

  const inputsKey = JSON.stringify([layoutKey, overrides, extra, rules, settings, balance, protocolData ? hashText(JSON.stringify(protocolData)) : null]);
  const stale = !!result && resultKey !== inputsKey;
  const optimized = !!result?.search;
  const ready = !!geometry && !busy;
  const next = !ready ? null : !result ? "map" : stale ? (optimized ? "optimize" : "map") : !optimized ? "optimize" : null;
  const colors = useMemo(() => (result ? runColors(result.baseline.perProtocol) : new Map()), [result]);
  const movedIds = useMemo(() => new Set((result?.moves ?? []).map(m => m.instanceId)), [result]);
  const quickFixes = {
    placeholder: diagnostics.some(d => /Placeholder dimensions/.test(d.message)) && !settings.exploratory,
    unresolved: diagnostics.some(d => /no location|not in this lab|not in the \S+ zone/.test(d.message)) && !settings.skipUnresolved,
  };

  return (
    <div className="app">
      <header className="app-head">
        <div>
          <h1>Cirrus <span>Optimizer</span></h1>
          <p>Load a Cirrus lab plan, pull its protocols from the Cirrus database, and rearrange equipment to cut frequency-weighted walking — within the bench rules, zones and your hard rules.</p>
        </div>
        <span className={`db-pill ${db.state}`} title={db.message}><i />{db.state === "ok" ? "Cirrus database connected" : db.state === "checking" ? "Checking database…" : "Database offline"}</span>
      </header>

      <div className="grid-setup">
        <LabCard {...{ parsed, layoutLabel, layouts, db, busy, loadLayout }} />
        <ProtocolsCard {...{ plan, parsed, refs, scenario, db, dbBusy, dbError, fetchProtocols, overrides, setOverrides, extra, setExtra, validated, busy }} />
        <RulesCard {...{ plan, rules, setRules, settings, setSettings, balance, busy, damplab, useDamplab, damplabSeverity }} />
      </div>

      <div className="actions">
        <button className={`btn ${next === "map" ? "primary" : ""}`} disabled={!ready} onClick={() => run("map")}>Map baseline routes</button>
        <button className={`btn ${next === "optimize" ? "primary" : ""}`} disabled={!ready} onClick={() => run("optimize")}>Optimize equipment</button>
        {busy && busy !== "inspect" && <button className="btn" onClick={stop}>Stop</button>}
        <span className="progress" role="status">
          {busy === "inspect" ? "Validating lab geometry…" : busy ? (progress ? progress.message ?? `Searching: ${fmt(progress.evaluated, 0)} candidates · ${progress.acceptedMoves} moves · ${fmt(progress.totalWeightedFt)} weighted ft` : busy === "optimize" ? "Solving bench assignments with MiniZinc…" : "Mapping baseline routes…")
            : stale ? "Inputs changed since this result — run again to update it." : result ? (optimized ? "Optimized result is current." : "Baseline mapped. Optimize to rearrange equipment.") : geometry ? "Lab validated. Map the baseline routes next." : ""}
        </span>
        <span className="sep" />
        {result && <button className="btn small" onClick={() => download(`cirrus-optimizer-result-${result.source.layoutId ?? "lab"}.json`, result)}>Export result</button>}
        {result && <button className="btn small" onClick={() => download("optimizer-request.json", { optimizerSchemaVersion: 1, layout: result.layout, source: result.source, ...result.scenario })}>Export reproducible request</button>}
      </div>

      {interrupted && (
        <div className="note warn" role="status">
          The MiniZinc solve started at {interrupted} was interrupted because the page reloaded — in development this happens when the dev server restarts after a change to solver or server code. Its result was lost; run <b>Optimize equipment</b> again. <button className="btn small link" onClick={() => setInterrupted(null)}>Dismiss</button>
        </div>
      )}
      {!!diagnostics.length && (
        <div className="note error" role="alert">
          <strong>{diagnostics.length} issue{diagnostics.length === 1 ? "" : "s"} to resolve</strong>
          {(quickFixes.placeholder || quickFixes.unresolved) && <div className="row" style={{ margin: "6px 0" }}>
            {quickFixes.placeholder && <button className="btn small" onClick={() => setSettings(s => ({ ...s, exploratory: true }))}>Allow placeholder sizes (exploratory)</button>}
            {quickFixes.unresolved && <button className="btn small" onClick={() => setSettings(s => ({ ...s, skipUnresolved: true }))}>Skip and report unresolvable visits</button>}
          </div>}
          <ul>{diagnostics.slice(0, 60).map((d, i) => <li key={i}><code>{d.path}</code>: {d.message}</li>)}</ul>
        </div>
      )}

      {geometry && (
        <>
          <div className="tabs" role="tablist">
            {[["layout", result?.search ? "Layout: original vs optimized" : "Layout & routes"], ["charts", "Charts"], ["details", "Details"]].map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} disabled={id !== "layout" && !result} onClick={() => setTab(id)}>
                {label}{id === "details" && result?.excludedVisits.length ? <span className="badge">{result.excludedVisits.length} skipped</span> : null}
              </button>
            ))}
          </div>
          {stale && result && <div className="note warn" style={{ marginBottom: 10 }}>Showing the last result; the inputs have changed since it ran.</div>}
          {tab === "layout" && (result ? <LayoutView {...{ result, colors, filter: mapFilter, setFilter: setMapFilter, mapView, setMapView, movedIds, optimized }} /> : <GeometryView layout={geometry.layout} />)}
          {result && tab === "charts" && <ChartsView {...{ result, colors, filter: chartFilter, setFilter: setChartFilter, legMode, setLegMode, optimized }} />}
          {result && tab === "details" && <DetailsView {...{ result, colors, optimized }} />}
        </>
      )}
    </div>
  );
}

// ---- Setup cards -------------------------------------------------------------
function LabCard({ parsed, layoutLabel, layouts, db, busy, loadLayout }) {
  const [pick, setPick] = useState("");
  const [loadError, setLoadError] = useState("");
  const readFile = async e => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (file.size > 40 * 1024 * 1024) return alert("Use a JSON file smaller than 40 MB.");
    loadLayout(await file.text(), file.name);
  };
  const fromDb = async () => {
    if (!pick) return;
    const [layoutId, revision] = pick.split("@");
    setLoadError("");
    try {
      const row = await dbLayout(layoutId, Number(revision));
      loadLayout(JSON.stringify(row), `Cirrus layout ${layoutId.slice(0, 8)} r${row.revision}${row.protocolsFrom === "report" ? " (protocols from its report)" : ""}`);
    } catch (e) { setLoadError(e.message); }
  };
  const plan = parsed?.plan;
  return (
    <section className="card">
      <h2><span className="step">1</span>Lab plan</h2>
      <div className="stack">
        <label className="field">Cirrus "Download plan JSON" file<input type="file" accept=".json,application/json" disabled={!!busy} onChange={readFile} /></label>
        {db.state === "ok" && <div className="row">
          <select aria-label="Generated layouts in the Cirrus database" value={pick} onChange={e => setPick(e.target.value)} style={{ flex: 1 }}>
            <option value="">Or pick a generated layout…</option>
            {layouts.map(l => <option key={`${l.layoutId}@${l.revision}`} value={`${l.layoutId}@${l.revision}`}>{new Date(l.createdAt).toLocaleString()} · {l.widthFt}×{l.heightFt} ft · {l.benches} benches · r{l.revision}</option>)}
          </select>
          <button className="btn small" disabled={!pick || !!busy} onClick={fromDb}>Load</button>
        </div>}
        <button className="btn small link" disabled={!!busy} onClick={() => loadLayout(JSON.stringify(makeDemoRequest()), "Synthetic example (protocols embedded)")}>Load the synthetic example</button>
        {loadError && <div className="note error">{loadError}</div>}
        {parsed?.error && <div className="note error">{parsed.error}</div>}
        {plan && <div className="muted">
          <b style={{ color: "var(--ink)" }}>{layoutLabel || "Imported lab"}</b><br />
          {plan.benches.length} benches · {plan.zones.map(z => z.name).join(" / ")} · {plan.zones.reduce((n, z) => n + z.equipment.reduce((m, e) => m + e.quantity, 0), 0)} bench units · {plan.floorItems.length} floor items<br />
          {Array.isArray(plan.protocols) ? `${plan.protocols.length} protocol reference${plan.protocols.length === 1 ? "" : "s"} in plan.protocols` : "No plan.protocols (older export)"}
        </div>}
      </div>
    </section>
  );
}

function ProtocolsCard({ plan, parsed, refs, scenario, db, dbBusy, dbError, fetchProtocols, overrides, setOverrides, extra, setExtra, validated, busy }) {
  const [add, setAdd] = useState("");
  const set = (id, patch) => setOverrides(o => ({ ...o, [id]: { ...(o[id] ?? {}), ...patch } }));
  const embedded = parsed?.envelope?.protocols?.length && !refs.length;
  const summaries = scenario?.protocolSummaries ?? [];
  const zones = plan?.zones ?? [];
  return (
    <section className="card">
      <h2><span className="step">2</span>Protocols <span className="muted" style={{ fontWeight: 500 }}>— steps & equipment from the Cirrus database</span></h2>
      {!plan && <p className="muted">Load a lab plan. Its <code>plan.protocols</code> says which protocols run there; each protocol's ordered steps and step→equipment mapping are read from the database when you map or optimize.</p>}
      {embedded && <div className="note info">This file embeds its own protocols ({parsed.envelope.protocols.length}); they are used as-is.</div>}
      {plan && !embedded && db.state !== "ok" && <div className="note error">The Cirrus database is not reachable ({db.message}). Start cirrus-backend and its MongoDB (<code>docker compose up -d</code> in cirrus-backend).</div>}
      {plan && db.state === "ok" && (
        <>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <span className="muted">{dbBusy ? "Reading protocols…" : scenario ? `${summaries.filter(s => s.include).length} of ${summaries.length} protocols included` : refs.length ? "" : "No protocols on this plan yet."}</span>
            <button className="btn small" disabled={dbBusy || !!busy || !refs.length} onClick={fetchProtocols}>Refresh from database</button>
          </div>
          {dbError && <div className="note error">{dbError}</div>}
          {!!summaries.length && (
            <div className="table-wrap" style={{ maxHeight: 330, overflow: "auto" }}>
              <table className="data">
                <thead><tr><th>Protocol</th><th>Steps</th><th>Runs/wk</th><th className="left">Zone</th></tr></thead>
                <tbody>{summaries.map(s => (
                  <tr key={s.protocolId}>
                    <td>
                      <label className="check"><input type="checkbox" checked={s.include} disabled={!s.steps} onChange={e => set(s.protocolId, { include: e.target.checked })} />
                        <span>{s.title}<br />
                          {!s.steps && <span className="tag err">no mapping</span>} {!!s.missingEquipment.length && <span className="tag warn" title={s.missingEquipment.join(", ")}>{s.missingEquipment.length} not in lab</span>} {!!s.floorEquipment.length && <span className="tag" title={s.floorEquipment.join(", ")}>{s.floorEquipment.length} floor item{s.floorEquipment.length === 1 ? "" : "s"}</span>} {!!s.zoneGaps?.length && <span className="tag err" title={s.zoneGaps.map(g => g.name).join(", ")}>{s.zoneGaps.length} missing in zone</span>}
                        </span>
                      </label>
                    </td>
                    <td>{s.steps || "–"}</td>
                    <td><input type="number" min="0" step="0.5" aria-label={`Runs per week for ${s.title}`} value={s.runsPerWeek} onChange={e => set(s.protocolId, { runsPerWeek: e.target.value === "" ? 0 : Number(e.target.value) })} style={{ width: 64 }} /></td>
                    <td className="left">
                      <select aria-label={`Zone for ${s.title}`} value={s.zoneId ?? ""} onChange={e => set(s.protocolId, { zoneId: e.target.value })}>
                        {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                      <div className="muted" style={{ fontSize: 11.5 }}>{ZONE_SOURCE[s.zoneSource] ?? ""}</div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            <select aria-label="Add a validated protocol" value={add} onChange={e => setAdd(e.target.value)} style={{ flex: 1 }}>
              <option value="">Add a validated protocol…</option>
              {validated.filter(v => !refs.some(r => r.protocolId === v.protocolId)).map(v => <option key={v.protocolId} value={v.protocolId}>{v.title}</option>)}
            </select>
            <button className="btn small" disabled={!add} onClick={() => { const v = validated.find(x => x.protocolId === add); setExtra(x => [...x, { protocolId: v.protocolId, title: v.title, runsPerWeek: 1 }]); setAdd(""); }}>Add</button>
          </div>
          {extra.length > 0 && <p className="muted" style={{ marginTop: 4 }}>{extra.length} added here (not in the lab JSON). <button className="btn link" onClick={() => setExtra([])}>Remove added</button></p>}
          <ZoneGaps summaries={summaries} zones={zones} />
          {scenario?.databaseNotes.filter(n => (n.level !== "info" || summaries.length) && n.kind !== "zone-gaps").map((n, i) => <div key={i} className={`note ${n.level === "error" ? "error" : n.level === "warning" ? "warn" : "info"}`} style={{ marginTop: 6 }}>{n.message}</div>)}
        </>
      )}
    </section>
  );
}

function RulesCard({ plan, rules, setRules, settings, setSettings, balance, busy, damplab, useDamplab, damplabSeverity }) {
  const softCount = WALKING_ONLY ? 0 : (useDamplab && damplabSeverity === "soft" ? damplab.rules.length : 0) + rules.filter(r => r.severity === "soft").length;
  const equipment = useMemo(() => {
    if (!plan) return [];
    const m = new Map();
    for (const z of plan.zones) for (const e of z.equipment) m.set(e.equipmentId, e.name);
    for (const e of plan.floorItems) m.set(e.equipmentId, e.name);
    return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [plan]);
  const update = (i, patch) => setRules(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRule = () => setRules(rs => [...rs, { id: `rule-${Date.now().toString(36)}`, type: "notSameBench", severity: "hard", equipmentIds: [equipment[0]?.id ?? "", equipment[1]?.id ?? equipment[0]?.id ?? ""] }]);
  const s = (k, v) => setSettings(x => ({ ...x, [k]: v }));
  return (
    <section className="card">
      <h2><span className="step">3</span>Equipment rules & focus</h2>
      <div className="stack">
        {rules.map((r, i) => (
          <div key={r.id} className="note" style={{ padding: 8 }}>
            <div className="row">
              <select aria-label="Rule type" value={r.type} onChange={e => update(i, { type: e.target.value, ...(WALK_RULE_TYPES.includes(e.target.value) && !r.distanceFt ? { distanceFt: 10 } : {}) })}>{RULE_TYPES.map(t => <option key={t} value={t}>{RULE_LABEL[t]}</option>)}</select>
              <select aria-label="Severity" value={r.severity} onChange={e => update(i, { severity: e.target.value })}><option value="hard">Hard (never broken)</option><option value="soft">Soft (weighed by the slider)</option></select>
              <button className="btn small" aria-label="Remove rule" onClick={() => setRules(rs => rs.filter((_, j) => j !== i))}>✕</button>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              {[0, 1].map(k => <select key={k} aria-label={k ? "Second equipment" : "First equipment"} value={r.equipmentIds[k]} style={{ flex: 1, maxWidth: "48%" }} onChange={e => update(i, { equipmentIds: k ? [r.equipmentIds[0], e.target.value] : [e.target.value, r.equipmentIds[1]] })}>{equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}</select>)}
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              {WALK_RULE_TYPES.includes(r.type) && <label className="row" style={{ fontSize: 13 }}>Distance <input type="number" min="0.5" step="0.5" value={r.distanceFt ?? 10} onChange={e => update(i, { distanceFt: Number(e.target.value) })} /> ft</label>}
              {r.severity === "soft" && <label className="row" style={{ fontSize: 13 }}>Weight <input type="number" min="0.1" step="0.5" value={r.weight ?? 1} onChange={e => update(i, { weight: Number(e.target.value) })} style={{ width: 64 }} /></label>}
            </div>
          </div>
        ))}
        {plan && <div className="note" style={{ padding: 8 }}>
          <label className="check"><input type="checkbox" checked={useDamplab} disabled={!!busy || !damplab.rules.length} onChange={e => s("damplabRules", e.target.checked)} />
            <span><b>DAMPLab equipment rules</b> — {damplab.rules.length} rule{damplab.rules.length === 1 ? "" : "s"} for this lab ({damplab.rules.filter(r => r.kind === "apart").length} keep apart, {damplab.rules.filter(r => r.kind === "near").length} keep near), the ones Cirrus applies</span></label>
          {useDamplab && !!damplab.rules.length && <div className="row" style={{ margin: "6px 0 0 22px" }}>
            <select aria-label="DAMPLab rules severity" value={damplabSeverity} disabled={!!busy} onChange={e => s("damplabSeverity", e.target.value)}>
              <option value="soft">Soft — weighed against walking by the slider</option>
              <option value="hard">Hard — never broken (Cirrus's behaviour)</option>
            </select>
          </div>}
          {!!damplab.rules.length && <details><summary>Show the rules</summary>
            <ul style={{ marginLeft: 18, fontSize: 13, maxHeight: 220, overflow: "auto" }}>{damplab.rules.map(r => <li key={r.id}><span className={`tag ${r.kind === "apart" ? "warn" : ""}`}>{r.kind === "apart" ? "apart" : "near"}</span> {r.description}</li>)}</ul>
          </details>}
          <p className="muted" style={{ marginTop: 4 }}>Built from DAMPLab's equipment workbook by equipment category, as in cirrus-backend. {damplabSeverity === "hard" ? "As hard rules, if they leave no feasible placement the keep-near rules are dropped, then all of them (your own rules below stay)." : "As soft rules, each unit breaking one counts as a violation the slider weighs against walking."}{damplab.unreachable.length ? ` ${damplab.unreachable.length} keep-near rule(s) no placement on this floor plan can meet are left out.` : ""}</p>
        </div>}
        <button className="btn small" disabled={!plan || !!busy} onClick={addRule}>+ Add your own rule</button>
        <div>
          <label className="field">Optimizer focus <span className="muted" style={{ fontWeight: 500 }}>{balance === 1 ? "walking only" : balance === 0 ? "soft rules only (walking breaks ties)" : `${fmt((1 - balance) * 100, 0)}% soft rules · ${fmt(balance * 100, 0)}% walking`}</span>
            <input type="range" min="0" max="1" step="0.05" value={balance} disabled={!!busy || !softCount} onChange={e => s("balance", Number(e.target.value))} aria-valuetext={`${fmt(balance * 100, 0)}% walking`} /></label>
          <div className="slider-labels"><span>Soft rules</span><span>Balanced</span><span>Walking distance</span></div>
          <p className="muted">{softCount
            ? <>MiniZinc minimizes <code>b × walking / W₀ + (1 − b) × violations / N</code>: W₀ is the original layout's weighted walking and N the number of soft-rule checks (one per rule per unit it applies to), so every foot saved is weighed against every violation fixed. In the middle, fixing one violation is worth W₀ / N ft of walking (shown after a run). Hard rules are never broken.</>
            : WALKING_ONLY
              ? "Soft rules are disabled for now: MiniZinc minimizes walking distance only, within the hard rules. Soft rules (including DAMPLab's, unless set to Hard) are not sent."
              : "No soft rules: MiniZinc minimizes walking within the hard rules. Make DAMPLab's rules (or your own) soft to use the slider."}</p>
        </div>
        <details>
          <summary>Search settings</summary>
          <div className="stack">
            <label className="row" style={{ fontSize: 13 }}>MiniZinc time limit (seconds, up to 600) <input type="number" min="0.1" max="600" step="5" value={(settings.timeLimitMs ?? 30000) / 1000} onChange={e => s("timeLimitMs", Math.round(Number(e.target.value) * 1000))} /></label>
            <label className="check"><input type="checkbox" checked={settings.exploratory} onChange={e => s("exploratory", e.target.checked)} /><span>Allow placeholder equipment sizes (exploratory — physical fit unverified)</span></label>
            <label className="check"><input type="checkbox" checked={settings.skipUnresolved} onChange={e => s("skipUnresolved", e.target.checked)} /><span>Skip visits no placed equipment can serve (unplaced floor items, equipment missing from the lab) — every one is listed</span></label>
          </div>
        </details>
      </div>
    </section>
  );
}

// ---- Result views ------------------------------------------------------------
function GeometryView({ layout }) {
  const plan = layout.plan, ie = plan.initialEquipment ?? { placements: [], workAreas: [], unplaced: [] };
  const zoneIds = plan.zones.map(z => z.id);
  return (
    <div className="stack">
      <FloorPlan layout={layout} placements={ie.placements} workAreas={ie.workAreas ?? []} title={<><span>As exported by Cirrus</span><span className="muted">{plan.benches.length} benches · aisle {fmt(plan.aisle.areaSqFt ?? plan.aisle.cells.length * 0.25, 0)} sq ft · {ie.placements.length} placed · {ie.unplaced.length} unplaced · * fixed</span></>} />
      <div className="legend">
        {plan.zones.map(z => <span key={z.id}><span className="swatch box" style={{ background: zoneColor(z.id, zoneIds), opacity: .6 }} /> {z.name} ({z.benchIds.length} benches)</span>)}
        <span><span className="swatch box" style={{ background: "rgba(52,98,201,.3)" }} /> Aisle</span>
        <span><span className="swatch box" style={{ background: "rgba(214,79,79,.25)" }} /> Door clearance</span>
        <span><span className="swatch box" style={{ border: "1px dashed #263b46" }} /> Pipette work area</span>
      </div>
      {plan.floorItems.length > 0 && <p className="muted">Floor-standing, placed by hand in Cirrus (not drawn): {plan.floorItems.map(f => f.name).join(", ")}.</p>}
    </div>
  );
}

// Pick a zone (biomaterial type), then tick the protocols to show within
// it. "All zones" with Select all shows everything at once.
function filterRuns(runs, filter) {
  const hidden = new Set(filter.hidden);
  return new Set(runs.filter(r => !r.inactive && (filter.zone === "all" || r.zoneId === filter.zone) && !hidden.has(r.id)).map(r => r.id));
}
function ProtocolFilter({ runs, zones, colors, filter, setFilter }) {
  const zoneIds = zones.map(z => z.id), active = runs.filter(r => !r.inactive);
  const usedZones = zones.filter(z => active.some(r => r.zoneId === z.id));
  const inZone = active.filter(r => filter.zone === "all" || r.zoneId === filter.zone);
  const hidden = new Set(filter.hidden);
  const setHidden = next => setFilter(f => ({ ...f, hidden: [...next] }));
  const toggle = id => { const n = new Set(hidden); n.has(id) ? n.delete(id) : n.add(id); setHidden(n); };
  const shownCount = inZone.filter(r => !hidden.has(r.id)).length;
  const groups = filter.zone === "all" ? usedZones.map(z => [z, inZone.filter(r => r.zoneId === z.id)]) : [[zones.find(z => z.id === filter.zone), inZone]];
  return (
    <div className="filter">
      <div className="row" role="group" aria-label="Zone">
        <span className="muted">Zone</span>
        <button className={`chip ${filter.zone === "all" ? "on" : ""}`} aria-pressed={filter.zone === "all"} onClick={() => setFilter(f => ({ ...f, zone: "all" }))}>All zones <span className="muted">{active.length}</span></button>
        {usedZones.map(z => (
          <button key={z.id} className={`chip ${filter.zone === z.id ? "on" : ""}`} aria-pressed={filter.zone === z.id} onClick={() => setFilter(f => ({ ...f, zone: z.id }))}>
            <span className="swatch box" style={{ background: zoneColor(z.id, zoneIds) }} />{z.name} <span className="muted">{active.filter(r => r.zoneId === z.id).length}</span>
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <span className="muted">{shownCount} of {inZone.length} protocol{inZone.length === 1 ? "" : "s"} shown</span>
        <button className="btn small" disabled={shownCount === inZone.length} onClick={() => setHidden([...hidden].filter(id => !inZone.some(r => r.id === id)))}>Select all</button>
        <button className="btn small" disabled={!shownCount} onClick={() => setHidden(new Set([...hidden, ...inZone.map(r => r.id)]))}>Clear</button>
      </div>
      {groups.map(([zone, list]) => zone && (
        <div key={zone.id} className="filter-group">
          {filter.zone === "all" && <div className="filter-zone"><span className="swatch box" style={{ background: zoneColor(zone.id, zoneIds) }} />{zone.name}</div>}
          <div className="filter-list">
            {list.map(r => (
              <label key={r.id} className="check">
                <input type="checkbox" checked={!hidden.has(r.id)} onChange={() => toggle(r.id)} />
                <span><span className="swatch" style={{ background: colors.get(r.id), marginRight: 6, verticalAlign: "middle" }} />{r.name} <span className="muted">· {r.runsPerPeriod}/{r.period} · {fmt(r.weightedTravelFt, 0)} ft</span></span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// The lab with its placements and protocol routes: original (Cirrus) and,
// after optimizing, the optimized placement, alone or side by side.
function LayoutView({ result, colors, filter, setFilter, mapView, setMapView, movedIds, optimized }) {
  const views = optimized ? [["both", "Side by side"], ["baseline", "Original"], ["best", "Optimized"]] : [["baseline", "Original"]];
  const view = optimized ? mapView : "baseline";
  const zones = result.layout.plan.zones, zoneIds = zones.map(z => z.id), runs = result.baseline.perProtocol;
  // Start on the first zone with protocols: every route at once is too much.
  const firstZone = zones.find(z => runs.some(r => r.zoneId === z.id && !r.inactive))?.id ?? "all";
  const known = z => z === "all" || zones.some(x => x.id === z);
  const f = known(filter.zone) ? filter : { ...filter, zone: firstZone };
  const setF = fn => setFilter(x => fn(known(x.zone) ? x : { ...x, zone: firstZone }));
  const visible = filterRuns(runs, f);
  const focusZone = f.zone === "all" ? null : f.zone;
  const drawn = (snap, label) => (
    <FloorPlan layout={result.layout} placements={snap.placements} workAreas={snap.workAreas} routes={snap.perProtocol} colorOf={id => colors.get(id)} visibleRunIds={visible} focusRunIds={visible.size === 1 ? [...visible] : null} focusZoneId={focusZone}
      movedIds={snap === result.best && optimized ? movedIds : null} emptyBenchIds={snap.emptyBenchIds}
      title={<><span>{label}</span><span className="muted">{snap.placements.length} placed · {fmt(snap.totalWeightedFt)} weighted ft/{result.period ?? "run"}{snap === result.best && optimized ? ` · ${result.moves.length} moved` : ""}</span></>} />
  );
  return (
    <div className="stack">
      <Stats result={result} optimized={optimized} />
      <section className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <div className="row" role="group" aria-label="Placement shown">{views.map(([id, label]) => <button key={id} className={`btn small ${view === id ? "primary" : ""}`} onClick={() => setMapView(id)}>{label}</button>)}</div>
          <span className="muted">Bubbles on a bench list the steps done there (an oval = consecutive steps, e.g. 2.1–3.6), outlined in the protocol's color. Tick a single protocol to draw it bold on the exact aisle it walks.</span>
        </div>
        <ProtocolFilter runs={runs} zones={zones} colors={colors} filter={f} setFilter={setF} />
      </section>
      {focusZone && <ZoneLine row={zoneRows(result).find(r => r.zone.id === focusZone)} period={result.period ?? "run"} optimized={optimized} />}
      {view === "both" ? <div className="plan-pair">{drawn(result.baseline, "Original (Cirrus)")}{drawn(result.best, "Optimized")}</div> : drawn(view === "best" ? result.best : result.baseline, view === "best" ? "Optimized placement" : "Original placement (Cirrus)")}
      <div className="legend">
        {zones.map(z => <span key={z.id}><span className="swatch box" style={{ background: zoneColor(z.id, zoneIds), opacity: .6 }} /> {z.name} ({z.benchIds.length} benches)</span>)}
        <span><span className="swatch box" style={{ background: "rgba(52,98,201,.3)" }} /> Aisle</span>
        <span><span className="swatch box" style={{ background: "rgba(214,79,79,.25)" }} /> Door clearance</span>
        {optimized && <span><span className="swatch box" style={{ background: "#e6fbfb", border: "2px solid #049295" }} /> Moved by the optimizer</span>}
        <span><span className="swatch box" style={{ border: "1px solid #263b46", backgroundImage: "repeating-linear-gradient(-45deg, transparent 0 3px, rgba(34,36,47,.4) 3px 4px)" }} /> Empty bench</span>
        <span>* fixed</span>
      </div>
    </div>
  );
}

function Stats({ result, optimized }) {
  const per = result.period ?? "run";
  return (
    <div className="stats">
      <div className="stat"><b>{fmt(result.baseline.totalWeightedFt, 0)}</b><span>Initial weighted ft/{per}</span></div>
      {optimized && <div className="stat"><b>{fmt(result.best.totalWeightedFt, 0)}</b><span>Optimized weighted ft/{per}</span></div>}
      {optimized && <div className="stat"><b className={result.improvementFt > 0 ? "good" : ""}>{fmt(result.improvementFt, 0)} ft{result.improvementPct !== null ? ` · ${fmt(result.improvementPct)}%` : ""}</b><span>Saved per {per}{result.partial ? " (resolvable visits only)" : ""}</span></div>}
      {optimized && <div className="stat"><b>{result.moves.length}</b><span>Units moved</span></div>}
      {result.objective.softRules > 0 && <div className="stat"><b className={result.best.softViolations < result.baseline.softViolations ? "good" : result.best.softViolations > result.baseline.softViolations ? "bad" : ""}>{result.baseline.softViolations}{optimized ? ` → ${result.best.softViolations}` : ""}</b><span>Soft-rule violations{optimized && result.objective.mode !== "walking-only" && Number.isFinite(result.objective.violationFt) ? ` · 1 = ${fmt(result.objective.violationFt)} ft/${per} at this focus` : optimized && result.objective.mode === "walking-only" ? " (not weighed: walking only)" : ""}</span></div>}
      <div className="stat"><b className={result.best.hardViolations.length ? "bad" : ""}>{result.best.hardViolations.length ? `${result.best.hardViolations.length} broken` : result.objective.hardRules ? "All hold" : "None set"}</b><span>Hard rules</span></div>
    </div>
  );
}

function ChartsView({ result, colors, filter, setFilter, legMode, setLegMode, optimized }) {
  const per = result.period ?? "run";
  const visible = filterRuns(result.baseline.perProtocol, filter);
  const [view, setView] = useState("walking");
  const hasRules = result.best.relations.length > 0;
  const shown = hasRules ? view : "walking";
  return (
    <div className="stack">
      <Stats result={result} optimized={optimized} />
      {hasRules && <div className="row" role="tablist" aria-label="Chart set">
        {[["walking", "Walking"], ["constraints", `Constraints (${result.best.relations.length} rules)`]].map(([id, label]) => <button key={id} role="tab" aria-selected={shown === id} className={`btn small ${shown === id ? "primary" : ""}`} onClick={() => setView(id)}>{label}</button>)}
      </div>}
      {shown === "constraints" ? <ConstraintsView result={result} optimized={optimized} /> : <>
      {result.partial && <div className="note warn">Partial result: {result.excludedVisits.length} skipped visit(s), {result.best.unplaced.length} unplaced unit(s). Review mapping notes in Details before relying on the totals.</div>}
      <div className="charts">
        <section className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>Weighted walking by step</h2>
            <div className="row" role="group" aria-label="Chart mode">
              <button className={`btn small ${!legMode ? "primary" : ""}`} onClick={() => setLegMode(false)}>Cumulative</button>
              <button className={`btn small ${legMode ? "primary" : ""}`} onClick={() => setLegMode(true)}>Per step</button>
            </div>
          </div>
          <p className="muted">Each line ends at that protocol's weighted total; x is the order equipment is used in, not time.</p>
          <ProtocolFilter runs={result.baseline.perProtocol} zones={result.layout.plan.zones} colors={colors} filter={filter} setFilter={setFilter} />
          <StepChart baseline={result.baseline.perProtocol} best={result.best.perProtocol} colors={colors} visible={visible} legMode={legMode} period={per} optimized={optimized} />
        </section>
        <div className="stack">
          <section className="card">
            <h2>Total weighted walking (ft/{per})</h2>
            <p className="muted">Sum over the protocols selected on the left × runs per {per}; segments are protocols, in line colors.</p>
            <TotalBars baseline={result.baseline} best={result.best} colors={colors} period={per} optimized={optimized} visible={visible} />
            {optimized && <p><strong className="good">{fmt(result.improvementFt, 0)} ft/{per} saved</strong>{result.improvementPct !== null ? ` (${fmt(result.improvementPct)}%)` : ""}</p>}
          </section>
          {optimized && <section className="card">
            <h2>MiniZinc search</h2>
            <p className="muted">{result.search.solver}{result.search.strategy === "complete+lns" ? " · complete search, then neighbourhood search" : ""} · {result.search.solutions} improvement(s) on the Cirrus layout · {fmt(result.search.durationMs / 1000)} seconds. {result.search.optimal ? "Optimal for the current bench-assignment model." : result.search.terminationReason === "infeasible" ? "No feasible assignment under the modeled placement rules." : "Time limit reached; best validated layout shown. Optimality is not proven — a longer time limit may save more."}</p>
            <ProgressChart history={result.search.history} period={per} />
          </section>}
        </div>
      </div>
      <ZoneStats result={result} optimized={optimized} />
      <section className="card">
        <h2>Walking-distance model</h2>
        <p><code>W = Σₚ fₚ × Σₖ d(bₚ,ₖ₋₁, bₚ,ₖ)</code></p>
        {result.objective.mode === "walking+soft-rules" && <p>Minimized: <code>b × W / W₀ + (1 − b) × violations / N</code> with b = {fmt(result.objective.optimizerBalance, 2)}, W₀ = {fmt(result.baseline.totalWeightedFt)} ft/{per} (original layout) and N = {result.objective.softChecks} soft-rule checks — so fixing one violation is worth {Number.isFinite(result.objective.violationFt) ? `${fmt(result.objective.violationFt)} ft` : "any amount"} of weighted walking per {per}.</p>}
        <p><b>fₚ</b> is protocol runs per {per}. <b>bₚ,ₖ</b> is the bench used at visit k. <b>d(b, b) = 0</b>: using another item on the same bench adds no walking. Between benches, d is the shortest aisle route between their fixed working-edge access points.</p>
        <p>MiniZinc chooses equipment-to-bench assignments and eligible units for each visit. Zone membership, fixed anchors, bench capacity, gaps, working space and hard rules constrain the solution. Within-bench positions only control fit and drawing. The first visit adds no entrance trip.</p>
        {!result.comparable && <p className="note warn">Route coverage changed: before/after totals are shown, but savings are not comparable.</p>}
      </section>
      <ProtocolTable result={result} colors={colors} optimized={optimized} visible={visible} />
      </>}
    </div>
  );
}

// Rule violations by zone, before and after: every unit breaking a rule
// counts once per rule, in its zone (floor equipment: "Floor (shared)").
function violationsByZone(result, snap) {
  const zoneOf = new Map(result.equipmentInstances.map(u => [u.instanceId, u.zoneId ?? null]));
  const out = new Map();
  for (const r of snap.relations) for (const id of r.failing) {
    const z = zoneOf.get(id) ?? null, row = out.get(z) ?? out.set(z, { hard: 0, soft: 0 }).get(z);
    row[r.severity === "hard" ? "hard" : "soft"]++;
  }
  return out;
}
function ConstraintsView({ result, optimized }) {
  const zones = result.layout.plan.zones, zoneIds = zones.map(z => z.id);
  const before = violationsByZone(result, result.baseline), after = violationsByZone(result, result.best);
  const ids = [...zones.map(z => z.id), null].filter(z => before.has(z) || after.has(z) || (z !== null && result.equipmentInstances.some(u => u.zoneId === z)));
  const name = z => (z === null ? "Floor (shared)" : zones.find(x => x.id === z)?.name ?? z);
  const color = z => (z === null ? "#263b46" : zoneColor(z, zoneIds));
  const count = (m, z) => { const r = m.get(z); return r ? r.hard + r.soft : 0; };
  const total = m => [...m.values()].reduce((t, r) => t + r.hard + r.soft, 0);
  const max = Math.max(1, ...ids.flatMap(z => [count(before, z), count(after, z)]));
  const W = 560, rowH = optimized ? 50 : 30, L = 120, R = 70, scale = v => (v / max) * (W - L - R);
  const o = result.objective, per = result.period ?? "run";
  const rules = result.best.relations.map(r => ({ r, b: result.baseline.relations.find(x => x.id === r.id) })).filter(({ r, b }) => r.failing.length || b?.failing.length)
    .sort((x, y) => (y.b?.failing.length ?? 0) - (x.b?.failing.length ?? 0) || y.r.failing.length - x.r.failing.length);
  const focusNote = o.mode === "walking+soft-rules"
    ? `Soft rules were weighed against walking (focus ${fmt(o.optimizerBalance * 100, 0)}% walking; one violation = ${Number.isFinite(o.violationFt) ? `${fmt(o.violationFt)} ft/${per}` : "any amount of walking"}).`
    : o.softRules ? "Soft rules were not weighed (focus at walking only)." : "Hard rules only: none may be broken.";
  const change = d => (d === 0 ? "" : ` (${d < 0 ? "−" : "+"}${Math.abs(d)})`);
  return (
    <>
      <section className="card table-wrap">
        <h2>Rule violations by zone</h2>
        <p className="muted">Each unit breaking a rule counts once per rule, in that unit's zone. {optimized ? "" : "Original layout. "}{focusNote}</p>
        <div className="chart">
          {optimized && <CompareLegend />}
          <svg viewBox={`0 0 ${W} ${ids.length * rowH + 6}`} role="img" aria-label="Rule violations by zone, before and after optimization">
            {ids.map((z, i) => {
              const y = 4 + i * rowH, b = count(before, z), a = count(after, z);
              return (
                <g key={z ?? "floor"}>
                  <text x={L - 8} y={y + 15} textAnchor="end" fontSize="12.5" fill="#14161f">{name(z)}</text>
                  <rect x={L} y={y + 4} width={Math.max(b ? 2 : 0, scale(b))} height={16} rx={3} fill={color(z)} fillOpacity={optimized ? 0.35 : 1}><title>{`${name(z)} original: ${b} violation(s)`}</title></rect>
                  <text x={L + scale(b) + 6} y={y + 16} fontSize="12" fill="#14161f">{b}</text>
                  {optimized && <>
                    <rect x={L} y={y + 24} width={Math.max(a ? 2 : 0, scale(a))} height={16} rx={3} fill={color(z)}><title>{`${name(z)} optimized: ${a} violation(s)`}</title></rect>
                    <text x={L + scale(a) + 6} y={y + 36} fontSize="12" fontWeight="700" fill="#14161f">{a}{change(a - b)}</text>
                  </>}
                </g>
              );
            })}
          </svg>
        </div>
        <table className="data">
          <thead><tr><th className="left">Zone</th><th>Original (soft / hard)</th>{optimized && <><th>Optimized (soft / hard)</th><th>Change</th></>}</tr></thead>
          <tbody>
            {ids.map(z => {
              const b = before.get(z) ?? { hard: 0, soft: 0 }, a = after.get(z) ?? { hard: 0, soft: 0 }, d = a.hard + a.soft - b.hard - b.soft;
              return <tr key={z ?? "floor"}>
                <td className="left"><span className="swatch box" style={{ background: color(z), marginRight: 6 }} />{name(z)}</td>
                <td>{b.hard + b.soft} <span className="muted">({b.soft} / {b.hard})</span></td>
                {optimized && <><td>{a.hard + a.soft} <span className="muted">({a.soft} / {a.hard})</span></td><td className={d < 0 ? "good" : d > 0 ? "bad" : ""}>{d === 0 ? "–" : `${d > 0 ? "+" : ""}${d}`}</td></>}
              </tr>;
            })}
            <tr><td className="left"><b>Total</b></td><td><b>{total(before)}</b></td>{optimized && <><td><b>{total(after)}</b></td><td className={total(after) < total(before) ? "good" : total(after) > total(before) ? "bad" : ""}><b>{total(after) - total(before) || "–"}</b></td></>}</tr>
          </tbody>
        </table>
      </section>
      <section className="card table-wrap">
        <h2>Rules broken ({rules.length} of {result.best.relations.length})</h2>
        {!rules.length ? <p className="muted">Every rule holds in both layouts.</p> : <table className="data">
          <thead><tr><th>Rule</th><th className="left">Kind</th><th>Original</th>{optimized && <th>Optimized</th>}</tr></thead>
          <tbody>{rules.map(({ r, b }) => <tr key={r.id}>
            <td>{ruleText(r, result)}</td><td className="left">{r.severity}</td>
            <td className={b?.failing.length ? "bad" : "good"}>{b?.failing.length ?? 0} of {b?.checked ?? r.checked}</td>
            {optimized && <td className={r.failing.length ? "bad" : "good"}>{r.failing.length} of {r.checked}</td>}
          </tr>)}</tbody>
        </table>}
      </section>
    </>
  );
}

function ProtocolTable({ result, colors, optimized, visible }) {
  const per = result.period ?? "run";
  return (
    <section className="card table-wrap">
      <h2>Per protocol</h2>
      <table className="data">
        <thead><tr><th>Protocol</th><th className="left">Zone</th><th>Runs/{per}</th><th>Visits</th><th>Initial ft/run</th>{optimized && <th>Optimized ft/run</th>}<th>Initial weighted</th>{optimized && <><th>Optimized weighted</th><th>Change</th></>}</tr></thead>
        <tbody>{result.baseline.perProtocol.filter(p => !visible || visible.has(p.id)).map(p => {
          const q = result.best.perProtocol.find(x => x.id === p.id), d = q.weightedTravelFt - p.weightedTravelFt;
          return <tr key={p.id}>
            <td><span className="swatch box" style={{ background: colors.get(p.id), marginRight: 6 }} />{p.name}{p.inactive ? " (inactive)" : ""}{p.excluded?.length ? <span className="tag warn" style={{ marginLeft: 6 }}>{p.excluded.length} skipped</span> : null}</td>
            <td className="left">{p.zoneId}</td><td>{p.runsPerPeriod}</td><td>{p.visits.length}</td><td>{fmt(p.travelFt)}</td>{optimized && <td>{fmt(q.travelFt)}</td>}<td>{fmt(p.weightedTravelFt)}</td>
            {optimized && <><td>{fmt(q.weightedTravelFt)}</td><td className={d < 0 ? "good" : d > 0 ? "bad" : ""}>{d === 0 ? "–" : `${d > 0 ? "+" : ""}${fmt(d)}`}</td></>}
          </tr>;
        })}</tbody>
      </table>
    </section>
  );
}

function DetailsView({ result, optimized }) {
  const notes = [...result.databaseNotes, ...result.notes, ...result.warnings];
  return (
    <div className="stack">
      {optimized && <section className="card table-wrap">
        <h2>Recommended moves ({result.moves.length})</h2>
        {!result.moves.length ? <p className="muted">No better placement was returned in this solve.</p> : <table className="data">
          <thead><tr><th>Equipment</th><th className="left">From</th><th className="left">To</th></tr></thead>
          <tbody>{result.moves.map(m => <tr key={m.instanceId}><td>{m.name}<br /><span className="muted">{m.instanceId}</span></td><td className="left bad">{m.from?.benchId ?? "Unplaced"} @ {fmt(m.from?.offsetFt, 2)} ft</td><td className="left good">{m.to.benchId} @ {fmt(m.to.offsetFt, 2)} ft</td></tr>)}</tbody>
        </table>}
      </section>}
      {result.damplabDropped && <div className="note warn">No placement met every DAMPLab equipment rule, so this result was solved {result.damplabDropped === "near" ? "without the keep-near rules (keep-apart rules still hold)" : "without DAMPLab's rules"} — as Cirrus does.</div>}
      {!!result.best.relations.length && <section className="card table-wrap">
        <h2>Equipment rules ({result.best.relations.length})</h2>
        <table className="data"><thead><tr><th>Rule</th><th className="left">Kind</th><th>Initial</th><th>Result</th></tr></thead>
          <tbody>{result.best.relations.map(r => { const b = result.baseline.relations.find(x => x.id === r.id); return <tr key={r.id}><td>{ruleText(r, result)}</td><td className="left">{r.severity}{r.weight ? ` ×${r.weight}` : ""}</td><td className={b.satisfied ? "good" : "bad"}>{b.satisfied ? "holds" : `${b.failing.length} of ${b.checked} break it`}</td><td className={r.satisfied ? "good" : "bad"}>{r.satisfied ? "holds" : `${r.failing.length} of ${r.checked} break it`}</td></tr>; })}</tbody>
        </table>
        {result.best.hardViolations.map((v, i) => <div key={i} className="note error" style={{ marginTop: 6 }}>{v.message}</div>)}
      </section>}
      <RunZoneGaps result={result} />
      {!!result.excludedVisits.length && <section className="card table-wrap">
        <h2>Skipped visits ({result.excludedVisits.length})</h2>
        <p className="muted">Left out of every route and total. Place the floor item in Cirrus, add the equipment to the lab, or pick another zone for the protocol.</p>
        <table className="data"><thead><tr><th>Protocol</th><th className="left">Step</th><th className="left">Equipment</th><th className="left">Why</th></tr></thead>
          <tbody>{result.excludedVisits.map((x, i) => <tr key={i}><td>{x.protocolName}</td><td className="left">{x.stepNumber}</td><td className="left">{x.equipmentId}</td><td className="left">{x.reason}</td></tr>)}</tbody></table>
      </section>}
      <section className="card table-wrap">
        <h2>Spare benches: Hamilton STAR and fridge/freezer suggestions</h2>
        <p className="muted">Review only. These benches are entirely empty; occupied benches retain the requested working space. A Hamilton STAR is too deep for a bench top, so it is offered an empty bench of its own zone to replace; fridges/freezers may take any empty bench. Suggestions prefer walls, then corners. Nothing is removed and route totals do not include these proposed placements.</p>
        {result.benchRepurposing.suggestions.length ? <table className="data">
          <thead><tr><th>Equipment</th><th className="left">Suggestion</th><th>Bench to review</th><th>Nearest wall</th><th className="left">Notes</th></tr></thead>
          <tbody>{result.benchRepurposing.suggestions.map(s => <tr key={s.instanceId}>
            <td>{s.name}<br /><span className="muted">{s.instanceId}</span></td>
            <td className="left">{s.kind === "bench-replacement" ? "Replace the bench" : "Cold storage in place of the bench"}</td>
            <td>{s.benchId}</td><td>{fmt(s.wallDistanceFt)} ft</td>
            <td className="left">{s.kind === "bench-replacement" && s.frontOverhangIn > 0 ? `Front stands ${s.frontOverhangIn}" past the bench edge, into its access strip.` : `${s.workingSpacePctRetained}% working space kept on occupied benches.`}</td>
          </tr>)}</tbody>
        </table> : <p>No eligible Hamilton STAR or fridge/freezer location found.</p>}
        {result.benchRepurposing.suggestions.length > 0 && <p className="note warn">Before applying in Cirrus, check door swing, ventilation/service clearances, utilities (and for a Hamilton STAR: power/network and floor loading) and access. Footprint fit alone does not verify these requirements.</p>}
        {result.benchRepurposing.unavailable.map(s => <p className="muted" key={s.instanceId}>{s.instanceId}: {s.reason}</p>)}
      </section>
      <section className="card">
        <h2>Benches and inventory</h2>
        <p>{result.best.emptyBenchIds.length} empty bench{result.best.emptyBenchIds.length === 1 ? "" : "es"} after {optimized ? "optimizing" : "mapping"}{result.best.emptyBenchIds.length ? `: ${result.best.emptyBenchIds.join(", ")} — candidates for storage or floor equipment.` : "."}</p>
        {!!result.best.unplaced.length && <details><summary>{result.best.unplaced.length} unplaced unit(s)</summary><ul style={{ marginLeft: 18 }}>{result.best.unplaced.map(u => <li key={u.instanceId}><code>{u.instanceId}</code>: {u.reason}</li>)}</ul></details>}
        {result.validationMode === "exploratory" && <div className="note warn" style={{ marginTop: 6 }}>Exploratory: placeholder sizes were used, so physical fit is unverified.</div>}
      </section>
      {!!notes.length && <section className="card"><h2>Notes</h2><ul style={{ marginLeft: 18 }}>{notes.map((n, i) => <li key={i}><code>{n.path}</code>: {n.message}</li>)}</ul></section>}
      <p className="muted">Engine {result.engineVersion} · routing {result.routingPolicy} · layout {result.source.layoutId ?? "local"} r{result.source.revision ?? "–"} · hash {result.source.layoutHash.slice(0, 12)}…</p>
    </div>
  );
}

// A rule in words: DAMPLab rules carry a description; others are spelled
// out from their equipment names (B may be several, any of which counts).
function ruleText(r, result) {
  const rule = result.scenario?.constraints?.find(c => c.id === r.id);
  if (rule?.description) return rule.description;
  const names = new Map(result.equipmentInstances.map(u => [u.equipmentId, u.name ?? u.equipmentId]));
  const [a, b] = r.equipmentIds, bs = [b].flat().map(id => names.get(id) ?? id);
  return `${RULE_LABEL[r.type]}: ${names.get(a) ?? a} / ${bs.length > 1 ? `any of ${bs.join(", ")}` : bs[0]}${r.distanceFt ? ` (${r.distanceFt} ft)` : ""}`;
}

// ---- Zones -------------------------------------------------------------------
// Per-zone totals: every protocol runs in exactly one zone and only uses that
// zone's equipment, so zone totals add up to the lab total.
function zoneRows(result) {
  const plan = result.layout.plan;
  return plan.zones.map(zone => {
    const base = result.baseline.perProtocol.filter(p => p.zoneId === zone.id && !p.inactive);
    const best = result.best.perProtocol.filter(p => p.zoneId === zone.id && !p.inactive);
    const sum = (list, f) => list.reduce((t, p) => t + f(p), 0);
    return {
      zone, benches: zone.benchIds.length, protocols: base.length,
      runs: sum(base, p => p.runsPerPeriod), visits: sum(base, p => p.visits.length * p.runsPerPeriod),
      initial: sum(base, p => p.weightedTravelFt), optimized: sum(best, p => p.weightedTravelFt),
      skipped: result.excludedVisits.filter(x => base.some(p => p.id === x.runId)).length,
      units: result.best.placements.filter(p => p.zoneId === zone.id).length,
    };
  });
}

function ZoneLine({ row, period, optimized }) {
  if (!row) return null;
  return (
    <div className="note info">
      <b>{row.zone.name} zone</b>: {row.protocols} protocol{row.protocols === 1 ? "" : "s"} · {fmt(row.runs)} runs/{period} · {fmt(row.initial, 0)} weighted ft/{period} initially
      {optimized && <> → <b>{fmt(row.optimized, 0)}</b> optimized ({row.initial > 0 ? `${fmt((row.initial - row.optimized) / row.initial * 100)}% less` : "–"})</>}
      {row.skipped > 0 && <> · <span className="bad">{row.skipped} skipped visit{row.skipped === 1 ? "" : "s"}</span></>}
    </div>
  );
}

function ZoneStats({ result, optimized }) {
  const per = result.period ?? "run";
  const rows = zoneRows(result).filter(r => r.protocols || r.units);
  const zoneIds = result.layout.plan.zones.map(z => z.id);
  const total = rows.reduce((t, r) => t + (optimized ? r.optimized : r.initial), 0);
  const max = Math.max(1, ...rows.flatMap(r => [r.initial, r.optimized]));
  const W = 520, rowH = optimized ? 46 : 28, L = 110, R = 80;
  const scale = v => (v / max) * (W - L - R);
  return (
    <section className="card table-wrap">
      <h2>By zone</h2>
      <p className="muted">Each protocol runs in one zone and only uses that zone's equipment (plus shared, zoneless floor items), so the zones add up to the lab total.</p>
      <div className="chart">
        {optimized && <CompareLegend />}
        <svg viewBox={`0 0 ${W} ${rows.length * rowH + 6}`} role="img" aria-label="Weighted walking by zone">
          {rows.map((r, i) => {
            const y = 4 + i * rowH, color = zoneColor(r.zone.id, zoneIds);
            return (
              <g key={r.zone.id}>
                <text x={L - 8} y={y + 15} textAnchor="end" fontSize="12.5" fill="#14161f">{r.zone.name}</text>
                <rect x={L} y={y + 4} width={Math.max(0, scale(r.initial))} height={16} rx={3} fill={color} fillOpacity={optimized ? 0.35 : 1}><title>{`${r.zone.name} initial: ${fmt(r.initial)} ft/${per}`}</title></rect>
                <text x={L + scale(r.initial) + 6} y={y + 16} fontSize="12" fill="#14161f">{fmt(r.initial, 0)} ft</text>
                {optimized && <>
                  <rect x={L} y={y + 22} width={Math.max(0, scale(r.optimized))} height={16} rx={3} fill={color}><title>{`${r.zone.name} optimized: ${fmt(r.optimized)} ft/${per}`}</title></rect>
                  <text x={L + scale(r.optimized) + 6} y={y + 34} fontSize="12" fontWeight="700" fill="#14161f">{fmt(r.optimized, 0)} ft</text>
                </>}
              </g>
            );
          })}
        </svg>
      </div>
      <table className="data">
        <thead><tr><th className="left">Zone</th><th>Benches</th><th>Units placed</th><th>Protocols</th><th>Runs/{per}</th><th>Visits/{per}</th><th>Initial weighted</th>{optimized && <><th>Optimized weighted</th><th>Change</th></>}<th>Share</th><th>Skipped visits</th></tr></thead>
        <tbody>{rows.map(r => {
          const d = r.optimized - r.initial;
          return <tr key={r.zone.id}>
            <td className="left"><span className="swatch box" style={{ background: zoneColor(r.zone.id, zoneIds), marginRight: 6 }} />{r.zone.name}</td>
            <td>{r.benches}</td><td>{r.units}</td><td>{r.protocols}</td><td>{fmt(r.runs)}</td><td>{fmt(r.visits, 0)}</td><td>{fmt(r.initial)}</td>
            {optimized && <><td>{fmt(r.optimized)}</td><td className={d < 0 ? "good" : d > 0 ? "bad" : ""}>{d === 0 ? "–" : `${d > 0 ? "+" : ""}${fmt(d)}${r.initial > 0 ? ` (${fmt(d / r.initial * 100)}%)` : ""}`}</td></>}
            <td>{total > 0 ? `${fmt((optimized ? r.optimized : r.initial) / total * 100)}%` : "–"}</td>
            <td className={r.skipped ? "bad" : ""}>{r.skipped || "–"}</td>
          </tr>;
        })}</tbody>
      </table>
    </section>
  );
}

function copyText(text) {
  try { navigator.clipboard?.writeText(text); } catch { /* clipboard blocked */ }
}

// Before any run: equipment each protocol needs that the lab has, but not in
// the protocol's zone. These are fixed in Cirrus (add the equipment to the
// zone) or by choosing another zone above.
function ZoneGaps({ summaries, zones }) {
  const name = id => zones.find(z => z.id === id)?.name ?? id;
  const gapped = summaries.filter(s => s.include && s.zoneGaps?.length);
  if (!gapped.length) return null;
  const lines = gapped.map(s => `${s.title} (${name(s.zoneId)} zone) needs: ${s.zoneGaps.map(g => `${g.name} [only in ${g.inZones.map(name).join(", ")}]`).join("; ")}`);
  return (
    <div className="note warn" style={{ marginTop: 6 }}>
      <strong>Equipment missing from protocol zones ({gapped.length} protocol{gapped.length === 1 ? "" : "s"})</strong>
      <p style={{ margin: "2px 0" }}>A protocol only uses its own zone's equipment. Add these to the zone in Cirrus, or choose another zone for the protocol.</p>
      <ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <button className="btn small" style={{ marginTop: 6 }} onClick={() => copyText(lines.join("\n"))}>Copy list for Cirrus</button>
    </div>
  );
}

// After a run: the visits that were skipped because the equipment is only in
// another zone, grouped by protocol.
function RunZoneGaps({ result }) {
  const zones = result.layout.plan.zones, name = id => zones.find(z => z.id === id)?.name ?? id;
  const equipmentName = new Map(result.equipmentInstances.map(u => [u.equipmentId, u.name ?? u.equipmentId]));
  const gaps = new Map();
  for (const x of result.excludedVisits) {
    const m = /^not in the (\S+) zone \(only in ([^)]*)\)/.exec(x.reason);
    if (!m) continue;
    const key = x.runId, g = gaps.get(key) ?? gaps.set(key, { protocol: x.protocolName, zone: m[1], items: new Map() }).get(key);
    g.items.set(equipmentName.get(x.equipmentId) ?? x.equipmentId, m[2].split(", ").map(name).join(", "));
  }
  if (!gaps.size) return null;
  const lines = [...gaps.values()].map(g => `${g.protocol} (${name(g.zone)} zone) needs: ${[...g.items].map(([eq, where]) => `${eq} [only in ${where}]`).join("; ")}`);
  return (
    <section className="card">
      <h2>Equipment missing from protocol zones</h2>
      <p className="muted">These visits were skipped: a protocol only uses its own zone's equipment. Add the equipment to the zone in Cirrus (or choose another zone for the protocol) and run again.</p>
      <ul style={{ marginLeft: 18 }}>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <button className="btn small" onClick={() => copyText(lines.join("\n"))}>Copy list for Cirrus</button>
    </section>
  );
}
