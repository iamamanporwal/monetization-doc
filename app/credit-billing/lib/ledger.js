"use client";

// GROUP 3 — LEDGER AND HISTORY. C-10 … C-12.
// "Where did my credits go" is the top support question in every credit
// product. These three exist so it is never asked.

import { useMemo, useState } from "react";
import { CreditValue } from "./primitives";
import { fmtCredits, fmtDate, fmtTime, fmtMoney, RATE } from "./store";

const TYPE_MARK = {
  grant: "↑", spend: "↓", refund: "↺", expiry: "◔", adjustment: "✎", standing: "∞", hold: "◌",
};
const CURRENT_RATE_VERSION = "rc_2026_09_01";

/* ========================================================================== *
 * C-12  RATE VERSION BADGE
 * An old receipt stays true forever even after prices change. This badge is
 * the visible proof of that promise.
 * ========================================================================== */
export function RateVersionBadge({ version, effectiveFrom = "1 September 2026" }) {
  const historical = version && version !== CURRENT_RATE_VERSION;
  return (
    <span
      className={`c-ratebadge ${historical ? "c-ratebadge--historical" : ""}`}
      title={
        historical
          ? `Priced under the rate card in effect on ${effectiveFrom}. Rates have changed since. This charge is unaffected.`
          : "Priced under the current rate card."
      }
    >
      <span aria-hidden="true">⌗</span>
      {historical ? "rate of 1 Aug" : "current rate"}
    </span>
  );
}

/* ========================================================================== *
 * C-10  LEDGER ROW
 * Scannable in bulk, fully explainable on demand. A real <table> — finance
 * people will want to select and copy it.
 * ========================================================================== */
export function LedgerRow({ entry, runningBalance, expandable = true, showBalance = true }) {
  const [open, setOpen] = useState(false);
  const isHold = entry.type === "hold";
  const cls = [
    "c-ledger__row",
    isHold ? "c-ledger__row--hold" : "",
    entry.failed ? "c-ledger__row--failed" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <tr className={cls}>
        <td>
          <span className={`c-ledger__type c-ledger__type--${entry.type}`} title={entry.type} aria-hidden="true">
            {TYPE_MARK[entry.type]}
          </span>
          <span className="sr">{entry.type}</span>
        </td>
        <td className="c-ledger__time">{fmtTime(entry.created_at)}</td>
        <td>
          <span className="c-ledger__reason">
            <span className="c-ledger__reasontext">{entry.reason}</span>
            {entry.tool && <span className="chip">{entry.tool}</span>}
            {entry.model_tier && <span className="chip chip--violet">{entry.model_tier}</span>}
            {entry.disputed && <span className="chip chip--amber">disputed</span>}
            {isHold && <span className="chip chip--amber">hold · not in balance</span>}
          </span>
        </td>
        <td className="is-hidden-mobile c-ledger__time">
          {entry.units != null ? `${entry.units} ${entry.unit_label || ""}` : "—"}
        </td>
        <td className="ta-r">
          {isHold
            ? <CreditValue amount={entry.amount} variant="held" size="sm" />
            : <CreditValue amount={entry.delta} variant="delta" size="sm" />}
        </td>
        {showBalance && (
          <td className="ta-r is-hidden-mobile">
            {isHold ? <span style={{ color: "var(--ink-3)" }}>—</span> : <CreditValue amount={runningBalance} size="sm" state="muted" />}
          </td>
        )}
        <td className="ta-r">
          {expandable && !isHold && (
            <button
              type="button" className="c-ledger__expand" aria-expanded={open}
              aria-label={open ? "Hide detail" : "Show detail"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "▴" : "▾"}
            </button>
          )}
        </td>
      </tr>

      {open && (
        <tr className="c-ledger__detail">
          <td colSpan={showBalance ? 7 : 6}>
            <div className="c-ledger__grid">
              <div><span className="lbl">Tool</span><span>{entry.tool || "—"}{entry.tool_version ? ` v${entry.tool_version}` : ""}</span></div>
              <div><span className="lbl">Model tier</span><span>{entry.model_tier || "no model"}</span></div>
              <div><span className="lbl">Units measured</span><span>{entry.units != null ? `${entry.units} ${entry.unit_label}` : "—"}</span></div>
              <div><span className="lbl">Rate applied</span><span>{entry.units ? `${Math.abs(Math.round(entry.delta / entry.units))} cr / ${entry.unit_label?.replace(/s$/, "")}` : "—"}</span></div>
              <div><span className="lbl">Held vs settled</span><span>{entry.estimate_was ? `${fmtCredits(entry.estimate_was)} → ${fmtCredits(Math.abs(entry.delta))}` : "no hold"}</span></div>
              <div><span className="lbl">Returned</span><span>{entry.released ? `+${fmtCredits(entry.released)} cr` : "—"}</span></div>
              <div><span className="lbl">Authorised by</span><span>{entry.authorised_by || "—"}</span></div>
              <div><span className="lbl">Scircle</span><span>{entry.scircle_id ? entry.scircle_id.replace("sc_", "") : "personal"}</span></div>
              <div><span className="lbl">Paid by</span><span>{entry.payer === "sc_harbour" ? "Harbour pool" : "your wallet"}</span></div>
              <div><span className="lbl">List value</span><span>{fmtMoney(Math.abs(entry.delta) * RATE.listPerCredit)}</span></div>
              <div><span className="lbl">Rate card</span><span><RateVersionBadge version={entry.rate_version} /></span></div>
              <div><span className="lbl">Entry / job</span><span>{entry.id}{entry.job_id ? ` · ${entry.job_id}` : ""}</span></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn--sm">View full receipt</button>
              <button type="button" className="btn btn--sm">Re-run</button>
              <button type="button" className="btn btn--sm btn--ghost">Dispute</button>
              {entry.failed && <span className="chip chip--green">refunded in full · le_219</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ========================================================================== *
 * C-11  FILTER BAR — filters apply live, no Apply button. No-results copy
 * names the filters rather than saying "nothing found".
 * ========================================================================== */
const FACETS = [
  { key: "type", label: "Type", options: ["spend", "grant", "refund", "expiry", "adjustment", "standing"] },
  { key: "tool", label: "Tool", options: ["capture.transcribe", "capture.render", "guardian.run", "cerebral.analyse", "surface.standing"] },
  { key: "model_tier", label: "Model", options: ["swift", "standard", "deep", "cinematic"] },
  { key: "scircle_id", label: "Scircle", options: ["sc_harbour", "sc_ridge"] },
  { key: "authorised_by", label: "Person", options: ["aman", "priya", "system", "support"] },
];

export function FilterBar({ active, onChange, resultCount, total, savedViews = [], onSave }) {
  const anyActive = Object.values(active).some(Boolean) || active.q;
  return (
    <div className="c-filter">
      <input
        className="c-filter__search" type="search" placeholder="Search reasons, tools, job ids"
        aria-label="Search the ledger"
        value={active.q || ""}
        onChange={(e) => onChange({ ...active, q: e.target.value })}
      />
      {FACETS.map((f) => (
        <select
          key={f.key}
          className={`c-filter__facet ${active[f.key] ? "is-active" : ""}`}
          aria-label={f.label}
          value={active[f.key] || ""}
          onChange={(e) => onChange({ ...active, [f.key]: e.target.value || null })}
        >
          <option value="">{f.label}: any</option>
          {f.options.map((o) => <option key={o} value={o}>{o.replace("sc_", "")}</option>)}
        </select>
      ))}
      <select
        className={`c-filter__facet ${active.view ? "is-active" : ""}`}
        aria-label="Saved views"
        value={active.view || ""}
        onChange={(e) => {
          const v = savedViews.find((s) => s.name === e.target.value);
          onChange(v ? { ...v.filters, view: v.name } : { q: "" });
        }}
      >
        <option value="">Saved views</option>
        {savedViews.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
      </select>
      {anyActive && (
        <>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onSave}>Save this view</button>
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => onChange({ q: "" })}>Clear</button>
        </>
      )}
      <span className="c-filter__count">
        {anyActive ? `${resultCount} of ${total} entries` : `${total} entries`}
      </span>
    </div>
  );
}

export function filterLedger(rows, active) {
  const q = (active.q || "").trim().toLowerCase();
  return rows.filter((e) => {
    if (active.type && e.type !== active.type) return false;
    if (active.tool && e.tool !== active.tool) return false;
    if (active.model_tier && e.model_tier !== active.model_tier) return false;
    if (active.scircle_id && e.scircle_id !== active.scircle_id) return false;
    if (active.authorised_by && e.authorised_by !== active.authorised_by) return false;
    if (q) {
      const hay = `${e.reason} ${e.tool || ""} ${e.job_id || ""} ${e.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function describeFilters(active) {
  const parts = [];
  if (active.type) parts.push(`Type: ${active.type}`);
  if (active.tool) parts.push(`Tool: ${active.tool}`);
  if (active.model_tier) parts.push(`Model: ${active.model_tier}`);
  if (active.scircle_id) parts.push(`Scircle: ${active.scircle_id.replace("sc_", "")}`);
  if (active.authorised_by) parts.push(`Person: ${active.authorised_by}`);
  if (active.q) parts.push(`"${active.q}"`);
  return parts.join(" + ");
}

/* U3.3 — the ledger screen. The pending hold is pinned at the top and
 * excluded from the running balance. */
export function LedgerTable({ entries, holds = [], openingBalance, loading = false, active = {}, onChange }) {
  const withBalance = useMemo(() => {
    // Newest first on screen; the running balance walks backwards from the
    // current derived balance, so every row shows the balance after itself.
    let bal = openingBalance;
    return entries.map((e) => {
      const row = { entry: e, balance: bal };
      bal = bal - e.delta;
      return row;
    });
  }, [entries, openingBalance]);

  const days = [];
  withBalance.forEach((r) => {
    const key = r.entry.created_at.slice(0, 10);
    const last = days[days.length - 1];
    if (!last || last.key !== key) days.push({ key, rows: [r] });
    else last.rows.push(r);
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {onChange && (
        <FilterBar
          active={active} onChange={onChange} resultCount={entries.length} total={12}
          savedViews={[
            { name: "Renders, this month", filters: { tool: "capture.render" } },
            { name: "Hosting only", filters: { type: "standing" } },
          ]}
          onSave={() => {}}
        />
      )}
      <div className="card tablewrap" style={{ padding: 0 }}>
        <table className="c-ledger">
          <caption className="sr">Credit ledger, newest first</caption>
          <thead>
            <tr>
              <th scope="col"><span className="sr">Type</span></th>
              <th scope="col">Time</th>
              <th scope="col">What</th>
              <th scope="col" className="is-hidden-mobile">Measured</th>
              <th scope="col" className="ta-r">Change</th>
              <th scope="col" className="ta-r is-hidden-mobile">Balance</th>
              <th scope="col"><span className="sr">Detail</span></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr className="c-ledger__skel" key={i}>
                    <td colSpan={7}><i /></td>
                  </tr>
                ))
              : (
                <>
                  {holds.map((h) => (
                    <LedgerRow key={h.id} entry={{ ...h, type: "hold" }} expandable={false} />
                  ))}
                  {days.map((d) => (
                    <Fragmentish key={d.key} dayKey={d.key} rows={d.rows} />
                  ))}
                </>
              )}
          </tbody>
        </table>
        {!loading && entries.length === 0 && (
          <div className="c-filter__empty">
            <p>No entries match {describeFilters(active) || "these filters"}.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn--sm" onClick={() => onChange && onChange({ q: "" })}>Clear filters</button>
              <button type="button" className="btn btn--sm btn--ghost">Widen to all of September</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Fragmentish({ dayKey, rows }) {
  return (
    <>
      <tr className="c-ledger__day">
        <td colSpan={7}>{fmtDate(dayKey, { weekday: true })}</td>
      </tr>
      {rows.map((r) => (
        <LedgerRow key={r.entry.id} entry={r.entry} runningBalance={r.balance} />
      ))}
    </>
  );
}
