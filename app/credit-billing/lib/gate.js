"use client";

// GROUP 2 — THE GATE. C-05 … C-09.
// C-05 is the signature of the product: nothing paid ever runs without one.

import { useEffect, useId, useRef, useState } from "react";
import { CreditValue, FuelGauge } from "./primitives";
import { RATE, creditsToFiat, fmtCredits, fmtMoney, fmtDate } from "./store";

/* ========================================================================== *
 * C-06  MODEL TIER PICKER
 * Shows the cost for THIS job on each tier. "75 cr" is actionable; "x2.5" is
 * homework. The multipliers track cost exactly, so free choice costs us
 * nothing — which is why this can be genuinely open.
 * ========================================================================== */
export function ModelTierPicker({
  baseCost,                 // cost at Standard (multiplier 1)
  selected = "standard",
  recommended = "standard",
  disabled = [],
  loading = false,
  onSelect = () => {},
  name = "tier",
}) {
  const group = useId();
  const tiers = RATE.tiers;
  const idx = tiers.findIndex((t) => t.id === selected);

  const onKey = (e) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    for (let step = 1; step <= tiers.length; step++) {
      const next = tiers[(idx + dir * step + tiers.length * 2) % tiers.length];
      if (!disabled.includes(next.id)) return onSelect(next.id);
    }
  };

  return (
    <div className="c-tierpicker" role="radiogroup" aria-label="Model tier" onKeyDown={onKey}>
      {tiers.map((t) => {
        const off = disabled.includes(t.id);
        const cost = Math.round(baseCost * t.multiplier);
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected === t.id}
            aria-disabled={off || undefined}
            tabIndex={selected === t.id ? 0 : -1}
            className={`c-tier ${selected === t.id ? "is-selected" : ""} ${off ? "is-disabled" : ""}`}
            onClick={() => !off && onSelect(t.id)}
            title={off ? "Studio and above" : undefined}
            name={name}
          >
            {recommended === t.id && <span className="c-tier__rec">recommended</span>}
            <span className="c-tier__name">{off ? "🔒 " : ""}{t.name}</span>
            <span className="c-tier__blurb">{t.blurb}</span>
            <span className="c-tier__cost">{loading ? "—" : `${fmtCredits(cost)} cr`}</span>
            <span className="c-tier__mult">×{t.multiplier}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ========================================================================== *
 * C-05a  INSTANT — a chip, never a dialog.
 * Interrupting someone to approve 3 credits is worse than the charge.
 * ========================================================================== */
export function InstantChip({ sessionTotal, actions = [], paused = false, onPause = () => {}, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
      <button
        type="button"
        className={`c-go c-go--instant ${paused ? "is-paused" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="dot" aria-hidden="true" />
        <span className="num" aria-live="polite" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
          {paused ? "metered actions paused" : `${fmtCredits(sessionTotal)} cr this session`}
        </span>
        <span aria-hidden="true" style={{ color: "var(--ink-3)" }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="c-go__popover" role="group" aria-label="This session">
          <strong style={{ fontSize: "var(--text-sm)" }}>This session</strong>
          {actions.map((a, i) => (
            <div className="c-go__poprow" key={i}>
              <span>{a.what} · {a.tier}</span>
              <CreditValue amount={a.cost} size="sm" />
            </div>
          ))}
          <div className="c-go__poprow" style={{ color: "var(--ink)", fontWeight: 600 }}>
            <span>Session total</span>
            <CreditValue amount={sessionTotal} size="sm" />
          </div>
          <label className="c-go__remember">
            <input type="checkbox" checked={paused} onChange={(e) => onPause(e.target.checked)} />
            Pause metered actions
          </label>
          <button type="button" className="btn btn--sm btn--ghost">See the full ledger</button>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== *
 * C-05b  JOB — the canonical GO card.
 * What will happen, which model, what it costs, and the worst case. Cancel is
 * a real button of equal weight. There is no dark pattern in this component.
 * ========================================================================== */
export function GoCard({
  tool, version, headline, detail,
  baseCost,                       // cost at Standard
  unitNote,
  balance,
  held = 0,
  rate = RATE.listPerCredit,
  scircle = null,                  // { name, pool_remaining, approval_threshold }
  approver = null,
  payerPicker = null,             // a <PayerPicker/> element, when a pool exists
  rememberEligible = true,
  disabledTiers = [],
  loadingEstimate = false,
  onGo = () => {},
  onCancel = () => {},
  autoFocus = true,
}) {
  const [tier, setTier] = useState("standard");
  const [cap, setCap] = useState(null);
  const [remember, setRemember] = useState(false);
  const titleRef = useRef(null);
  const cardRef = useRef(null);
  const titleId = useId();

  const mult = RATE.tiers.find((t) => t.id === tier)?.multiplier ?? 1;
  const estimate = Math.round(baseCost * mult);
  const band = [Math.round(estimate * 0.9), Math.round(estimate * 1.13)];
  const hold = Math.round(estimate * 1.2);
  // The cap defaults to ceil(estimate * 1.5), rounded to something friendly.
  const defaultCap = Math.max(Math.ceil((estimate * 1.5) / 10) * 10, 10);
  const effectiveCap = cap ?? defaultCap;
  const overCap = estimate > effectiveCap;
  const available = balance - held;
  const short = available < hold;
  const needsApproval =
    scircle?.approval_threshold != null && estimate > scircle.approval_threshold;

  // Focus starts on the headline, never on GO — Enter must not be an
  // accidental purchase. Escape closes. Focus is trapped.
  useEffect(() => {
    if (autoFocus) titleRef.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onCancel(); }
      if (e.key !== "Tab" || !cardRef.current) return;
      const f = cardRef.current.querySelectorAll(
        'button:not([disabled]),input,select,[tabindex]:not([tabindex="-1"])'
      );
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const node = cardRef.current;
    node?.addEventListener("keydown", onKey);
    return () => node?.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="c-go c-go--job" role="dialog" aria-modal="true" aria-labelledby={titleId}
      ref={cardRef}
    >
      <p className="c-go__eyebrow">{tool} v{version}</p>
      <h2 className="c-go__title" id={titleId} tabIndex={-1} ref={titleRef}>{headline}</h2>
      <p className="c-go__detail">{detail}</p>

      <ModelTierPicker
        baseCost={baseCost}
        selected={tier}
        recommended="standard"
        disabled={disabledTiers}
        loading={loadingEstimate}
        onSelect={setTier}
      />

      {payerPicker}

      <div className="c-go__estimate">
        {loadingEstimate ? (
          <div className="c-go__skel" style={{ width: "100%" }} />
        ) : (
          <>
            <CreditValue amount={estimate} variant="estimate" size="lg" />
            <span className="c-go__band">
              between {fmtCredits(band[0])} and {fmtCredits(band[1])} · {fmtMoney(creditsToFiat(estimate, rate))}
            </span>
          </>
        )}
      </div>

      <div className={`c-go__cap ${overCap ? "is-over" : ""}`}>
        <div>
          <label htmlFor="go-cap" style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
            Stop at
          </label>
          <p className="c-go__caphint">We&rsquo;ll stop rather than go past this.</p>
        </div>
        <div className="c-stepper">
          <button type="button" aria-label="Lower the cap" onClick={() => setCap(Math.max(effectiveCap - 10, 10))}>−</button>
          <span className="c-stepper__val" id="go-cap" aria-live="polite">{fmtCredits(effectiveCap)} cr</span>
          <button type="button" aria-label="Raise the cap" onClick={() => setCap(effectiveCap + 10)}>+</button>
        </div>
      </div>

      <p className="c-go__balance">
        You have {fmtCredits(available)} cr. After this, about {fmtCredits(available - estimate)}.
        {unitNote ? ` ${unitNote}` : ""}
      </p>

      {needsApproval && (
        <p className="c-go__note">
          Over Harbour&rsquo;s {fmtCredits(scircle.approval_threshold)} cr threshold.
          {approver ? ` ${approver} can approve it.` : ""}
        </p>
      )}
      {short && !needsApproval && (
        <p className="c-go__note">
          This needs a {fmtCredits(hold)} cr hold. You have {fmtCredits(available)} available.
        </p>
      )}

      {rememberEligible && (
        <label className="c-go__remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Don&rsquo;t ask again under 100 cr for this tool
        </label>
      )}

      <div className="c-go__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        <button
          type="button" className="btn btn--primary"
          disabled={loadingEstimate}
          onClick={() => onGo({ tier, estimate, cap: effectiveCap, hold, remember, short, needsApproval })}
        >
          {needsApproval ? "Request approval"
            : overCap ? `GO — will stop at ${fmtCredits(effectiveCap)} cr`
            : "GO"}
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * C-05c  STANDING — cannot be authorised without a budget, an expiry and a
 * stop condition. It stops by default rather than continuing by default.
 * ========================================================================== */
export function StandingGoCard({
  tool, version, headline, detail, ratePerUnit, unitLabel, balance,
  onStart = () => {}, onCancel = () => {},
}) {
  const [budget, setBudget] = useState(2000);
  const [expiry, setExpiry] = useState("2026-10-04");
  const [stops, setStops] = useState({ budget: true, date: true, source: false, manual: false });
  const titleId = useId();
  const anyStop = Object.values(stops).some(Boolean);
  const days = Math.max(Math.floor(budget / (ratePerUnit * 22)), 1);

  return (
    <div className="c-go c-go--standing" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <p className="c-go__eyebrow">{tool} v{version}</p>
      <h2 className="c-go__title" id={titleId} tabIndex={-1}>{headline}</h2>
      <p className="c-go__detail">{detail} · {fmtCredits(ratePerUnit)} cr per {unitLabel}</p>

      <div className="c-go__field">
        <label htmlFor="st-budget">Spend up to</label>
        <input
          id="st-budget" type="number" min={100} step={100} value={budget}
          onChange={(e) => setBudget(Math.max(Number(e.target.value) || 0, 0))}
        />
      </div>

      <div className="c-go__field">
        <label htmlFor="st-exp">Stop on</label>
        <input
          id="st-exp" type="date" value={expiry} max="2026-12-19"
          onChange={(e) => setExpiry(e.target.value)}
        />
      </div>

      <div className="c-go__stops" role="group" aria-label="Stop when">
        <span className="lbl">Stop when — at least one</span>
        {[
          ["budget", "the budget is used up"],
          ["date", "the date passes"],
          ["source", "the source broadcast ends"],
          ["manual", "I stop it manually"],
        ].map(([k, text]) => (
          <label key={k}>
            <input
              type="checkbox" checked={stops[k]}
              onChange={(e) => setStops({ ...stops, [k]: e.target.checked })}
            />
            {text}
          </label>
        ))}
      </div>

      <p className="c-go__balance">
        At the current rate that&rsquo;s about {days} day{days === 1 ? "" : "s"}.
        Budget is {fmtMoney(creditsToFiat(budget))} of your {fmtCredits(balance)} cr.
      </p>
      {!anyStop && <p className="c-go__note">Pick at least one stop condition. A standing job never runs open-ended.</p>}

      <div className="c-go__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        <button
          type="button" className="btn btn--primary" disabled={!anyStop || budget <= 0}
          onClick={() => onStart({ budget, expiry, stops })}
        >
          Start
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * C-07  LIVE METER — turns waiting into watching, and makes the cap real.
 * Cancel actually cancels, and settles ONLY what was measured.
 * ========================================================================== */
export function LiveMeter({
  headline, tool, unitsDone, unitsEstimate, unitLabel, creditsSoFar, cap,
  elapsedSeconds = 0, state = "counting", onStop = () => {},
}) {
  const pct = cap > 0 ? Math.min((creditsSoFar / cap) * 100, 100) : 0;
  const near = pct >= 80 && pct < 100;
  const at = pct >= 100;
  const mod = state === "at-cap" || at ? "at" : state === "near-cap" || near ? "near" : "";
  const mm = Math.floor(elapsedSeconds / 60);
  const ss = String(Math.floor(elapsedSeconds % 60)).padStart(2, "0");

  return (
    <div className={`card c-meter ${mod ? `c-meter--${mod}` : ""}`}>
      <div className="c-meter__head">
        <div>
          <p className="c-go__eyebrow">{tool}</p>
          <strong style={{ fontSize: 15 }}>{headline}</strong>
        </div>
        <CreditValue amount={creditsSoFar} size="lg" />
      </div>

      <div className="c-meter__rail">
        <div
          className={`c-meter__bar ${state === "starting" ? "is-indeterminate" : ""}`}
          style={state === "starting" ? undefined : { width: `${pct}%` }}
        />
      </div>

      <div className="c-meter__stats">
        <span>
          {state === "starting"
            ? "Starting…"
            : `${unitsDone.toFixed(1)} of about ${unitsEstimate} ${unitLabel}`}
        </span>
        <span aria-live="polite" aria-atomic="true">{fmtCredits(creditsSoFar)} cr so far</span>
        <span>{mm}:{ss} elapsed</span>
        <span style={{ color: "var(--ink-3)" }}>cap {fmtCredits(cap)} cr</span>
      </div>

      {state === "cancelling" && (
        <p className="c-meter__note">Stopping… you&rsquo;ll only pay for what we measured.</p>
      )}
      {(near || state === "near-cap") && state !== "cancelling" && (
        <p className="c-meter__note">Approaching your {fmtCredits(cap)} cr cap.</p>
      )}
      {(at || state === "at-cap") && (
        <p className="c-meter__note">Stopped itself at your {fmtCredits(cap)} cr cap. Settling what we measured.</p>
      )}

      <div>
        <button type="button" className="btn btn--sm" onClick={onStop} disabled={state === "cancelling"}>
          Stop
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * C-08  SETTLE RECEIPT — the moment trust is built or lost. Always state all
 * three numbers: held, used, returned.
 * ========================================================================== */
const OUTCOME = {
  completed: { mark: "✓", cls: "completed" },
  partial: { mark: "!", cls: "partial" },
  failed: { mark: "×", cls: "failed" },
};

export function SettleReceipt({
  outcome = "completed", held, used, returned, balanceAfter, headline, jobId,
  variant = "panel", measuredNote, onRetry, onReceipt, onDismiss,
}) {
  const o = OUTCOME[outcome];
  const title =
    outcome === "completed"
      ? `Done. We held ${fmtCredits(held)}, it used ${fmtCredits(used)}. You keep ${fmtCredits(returned)}.`
      : outcome === "partial"
      ? `Stopped at your cap. You paid for the ${measuredNote} we measured — ${fmtCredits(used)} cr. The rest of the hold is back.`
      : `This failed on our end. You weren't charged. The ${fmtCredits(held)} cr hold is back in your balance.`;

  return (
    <div className={`c-settle c-settle--${o.cls} ${variant === "toast" ? "c-settle--toast" : ""}`} role="status">
      <div className="c-settle__head">
        <span className={"c-settle__mark"} aria-hidden="true">{o.mark}</span>
        <div>
          <p className="c-settle__title">{title}</p>
          {headline && <p className="c-settle__sub">{headline}{jobId ? ` · ${jobId}` : ""}</p>}
        </div>
      </div>

      <div className="c-settle__flow">
        <div className="c-settle__cell">
          <span className="lbl">Held</span>
          <CreditValue amount={held} size="md" />
        </div>
        <div className="c-settle__cell">
          <span className="lbl">Used</span>
          <CreditValue amount={outcome === "failed" ? 0 : used} size="md" />
        </div>
        <div className="c-settle__cell">
          <span className="lbl">Returned</span>
          <CreditValue amount={outcome === "failed" ? held : returned} variant="delta" size="md" />
        </div>
      </div>

      <p className="c-settle__sub">Balance {fmtCredits(balanceAfter)} cr</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {outcome === "failed" && (
          <button type="button" className="btn btn--sm btn--primary" onClick={onRetry}>Try again — free</button>
        )}
        {onReceipt && <button type="button" className="btn btn--sm" onClick={onReceipt}>See receipt</button>}
        {onDismiss && <button type="button" className="btn btn--sm btn--ghost" onClick={onDismiss}>Dismiss</button>}
      </div>
    </div>
  );
}

/* ========================================================================== *
 * C-09  INSUFFICIENT CREDITS SHEET — the revenue moment, handled honestly.
 * This sheet NEVER charges automatically.
 * ========================================================================== */
export function InsufficientSheet({
  needed, available, heldByJobs = 0,
  swiftCost, trimCost = null, trimNote,
  topup = { credits: 2500, price: 25, rate: 0.0095 },
  compare = { plan: "Studio", rate: 0.0085, saving: 2.5 },
  slowLane = null,               // { queuePosition }
  autoRecharge = null,           // { amount, price }
  pool = null,                   // { name, remaining }
  onTopUp = () => {}, onSwift = () => {}, onTrim = () => {},
  onSlowLane = () => {}, onPool = () => {}, onCancel = () => {}, onConfirmAuto = () => {},
}) {
  const gap = Math.max(needed - available, 0);
  const titleId = useId();
  return (
    <div className="c-short" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div>
        <h2 className="c-short__title" id={titleId} tabIndex={-1}>
          You&rsquo;re {fmtCredits(gap)} credit{gap === 1 ? "" : "s"} short.
        </h2>
        <p className="c-short__sub">
          This needs about {fmtCredits(needed)} cr. You have {fmtCredits(available)} available.
        </p>
        {heldByJobs > 0 && (
          <p className="c-short__sub" style={{ color: "var(--amber)" }}>
            {fmtCredits(heldByJobs)} cr of yours are held by a job still running.
          </p>
        )}
      </div>

      {autoRecharge && (
        <div className="c-short__auto">
          <span>
            Auto-recharge will add {fmtCredits(autoRecharge.amount)} cr ({fmtMoney(autoRecharge.price)}) — you turned this on.
          </span>
          <button type="button" className="btn btn--sm btn--primary" onClick={onConfirmAuto}>
            Charge {fmtMoney(autoRecharge.price)} and run
          </button>
        </div>
      )}

      <div style={{ display: "grid", gap: 9 }}>
        <button type="button" className="c-short__opt is-primary" onClick={onTopUp}>
          <span>
            <span className="c-short__optname">Add {fmtCredits(topup.credits)} cr — {fmtMoney(topup.price)}</span>
            <span className="c-short__optsub">at ${topup.rate.toFixed(4)} each on Prime</span>
          </span>
          <span aria-hidden="true">→</span>
        </button>

        <p className="c-short__compare">
          On {compare.plan} these would cost ${compare.rate.toFixed(4)}. You&rsquo;d save {fmtMoney(compare.saving)} a month.
        </p>

        <button type="button" className="c-short__opt" onClick={onSwift}>
          <span>
            <span className="c-short__optname">Run it on Swift instead — {fmtCredits(swiftCost)} cr</span>
            <span className="c-short__optsub">quicker, good enough for most transcripts</span>
          </span>
          <span aria-hidden="true">→</span>
        </button>

        {trimCost != null && (
          <button type="button" className="c-short__opt" onClick={onTrim}>
            <span>
              <span className="c-short__optname">{trimNote} — {fmtCredits(trimCost)} cr</span>
              <span className="c-short__optsub">the rest stays where it is, ready when you are</span>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        )}

        {pool && (
          <button type="button" className="c-short__opt" onClick={onPool}>
            <span>
              <span className="c-short__optname">{pool.name} has {fmtCredits(pool.remaining)} cr — spend from the pool?</span>
              <span className="c-short__optsub">everyone in {pool.name} can see pool spend</span>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        )}

        {slowLane && (
          <button type="button" className="c-short__opt" onClick={onSlowLane}>
            <span>
              <span className="c-short__optname">Use the slow lane — free, but you&rsquo;ll wait</span>
              <span className="c-short__optsub">Swift model · queue position {slowLane.queuePosition}</span>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        )}

        <button type="button" className="btn btn--block btn--ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* U4.6 — the slow lane itself. Hitting zero is a speed limit, not a door. */
export function SlowLane({ queuePosition = 4, onTopUp = () => {} }) {
  return (
    <div className="card" style={{ display: "grid", gap: 14, maxWidth: 420, justifyItems: "center", textAlign: "center" }}>
      <FuelGauge remaining={0} total={5000} sub="you're in the slow lane" />
      <div style={{ display: "grid", gap: 6 }}>
        <strong style={{ fontSize: 16 }}>You&rsquo;re in the slow lane.</strong>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
          Queue position {queuePosition}. Swift model, free. Reading, replay and export are unaffected.
        </p>
      </div>
      <button type="button" className="btn btn--primary" onClick={onTopUp}>Top up to skip the queue</button>
    </div>
  );
}
