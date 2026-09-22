"use client";

// GROUP 6 — OPERATOR COMPONENTS (Product B). C-23 … C-26.
// The governing rule: every widget names a definition, an owner, a threshold
// and a next action. If it cannot name all four, cut it.

import { useState } from "react";
import { BurnSparkline } from "./primitives";
import { fmtCredits, fmtMoney, fmtPct } from "./store";

/* ========================================================================== *
 * C-23  METRIC TILE — all six parts are required; that is the whole point.
 * Delta direction is explicit per metric: churn going up is bad, burn going
 * up is good. Never assume green-is-up.
 * ========================================================================== */
export function MetricTile({
  label, value, format = "number", delta = null,
  deltaDirection = "up-good",         // up-good | up-bad
  series = [], threshold = null, state = "ok",
  owner, definition, action, stale = false, noData = false,
}) {
  const fmt = (v) => {
    if (format === "currency") return fmtMoney(v);
    if (format === "credits") return `${fmtCredits(v)} cr`;
    if (format === "percent") return fmtPct(v, 1);
    if (format === "duration") return `${v}s`;
    return typeof v === "number" ? fmtCredits(v) : v;
  };
  const good = delta == null ? null : deltaDirection === "up-good" ? delta > 0 : delta < 0;
  const deltaCls = delta == null || delta === 0 ? "is-flat" : good ? "is-good" : "is-bad";

  return (
    <div className={`c-tile c-tile--${state} ${noData ? "c-tile--nodata" : ""}`}>
      <span className="c-tile__label">{label}</span>
      <div className="c-tile__row">
        <span className="c-tile__value">{noData ? "not measured yet" : fmt(value)}</span>
        {delta != null && !noData && (
          <span className={`c-tile__delta ${deltaCls}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {format === "percent" ? fmtPct(Math.abs(delta), 1) : fmtCredits(Math.abs(delta))}
          </span>
        )}
      </div>
      {series.length > 1 && !noData && <BurnSparkline series={series} variant="inline" />}
      <div className="c-tile__row">
        <span className={`chip ${state === "ok" ? "chip--green" : state === "warn" ? "chip--amber" : "chip--risk"}`}>
          {state === "ok" ? "ok" : state === "warn" ? "warn" : "breach"}
          {threshold ? ` · ${threshold}` : ""}
        </span>
        {stale && <span className="chip">◔ as of 3 days ago</span>}
      </div>
      {action && <button type="button" className="c-tile__action">{action} →</button>}
      <span className="c-tile__owner">
        owner: {owner} · {definition}
      </span>
    </div>
  );
}

/* ========================================================================== *
 * C-24  GUARDRAIL LIGHT — a pass/fail on something you are never allowed to
 * trade away. Every light is drillable; one that cannot be drilled is
 * decoration. "unknown" must look different from "ok".
 * ========================================================================== */
export function GuardrailLight({ guardrail, onDrill = () => {} }) {
  const { label, value, limit, state, compare, id } = guardrail;
  const shown =
    id === "rationing" || id === "breakage" ? fmtPct(value, 1)
    : id === "surprise" ? value.toFixed(1)
    : fmtCredits(value);
  return (
    <button type="button" className={`c-guardrail c-guardrail--${state}`} onClick={() => onDrill(guardrail)}>
      <span className="c-guardrail__dot" aria-hidden="true" />
      <span className="c-guardrail__name">{label}</span>
      <span className="c-guardrail__val">
        {state === "unknown" ? "not instrumented" : `${shown} · ${compare}`}
      </span>
      <span className="c-guardrail__ch" aria-hidden="true">›</span>
      <span className="sr">{state}</span>
    </button>
  );
}

/* ========================================================================== *
 * C-25  CAPACITY GAUGE — accounts-per-guardian against the three zones that
 * decide whether a guardian makes or loses money. A dedicated guardian serves
 * one account BY DESIGN and must never be shown as "losing money".
 * ========================================================================== */
export function CapacityGauge({
  accounts, breakEven = 17, alertFloor = 50, target = 80, max = 160,
  type = "shared", utilisation = 0, variant = "full", gpPerAccount = 23.72,
}) {
  if (type === "dedicated") {
    const hibernate = utilisation < 0.1;
    return (
      <div className="c-capacity">
        <div className="c-capacity__track">
          <span className="c-capacity__zone--losing" style={{ width: "10%" }} />
          <span className="c-capacity__zone--thin" style={{ width: "30%" }} />
          <span className="c-capacity__zone--healthy" style={{ width: "60%" }} />
          <span className="c-capacity__marker" style={{ left: `${Math.min(utilisation * 100, 100)}%` }} />
        </div>
        <div className="c-capacity__scale"><span>0%</span><span>utilisation</span><span>100%</span></div>
        {variant === "full" && (
          <p className="c-capacity__caption">
            Dedicated — one account by design. {fmtPct(utilisation)} utilised.
            {hibernate ? " Below 10%: a hibernation candidate." : " Utilisation is the measure here, not headcount."}
          </p>
        )}
      </div>
    );
  }

  const zone = accounts < breakEven ? "losing" : accounts < alertFloor ? "thin" : "healthy";
  const pos = Math.min((accounts / max) * 100, 100);
  return (
    <div className={`c-capacity ${variant === "inline" ? "c-capacity--inline" : ""}`}>
      <div className="c-capacity__track">
        <span className="c-capacity__zone--losing" style={{ width: `${(breakEven / max) * 100}%` }} />
        <span className="c-capacity__zone--thin" style={{ width: `${((alertFloor - breakEven) / max) * 100}%` }} />
        <span className="c-capacity__zone--healthy" style={{ width: `${((max - alertFloor) / max) * 100}%` }} />
        <span
          className="c-capacity__be" style={{ left: `${(breakEven / max) * 100}%` }}
          title="Below 17 accounts this guardian costs more than the accounts on it contribute."
        />
        <span className="c-capacity__marker" style={{ left: `${pos}%` }} />
      </div>
      {variant === "full" && (
        <>
          <div className="c-capacity__scale">
            <span>0</span><span>17 break-even</span><span>50 floor</span><span>{target} target</span><span>{max}</span>
          </div>
          <p className="c-capacity__caption">
            {zone === "healthy" && <>{accounts} accounts · healthy · contributes {fmtMoney(gpPerAccount)} per account</>}
            {zone === "thin" && <>{accounts} accounts · thin · below the {alertFloor} alert floor</>}
            {zone === "losing" && <>{accounts} accounts · losing money · below the {breakEven} break-even</>}
          </p>
        </>
      )}
    </div>
  );
}

/* ========================================================================== *
 * C-26  HEALTH CHIP + COMPOSITION PANEL
 * A score nobody can explain is a score nobody uses, so the explanation is
 * part of the component. The panel shows the arithmetic — a reader must be
 * able to add the contributions up and arrive at the score.
 * ========================================================================== */
export const HEALTH_INPUTS = [
  { key: "depth", label: "Burn depth in the healthy band", weight: 0.25, value: 0.2, note: "37%, below the 60–80% band" },
  { key: "go", label: "GO frequency, 4-week trend", weight: 0.25, value: 0.62, note: "12 GOs/week, flat" },
  { key: "scircle", label: "Scircle activity (active members)", weight: 0.15, value: 0.71, note: "5 of 7 active" },
  { key: "payment", label: "Payment health (no dunning)", weight: 0.15, value: 1, note: "no failed charges" },
  { key: "support", label: "Support load (inverse)", weight: 0.1, value: 0.8, note: "1 ticket, 90 days" },
  { key: "seats", label: "Seats active vs seats paid", weight: 0.1, value: 0.71, note: "5 of 7 seats" },
];

export function healthScore(inputs = HEALTH_INPUTS) {
  const total = inputs.reduce((s, i) => s + i.value * i.weight * 100, 0);
  return Math.round(total);
}
export function healthBand(score) {
  if (score >= 80) return { id: "thriving", label: "thriving" };
  if (score >= 60) return { id: "steady", label: "steady" };
  if (score >= 40) return { id: "drifting", label: "drifting" };
  return { id: "risk", label: "at risk" };
}

export function HealthChip({ inputs = HEALTH_INPUTS, trend = "▼", newAccount = false, weightsEdited = false, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (newAccount) {
    return <span className="c-health c-health--new">too new to score · 9 days</span>;
  }
  const score = healthScore(inputs);
  const band = healthBand(score);
  const drag = [...inputs].sort((a, b) => (a.value * a.weight) - (b.value * b.weight))[0];

  return (
    <div style={{ display: "grid", gap: 0, justifyItems: "start" }}>
      <button
        type="button" className={`c-health c-health--${band.id}`} aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {score} · {band.label} <span aria-hidden="true">{trend}</span>
        {weightsEdited && <span className="chip" style={{ height: 18 }}>adjusted</span>}
      </button>

      {open && (
        <div className="c-health__panel">
          <table>
            <caption className="sr">How this score is composed</caption>
            <thead>
              <tr>
                <th scope="col">Input</th>
                <th scope="col" className="ta-r">Value</th>
                <th scope="col" className="ta-r">Weight</th>
                <th scope="col" className="ta-r">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {inputs.map((i) => (
                <tr key={i.key}>
                  <td>{i.label}<br /><span style={{ color: "var(--ink-3)", fontSize: "var(--text-xs)" }}>{i.note}</span></td>
                  <td className="ta-r">{fmtPct(i.value)}</td>
                  <td className="ta-r">{fmtPct(i.weight)}</td>
                  <td className="ta-r">{(i.value * i.weight * 100).toFixed(1)}</td>
                </tr>
              ))}
              <tr className="c-health__total">
                <td>Score</td><td /><td className="ta-r">100%</td><td className="ta-r">{score}</td>
              </tr>
            </tbody>
          </table>
          <div className="c-health__drag">
            <span><b>Biggest drag:</b> {drag.label.toLowerCase()} — {drag.note}. They are paying for credits they are not using.</span>
            <span>Suggested play: the Prime-to-Signal right-size email.</span>
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>
            Weights are editable by the founder role. Every change is written to the audit log.
          </p>
        </div>
      )}
    </div>
  );
}
