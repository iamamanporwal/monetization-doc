"use client";

// GROUP 5 — SHARED MONEY (SCIRCLES). C-19 … C-22.
// Nobody in this market has built this well. It is HERE's opening.

import { useId, useState } from "react";
import { CreditValue, FuelGauge } from "./primitives";
import { fmtCredits, fmtMoney, creditsToFiat } from "./store";

/* ========================================================================== *
 * C-19  SHARED POOL GAUGE
 * Per-member spend is visible to every member. A shared pool with invisible
 * spending becomes an argument — transparency here prevents conflict, so the
 * copy is "who's been building", never an accusation.
 * ========================================================================== */
export function SharedPoolGauge({ scircle, members, capState = "auto", canRaiseCap = true }) {
  const used = scircle.pool_cap - scircle.pool_remaining;
  const pct = scircle.pool_cap ? used / scircle.pool_cap : 0;
  const single = members.length <= 1;
  const state =
    capState !== "auto" ? capState
    : !scircle.pool_cap ? "no-cap"
    : pct >= 1 ? "at-cap"
    : pct > 0.8 ? "approaching"
    : "default";
  const totalBurn = members.reduce((s, m) => s + m.burned_this_cycle, 0) || 1;

  return (
    <div className="card c-pool">
      <div className="c-pool__head">
        <div>
          <strong style={{ fontSize: 15 }}>
            {scircle.pool_cap
              ? <>{fmtCredits(scircle.pool_remaining)} of {fmtCredits(scircle.pool_cap)} cr left in {scircle.name}</>
              : <>{fmtCredits(scircle.pool_remaining)} cr in {scircle.name} · no cap set</>}
          </strong>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
            {scircle.members} members · {fmtMoney(creditsToFiat(scircle.pool_remaining))} of list value
            {scircle.approval_threshold ? ` · anything over ${fmtCredits(scircle.approval_threshold)} cr needs an approver` : " · no approval threshold"}
          </p>
        </div>
        <CreditValue amount={scircle.pool_remaining} variant="withCurrency" size="lg" stack />
      </div>

      <FuelGauge
        remaining={scircle.pool_remaining}
        total={scircle.pool_cap || scircle.pool_remaining}
        variant="bar"
        capMarker={scircle.pool_cap ? scircle.pool_cap * 0.8 : null}
        tone={state === "at-cap" ? "risk" : state === "approaching" ? "warn" : "auto"}
        label={`${fmtCredits(scircle.pool_remaining)} of ${fmtCredits(scircle.pool_cap)} credits left in ${scircle.name}`}
      />

      {!single && (
        <>
          <span className="lbl">Who&rsquo;s been building, this cycle</span>
          <div className="c-pool__strip" aria-hidden="true">
            {members.map((m) => (
              <i key={m.id} style={{ flex: Math.max(m.burned_this_cycle, 1), background: m.colour }} />
            ))}
          </div>
          <div className="c-pool__legend">
            {members.map((m) => (
              <span key={m.id}>
                <span className="c-pool__sw" style={{ background: m.colour }} />
                {m.name} <span className="num">{fmtCredits(m.burned_this_cycle)}</span>
              </span>
            ))}
          </div>
        </>
      )}

      {state === "approaching" && (
        <p className="c-pool__note" style={{ color: "var(--amber)" }}>
          {scircle.name} is at {Math.round(pct * 100)}% of its cap. Spending still works; at 100% it stops.
        </p>
      )}
      {state === "at-cap" && (
        <div className="c-pool__note" style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--risk)" }}>
          <span>{scircle.name} is at its cap. Pool spending is blocked; personal wallets still work.</span>
          {canRaiseCap && <button type="button" className="btn btn--sm btn--primary">Raise the cap</button>}
        </div>
      )}
      {state === "no-cap" && (
        <p className="c-pool__note"><button type="button" className="c-tile__action">Set a cap →</button></p>
      )}
    </div>
  );
}

/* ========================================================================== *
 * C-20  PAYER PICKER
 * Never silently default to whoever clicked. Charging a shared pool by
 * accident is a social problem, not just a billing one.
 * ========================================================================== */
export function PayerPicker({
  personal, pool, estimate, selected = "personal", onSelect = () => {},
  sponsor = null,              // { name, allowed:false }
}) {
  const [split, setSplit] = useState({ me: 60, pool: 40 });
  const poolShort = pool && pool.remaining < estimate;
  const sum = split.me + split.pool;

  return (
    <div className="c-payer" role="radiogroup" aria-label="Who pays for this">
      <span className="lbl">Who pays</span>
      <div className="c-payer__row">
        <button
          type="button" role="radio" aria-checked={selected === "personal"}
          className={`c-payer__opt ${selected === "personal" ? "is-selected" : ""}`}
          onClick={() => onSelect("personal")}
        >
          <span className="c-payer__name">My credits</span>
          <span className="c-payer__amt">{fmtCredits(personal)} cr</span>
        </button>

        <button
          type="button" role="radio" aria-checked={selected === "pool"}
          aria-disabled={poolShort || undefined}
          className={`c-payer__opt ${selected === "pool" ? "is-selected" : ""} ${poolShort ? "is-disabled" : ""}`}
          onClick={() => !poolShort && onSelect("pool")}
        >
          <span className="c-payer__name">{pool.name} pool</span>
          <span className="c-payer__amt">
            {fmtCredits(pool.remaining)} cr
            {poolShort ? ` · ${fmtCredits(estimate - pool.remaining)} short` : ""}
          </span>
        </button>

        <button
          type="button" role="radio" aria-checked={selected === "split"}
          className={`c-payer__opt ${selected === "split" ? "is-selected" : ""}`}
          onClick={() => onSelect("split")}
        >
          <span className="c-payer__name">Split</span>
          <span className="c-payer__amt">between wallets</span>
        </button>
      </div>

      {selected === "pool" && pool.approval_threshold != null && estimate > pool.approval_threshold && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--amber)" }}>
          Over {pool.name}&rsquo;s {fmtCredits(pool.approval_threshold)} cr threshold — this becomes a request, not a charge.
        </p>
      )}

      {sponsor && !sponsor.allowed && (
        <div className="c-payer__opt is-disabled" style={{ cursor: "default" }}>
          <span className="c-payer__name">{sponsor.name}&rsquo;s wallet</span>
          <span className="c-payer__amt">{sponsor.name} hasn&rsquo;t allowed this yet</span>
          <button type="button" className="btn btn--sm" style={{ marginTop: 6, width: "fit-content" }}>Ask {sponsor.name}</button>
        </div>
      )}

      {selected === "split" && (
        <div className="c-payer__split">
          <div className="c-payer__splitrow">
            <label htmlFor="sp-me">My credits</label>
            <input
              id="sp-me" type="number" min={0} max={100} value={split.me}
              onChange={(e) => setSplit({ ...split, me: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="c-payer__splitrow">
            <label htmlFor="sp-pool">{pool.name} pool</label>
            <input
              id="sp-pool" type="number" min={0} max={100} value={split.pool}
              onChange={(e) => setSplit({ ...split, pool: Number(e.target.value) || 0 })}
            />
          </div>
          <p className={sum === 100 ? "c-payer__amt" : "c-payer__err"} aria-live="polite">
            {sum === 100
              ? `${fmtCredits(Math.round(estimate * split.me / 100))} cr from you, ${fmtCredits(Math.round(estimate * split.pool / 100))} cr from ${pool.name}`
              : `Shares add up to ${sum}%. They need to make 100%.`}
          </p>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== *
 * C-21  APPROVAL CARD — a decline without a reason is just friction, so a
 * reason is required. The ledger records both requester and approver.
 * ========================================================================== */
const DECLINE_REASONS = ["too expensive", "not now", "wrong approach", "I'll do it myself"];

export function ApprovalCard({
  requester, initials, what, estimate, note, waiting, state = "pending",
  approvedBy, declineReason, onApprove = () => {}, onDecline = () => {},
}) {
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  const [free, setFree] = useState("");
  const id = useId();

  return (
    <div className={`c-approval c-approval--${state}`}>
      <div className="c-approval__head">
        <span className="c-approval__av" aria-hidden="true">{initials}</span>
        <div style={{ flex: 1 }}>
          <p className="c-approval__what">{requester} wants to run {what}</p>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--ink-3)" }}>
            {state === "expired" ? "expired after 24h — auto-declined, and they were told"
              : state === "approved" ? `approved by ${approvedBy}`
              : state === "declined" ? `declined — ${declineReason}`
              : `waiting ${waiting}`}
          </p>
        </div>
        <CreditValue amount={estimate} variant="withCurrency" size="lg" stack />
      </div>

      {note && <p className="c-approval__quote">&ldquo;{note}&rdquo;</p>}

      {state === "pending-urgent" && <span className="chip chip--amber">waiting {waiting} — over 4 hours</span>}

      {(state === "pending" || state === "pending-urgent") && !showDecline && (
        <div className="c-approval__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={onApprove}>Approve</button>
          <button type="button" className="btn btn--sm" onClick={() => setShowDecline(true)}>Decline</button>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)", alignSelf: "center" }}>
            Approving creates the hold and starts the job. The ledger records you both.
          </span>
        </div>
      )}

      {showDecline && (
        <div className="c-approval__reasons">
          <span className="lbl">Why? {requester} sees this</span>
          {DECLINE_REASONS.map((r) => (
            <label key={r}>
              <input type="radio" name={id} checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
          <textarea
            aria-label="Anything to add" placeholder="Anything to add (optional)"
            value={free} onChange={(e) => setFree(e.target.value)}
          />
          <div className="c-approval__actions">
            <button type="button" className="btn btn--sm" onClick={() => onDecline({ reason, free })}>Send decline</button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setShowDecline(false)}>Back</button>
          </div>
        </div>
      )}

      {state === "self" && <span className="chip">you asked for this · waiting on Tomas</span>}
      {state === "expired" && <div className="c-approval__actions"><button type="button" className="btn btn--sm">Ask again</button></div>}
    </div>
  );
}

/* ========================================================================== *
 * C-22  SPEND ROLE MATRIX — deliberately separate from the social role. Being
 * a member of a world is not the same as being allowed to spend its credits.
 * ========================================================================== */
const ROLES = [
  { id: "observer", caps: [true, false, false, false] },
  { id: "spender", caps: [true, true, false, false] },
  { id: "approver", caps: [true, true, true, false] },
  { id: "payer", caps: [true, true, true, true] },
];
const CAPS = ["see spend", "spend pool", "approve", "change caps"];

export function SpendRoleMatrix({ variant = "editor", value = "spender", onChange = () => {}, member = "Priya", pool }) {
  if (variant === "compact") {
    return (
      <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
        <label className="lbl" htmlFor="role-pick">Spend role in {pool?.name || "Harbour"}</label>
        <select
          id="role-pick" className="c-filter__facet" style={{ height: 36 }}
          value={value} onChange={(e) => onChange(e.target.value)}
        >
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}
        </select>
        <p className="c-roles__consent">
          {value === "observer"
            ? `${member} will see what Harbour spends, and will not be able to spend it.`
            : `${member} will be able to spend from Harbour's pool (${fmtCredits(pool?.pool_remaining ?? 8420)} cr left).`}
          {value === "approver" && ` ${member} will also approve other people's requests.`}
          {value === "payer" && ` ${member} will also be able to change the cap.`}
        </p>
      </div>
    );
  }

  return (
    <div className="card tablewrap" style={{ padding: 0 }}>
      <table className="c-roles">
        <caption className="sr">Spend roles and capabilities</caption>
        <thead>
          <tr>
            <th scope="col">Role</th>
            {CAPS.map((c) => <th key={c} scope="col" className="ta-c">{c}</th>)}
            {variant === "editor" && <th scope="col" className="ta-c">Priya</th>}
          </tr>
        </thead>
        <tbody>
          {ROLES.map((r) => (
            <tr key={r.id}>
              <td className="c-roles__role">{r.id}</td>
              {r.caps.map((ok, i) => (
                <td key={i} className="ta-c">
                  <span className={ok ? "c-roles__yes" : "c-roles__no"}>{ok ? "yes" : "no"}</span>
                </td>
              ))}
              {variant === "editor" && (
                <td className="ta-c">
                  <input
                    type="radio" name="role-matrix" aria-label={`Make Priya a ${r.id}`}
                    checked={value === r.id} onChange={() => onChange(r.id)} disabled={variant === "read-only"}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
