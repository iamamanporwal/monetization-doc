"use client";

// TIER 8 — LIVE SURFACES. C-27, C-28. New in spec 2.0.
// The GO card answers "what will this cost me now". These answer "what is
// this costing me forever", which is the question a recurring charge raises.

import { useId } from "react";
import { CreditValue, FuelGauge } from "./primitives";
import { creditsToFiat, fmtCredits, fmtMoney, fmtDate, addDays } from "./store";

const CLASS_LABEL = { static: "static", live_app: "live app", always_on: "always-on" };

/* ========================================================================== *
 * C-27  STANDING METER CARD
 * REQUIRED: never a monthly cost without the date it next settles.
 * REQUIRED: "Sleep it" is always available and never buried — a one-tap way
 * to stop a recurring charge is what makes the recurring charge acceptable.
 * ========================================================================== */
export function StandingMeterCard({
  surface, nextSettle = "2026-10-04", variant, onSleep = () => {}, onWake = () => {}, onBudget = () => {},
}) {
  const s = surface;
  const pct = s.budget_cap ? s.spent_this_cycle / s.budget_cap : 0;
  const v =
    variant ||
    (s.state === "sleeping" ? "sleeping"
      : s.included_in_plan ? "included"
      : pct > 1 ? "overcap"
      : pct > 0.8 ? "approaching"
      : "billing");
  const warned = s.warned_at.length;
  const keepUntil = s.idle_since ? addDays(s.idle_since, 60) : null;

  return (
    <div className={`c-standing c-standing--${v}`}>
      <div className="c-standing__head">
        <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
          <div className="c-standing__name">
            {s.name}
            {s.included_in_plan && <span className="chip chip--ok">included in your plan</span>}
          </div>
          <a className="c-standing__url" href={`https://${s.url}`} onClick={(e) => e.preventDefault()}>{s.url}</a>
          <div className="c-standing__chips">
            <span className="chip">{CLASS_LABEL[s.class]}</span>
            {s.datastore && <span className="chip">{s.datastore}</span>}
            {s.domain && <span className="chip">custom domain</span>}
            <span className={`chip ${s.state === "live" ? "chip--green" : s.state === "deploying" ? "chip--info" : ""}`}>
              {s.state}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
          <div className="c-standing__money">
            {s.included_in_plan && (
              <span className="c-standing__struck">{fmtCredits(s.list_credits_monthly)} cr · {fmtMoney(creditsToFiat(s.list_credits_monthly))}</span>
            )}
            <CreditValue
              amount={s.included_in_plan ? 0 : s.credits_monthly}
              variant="withCurrency" size="lg" stack
            />
          </div>
          <span className="c-standing__settles">
            {s.included_in_plan
              ? `nothing billed · next settles ${fmtDate(nextSettle)}`
              : `per month · next settles ${fmtDate(nextSettle)}`}
          </span>
        </div>
      </div>

      <div className="c-standing__meter">
        <div className="c-standing__meterhead">
          <span>this cycle so far</span>
          <span>{fmtCredits(s.spent_this_cycle)} / {fmtCredits(s.budget_cap)} cr budget</span>
        </div>
        {/* The bar fills as the budget is SPENT, not as it remains — a
            hosting meter that empties as you spend reads backwards. */}
        <FuelGauge
          remaining={Math.min(s.spent_this_cycle, s.budget_cap)}
          total={s.budget_cap} variant="bar"
          tone={pct > 1 ? "risk" : pct > 0.8 ? "warn" : "ok"}
          label={`${fmtCredits(s.spent_this_cycle)} of a ${fmtCredits(s.budget_cap)} credit budget used this cycle`}
        />
      </div>

      {v === "overcap" && (
        <div className="c-standing__warn c-standing__warn--two">
          Past your {fmtCredits(s.budget_cap)} cr budget. We stopped adding metered usage rather than going further.
        </div>
      )}
      {warned === 1 && s.state === "live" && (
        <div className="c-standing__warn c-standing__warn--one">
          <strong>First warning sent {fmtDate(s.warned_at[0])}.</strong>
          <span>At this balance it sleeps on {fmtDate(nextSettle)}. Nothing is deleted when it sleeps.</span>
        </div>
      )}
      {warned === 2 && s.state === "live" && (
        <div className="c-standing__warn c-standing__warn--two">
          <strong>Second warning sent {fmtDate(s.warned_at[1])}. This is the last one.</strong>
          <span>It sleeps on {fmtDate(nextSettle)} unless the balance covers {fmtCredits(s.credits_monthly)} cr. Your data is kept for 60 days after that — until {fmtDate(addDays(nextSettle, 60))}.</span>
        </div>
      )}
      {s.state === "sleeping" && (
        <div className="c-standing__warn c-standing__warn--sleep">
          <strong>Sleeping since {fmtDate(s.idle_since)}. Your data is kept until {fmtDate(keepUntil)}.</strong>
          <span>Wake it any time; nothing was lost, and the URL does not change.</span>
        </div>
      )}

      <span className="c-standing__by">built by {s.built_by_name} · {s.region} · last deploy {fmtDate(s.last_deploy_at)}</span>

      <div className="c-standing__actions">
        <button type="button" className="btn btn--sm" onClick={onBudget}>Change budget</button>
        {s.state === "sleeping"
          ? <button type="button" className="btn btn--sm btn--primary" onClick={onWake}>Wake it</button>
          : <button type="button" className="btn btn--sm" onClick={onSleep}>Sleep it</button>}
        <button type="button" className="btn btn--sm btn--ghost">Open</button>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * C-28  SLEEP / WAKE SHEET
 * REQUIRED: lead with the free fallback, not the payment.
 * REQUIRED: the word "delete" appears nowhere, in any state.
 * REQUIRED: wake-confirm states that the URL is unchanged — that is the
 * specific fear.
 * ========================================================================== */
export function SleepWakeSheet({
  surface, variant = "warning-one", sleepDate = "2026-10-04",
  onTopUp = () => {}, onSmaller = () => {}, onLetSleep = () => {}, onWake = () => {}, onCancel = () => {},
}) {
  const s = surface;
  const titleId = useId();
  const keepUntil = addDays(sleepDate, 60);
  const monthly = s.credits_monthly;

  const head = {
    "warning-one": `${s.name} sleeps on ${fmtDate(sleepDate)} at this balance.`,
    "warning-two": `${s.name} sleeps in 3 days — on ${fmtDate(sleepDate)}.`,
    "sleeping-now": `${s.name} is asleep.`,
    "wake-confirm": `Wake ${s.name}?`,
  }[variant];

  return (
    <div className="c-sleep" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div>
        <h2 className="c-sleep__title" id={titleId} tabIndex={-1}>{head}</h2>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)", marginTop: 6 }}>
          {variant === "wake-confirm"
            ? `It comes back on the same address — ${s.url} — with the same data. Nothing was lost while it slept.`
            : variant === "sleeping-now"
            ? `It went to sleep on ${fmtDate(sleepDate)} after two warnings. Everything it held is kept until ${fmtDate(keepUntil)}.`
            : `It's live on ${s.url} now. If nothing changes it goes to sleep behind a wake page — visitors see a page, not an error.`}
        </p>
      </div>

      <div className="c-sleep__facts">
        <span className="c-sleep__fact">
          <span>Keeping it live costs</span>
          <b>{fmtCredits(monthly)} cr · {fmtMoney(creditsToFiat(monthly))} / cycle</b>
        </span>
        <span className="c-sleep__fact">
          <span>Your balance covers</span>
          <b>{variant === "warning-one" ? "14 more days" : "3 more days"}</b>
        </span>
        <span className="c-sleep__fact">
          <span>If you do nothing</span>
          <b>it sleeps {fmtDate(sleepDate)}</b>
        </span>
        <span className="c-sleep__fact">
          <span>Your data is kept until</span>
          <b>{fmtDate(keepUntil, { withYear: true })}</b>
        </span>
        <span className="c-sleep__fact">
          <span>Waking it costs</span>
          <b>nothing</b>
        </span>
      </div>

      {variant === "wake-confirm" ? (
        <div className="c-sleep__opts">
          <button type="button" className="btn btn--primary btn--lg btn--block" onClick={onWake}>
            Wake it on {s.url}
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={onCancel}>Leave it asleep</button>
          <p className="c-sleep__free">
            The address does not change. Waking is free; the {fmtCredits(monthly)} cr standing charge resumes at the next settle.
          </p>
        </div>
      ) : variant === "sleeping-now" ? (
        <div className="c-sleep__opts">
          <button type="button" className="btn btn--primary btn--lg btn--block" onClick={onWake}>Wake it — free</button>
          <button type="button" className="btn btn--block" onClick={onTopUp}>Top up so it stays awake</button>
          <p className="c-sleep__free">Sleeping is free. You can wake it in one tap.</p>
        </div>
      ) : (
        <div className="c-sleep__opts">
          {/* REQUIRED: the free fallback leads. "Pay or lose it" reads as a
              hostage situation; this reads as generous and converts better. */}
          <button type="button" className="btn btn--lg btn--block" onClick={onLetSleep}>
            Let it sleep on {fmtDate(sleepDate)}
          </button>
          <button type="button" className="btn btn--primary btn--block" onClick={onTopUp}>
            Top up and keep it live — {fmtMoney(creditsToFiat(monthly))}
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={onSmaller}>
            Move it to a smaller plan — scale-to-zero, {fmtCredits(200)} cr/month
          </button>
          <p className="c-sleep__free">Sleeping is free. You can wake it in one tap, on the same address.</p>
        </div>
      )}
    </div>
  );
}
