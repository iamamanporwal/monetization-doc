"use client";

// PART 8 — THE FLOWS, WIRED.
//
// What is faked: network latency, job execution, payment processing.
// What is NOT faked: the ledger. It is an append-only array, holds actually
// reserve, and settlement actually releases the difference. Everything on
// screen is a sum over that array.

import { useEffect, useMemo, useReducer, useRef } from "react";
import { BucketBar, CreditValue, FuelGauge, MiniStat } from "./primitives";
import { GoCard, InsufficientSheet, LiveMeter, SettleReceipt, SlowLane } from "./gate";
import { CheckoutPanel, TopUpPacks } from "./billing";
import { LedgerRow } from "./ledger";
import { fmtCredits, fmtMoney, creditsToFiat, RATE } from "./store";
import { reducer, balance, openHolds, available } from "./flow-engine";

/* ========================================================================== *
 * FLOW 1 — THE FIRST EIGHT MINUTES (activation)
 * ========================================================================== */
const FLOW1_INITIAL = {
  step: "grant",
  ledger: [{
    id: "le_f001", type: "grant", delta: 2000, bucket: "promo", appended: true,
    created_at: "2026-09-21T09:00:00Z", reason: "Welcome grant",
    expires_at: "2026-09-28T00:00:00Z", rate_version: "rc_2026_09_01", authorised_by: "system",
  }],
  holds: [], job: null, settled: null, baseCost: 55, failBranch: false,
};

export function ActivationFlow() {
  const [st, dispatch] = useReducer(reducer, FLOW1_INITIAL);
  const failRef = useRef(false);
  const bal = balance(st.ledger);
  const avail = available(st);

  // The job "runs" over ~4 seconds. Faking execution is fine; faking the
  // money is not.
  useEffect(() => {
    if (st.step !== "meter" || !st.job) return;
    const t = setInterval(() => dispatch({ type: "TICK" }), 250);
    return () => clearInterval(t);
  }, [st.step, st.job]);

  useEffect(() => {
    if (st.step !== "meter" || !st.job) return;
    if (st.job.elapsed < 4) return;
    const done = setTimeout(() => {
      if (failRef.current) dispatch({ type: "FAIL" });
      else dispatch({
        type: "SETTLE", used: st.job.creditsSoFar, outcome: "completed",
        bucket: "promo", tool: "capture.transcribe",
      });
    }, 250);
    return () => clearTimeout(done);
  }, [st.step, st.job]);

  const buckets = [{
    id: "bk_promo", bucket: "promo",
    granted: 2000, remaining: Math.max(bal, 0),
    source: "Welcome grant", expires_at: "2026-09-28T00:00:00Z",
  }];

  return (
    <div className="wt-demo" style={{ gap: 18 }}>
      <FlowRail
        steps={["U1.2 grant", "tool surface", "U1.4 GO", "U2.4 meter", "U1.5 receipt", "U3.1 wallet"]}
        current={{ grant: 0, tool: 1, go: 2, meter: 3, settle: 4, wallet: 5 }[st.step]}
      />

      <div className="wt-cols wt-cols--2">
        <div className="wt-case">
          <span className="wt-case__lbl">The screen</span>

          {st.step === "grant" && (
            <div className="card" style={{ display: "grid", gap: 14, justifyItems: "start" }}>
              <span className="chip chip--violet">expires in 7 days</span>
              <CreditValue amount={2000} variant="withCurrency" size="xl" stack={false} />
              <h3 style={{ fontSize: 20 }}>2,000 credits. Seven days. Go make one thing.</h3>
              <p className="muted" style={{ fontSize: "var(--text-sm)", maxWidth: "42ch" }}>
                Reading, browsing, joining and replaying are always free and never metered. Credits are for work that
                costs us money to do.
              </p>
              <button className="btn btn--primary" onClick={() => dispatch({ type: "GOTO", step: "tool" })}>Start</button>
            </div>
          )}

          {st.step === "tool" && (
            <div className="card" style={{ display: "grid", gap: 12 }}>
              <span className="lbl">Harbour · capture</span>
              <strong>Standup — 18 min 24 s</strong>
              <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
                A recording is sitting in the room. Playing it back costs nothing.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => dispatch({ type: "GOTO", step: "tool" })}>Replay — free</button>
                <button className="btn btn--primary" onClick={() => dispatch({ type: "GOTO", step: "go" })}>Transcribe</button>
              </div>
              <label className="c-go__remember">
                <input
                  type="checkbox" defaultChecked={failRef.current}
                  onChange={(e) => { failRef.current = e.target.checked; }}
                />
                Make this job fail on our side (the failure branch)
              </label>
            </div>
          )}

          {st.step === "go" && (
            <GoCard
              tool="capture.transcribe" version={3}
              headline="Transcribe this recording"
              detail="Standup — 18 min 24 s · 3 cr per audio minute"
              baseCost={55} balance={bal} held={openHolds(st.holds)}
              unitNote="Settled on measured minutes, never the estimate."
              onCancel={() => dispatch({ type: "GOTO", step: "tool", note: "Cancelled. No hold, no ledger row, no charge." })}
              onGo={({ tier, estimate, cap }) =>
                dispatch({
                  type: "HOLD", estimate, tier, cap, headline: "Transcribe — standup, 18m",
                  unitsEstimate: 18.4, unitLabel: "audio minutes",
                })}
            />
          )}

          {st.step === "meter" && st.job && (
            <LiveMeter
              tool="capture.transcribe v3" headline={st.job.headline}
              unitsDone={st.job.unitsDone} unitsEstimate={st.job.unitsEstimate}
              unitLabel={st.job.unitLabel} creditsSoFar={st.job.creditsSoFar}
              cap={st.job.cap} elapsedSeconds={st.job.elapsed} state={st.job.state}
              onStop={() => dispatch({
                type: "SETTLE", used: st.job.creditsSoFar, outcome: "partial",
                measuredNote: `${st.job.unitsDone.toFixed(1)} minutes`, bucket: "promo",
              })}
            />
          )}

          {st.step === "settle" && st.settled && (
            <SettleReceipt
              {...st.settled} balanceAfter={bal} headline="Transcribe — standup, 18m"
              onRetry={() => { failRef.current = false; dispatch({ type: "GOTO", step: "go" }); }}
              onReceipt={() => dispatch({ type: "GOTO", step: "wallet" })}
            />
          )}

          {st.step === "wallet" && (
            <div className="card" style={{ display: "grid", gap: 16, justifyItems: "center" }}>
              <FuelGauge remaining={bal} total={2000} sub="credits left · 7 days to use them" />
              <BucketBar buckets={buckets} now="2026-09-21T10:00:00Z" />
              <button className="btn" onClick={() => dispatch({ type: "RESET", initial: FLOW1_INITIAL })}>
                Run the flow again
              </button>
            </div>
          )}
        </div>

        <div className="wt-case">
          <span className="wt-case__lbl">The ledger, as it actually is</span>
          <div className="card tablewrap" style={{ padding: 0 }}>
            <table className="c-ledger">
              <thead>
                <tr>
                  <th scope="col"><span className="sr">Type</span></th>
                  <th scope="col">Time</th>
                  <th scope="col">What</th>
                  <th scope="col" className="is-hidden-mobile">Measured</th>
                  <th scope="col" className="ta-r">Change</th>
                  <th scope="col"><span className="sr">Detail</span></th>
                </tr>
              </thead>
              <tbody>
                {st.holds.filter((h) => h.state === "open").map((h) => (
                  <LedgerRow key={h.id} entry={{ ...h, type: "hold" }} expandable={false} showBalance={false} />
                ))}
                {st.ledger.map((e) => (
                  <LedgerRow key={e.id} entry={e} showBalance={false} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="wt-stats">
            <MiniStat label="Balance">
              <CreditValue amount={bal} variant="withCurrency" size="lg" stack />
            </MiniStat>
            <MiniStat label="On hold" note="reserved, not charged">
              <CreditValue amount={openHolds(st.holds)} variant="held" size="lg" />
            </MiniStat>
            <MiniStat label="Spendable">
              <CreditValue amount={avail} size="lg" />
            </MiniStat>
          </div>

          {st.note && <p className="c-short__compare">{st.note}</p>}
          {st.settled?.outcome === "failed" && (
            <p className="c-short__compare" style={{ background: "var(--green-wash)" }}>
              Verify it on screen: the balance is still {fmtCredits(bal)} cr — numerically unchanged. The hold row is gone,
              and no spend row was ever written.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * FLOW 2 — RUNNING LOW (the revenue moment)
 * ========================================================================== */
const FLOW2_INITIAL = {
  step: "wallet",
  ledger: [{
    id: "le_f100", type: "grant", delta: 37, bucket: "plan", appended: true,
    created_at: "2026-09-20T00:00:00Z", reason: "What's left of September's Prime allotment",
    rate_version: "rc_2026_09_01", authorised_by: "system",
  }],
  holds: [], job: null, settled: null, baseCost: 55, pack: "maker", scope: "full",
};

export function RunningLowFlow() {
  const [st, dispatch] = useReducer(reducer, FLOW2_INITIAL);
  const bal = balance(st.ledger);
  const avail = available(st);
  const needed = st.scope === "trim" ? 30 : st.baseCost;
  const hold = Math.round(needed * 1.2);

  useEffect(() => {
    if (st.step !== "meter" || !st.job) return;
    const t = setInterval(() => dispatch({ type: "TICK" }), 250);
    return () => clearInterval(t);
  }, [st.step, st.job]);
  useEffect(() => {
    if (st.step !== "meter" || !st.job || st.job.elapsed < 4) return;
    const d = setTimeout(() => dispatch({
      type: "SETTLE", used: st.job.creditsSoFar, outcome: "completed", bucket: "plan",
    }), 250);
    return () => clearTimeout(d);
  }, [st.step, st.job]);

  const goCard = (
    <GoCard
      tool="capture.transcribe" version={3}
      headline={st.scope === "trim" ? "Transcribe the first 10 minutes" : "Transcribe this recording"}
      detail={st.scope === "trim" ? "Weekly review — first 10 min of 18 min 24 s" : "Weekly review — 18 min 24 s"}
      baseCost={needed} balance={bal} held={openHolds(st.holds)}
      onCancel={() => dispatch({ type: "GOTO", step: "wallet" })}
      onGo={({ estimate, tier, cap, short }) =>
        short
          ? dispatch({ type: "GOTO", step: "short" })
          : dispatch({
              type: "HOLD", estimate, tier, cap,
              headline: st.scope === "trim" ? "Transcribe — review, first 10m" : "Transcribe — weekly review",
              unitsEstimate: st.scope === "trim" ? 10 : 18.4, unitLabel: "audio minutes",
            })}
    />
  );

  return (
    <div className="wt-demo" style={{ gap: 18 }}>
      <FlowRail
        steps={["U3.1 wallet, 37 cr", "U2.2 GO", "U2.7 short", "U4.1 top-up", "U4.2 checkout", "settled"]}
        current={{ wallet: 0, go: 1, short: 2, topup: 3, checkout: 4, meter: 5, settle: 5, slow: 2 }[st.step]}
      />

      <div className="wt-cols wt-cols--2">
        <div className="wt-case">
          <span className="wt-case__lbl">The screen</span>

          {st.step === "wallet" && (
            <div className="card" style={{ display: "grid", gap: 16, justifyItems: "center" }}>
              <FuelGauge remaining={avail} total={5000} sub={avail > 200 ? "credits left" : "credits left · runs out today"} />
              <p className="muted" style={{ fontSize: "var(--text-sm)", textAlign: "center" }}>
                {avail <= 200
                  ? "At this rate you run out today. Nothing gets locked — you drop to the slow lane."
                  : `At this rate that's about ${Math.floor(avail / 272)} days.`}
              </p>
              <button className="btn btn--primary" onClick={() => dispatch({ type: "GOTO", step: "go" })}>
                Transcribe a long recording
              </button>
            </div>
          )}

          {st.step === "go" && goCard}

          {st.step === "short" && (
            <InsufficientSheet
              needed={needed} available={avail} swiftCost={28}
              trimCost={30} trimNote="Just the first 10 minutes"
              slowLane={{ queuePosition: 4 }}
              pool={{ name: "Harbour", remaining: 8420 }}
              onTopUp={() => dispatch({ type: "GOTO", step: "topup" })}
              onSwift={() => dispatch({ type: "GOTO", step: "short", note: "Swift needs 28 cr and a 34 cr hold. You have 37 available, so this one clears — pick Swift in the GO card and run it." })}
              onTrim={() => dispatch({ type: "TIER", tier: "standard", baseCost: 30 })}
              onSlowLane={() => dispatch({ type: "GOTO", step: "slow" })}
              onPool={() => dispatch({ type: "GOTO", step: "short", note: "Harbour's pool covers it — but 350 cr is over Harbour's 200 cr threshold, so this becomes a request to Tomas, not a charge." })}
              onCancel={() => dispatch({ type: "GOTO", step: "wallet" })}
            />
          )}

          {st.step === "topup" && (
            <div className="card" style={{ display: "grid", gap: 16 }}>
              <strong style={{ fontSize: 16 }}>Top up</strong>
              <TopUpPacks selected={st.pack} onSelect={(p) => dispatch({ type: "PACK", pack: p })} />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn--ghost" onClick={() => dispatch({ type: "GOTO", step: "short" })}>Back</button>
                <button className="btn btn--primary" onClick={() => dispatch({ type: "GOTO", step: "checkout" })}>Continue</button>
              </div>
            </div>
          )}

          {st.step === "checkout" && (
            <CheckoutPanel
              credits={2500} subtotal={25}
              onCancel={() => dispatch({ type: "GOTO", step: "topup" })}
              onPay={() => dispatch({ type: "TOPUP", credits: 2500, label: "Maker pack", pack: st.pack, then: "go" })}
            />
          )}

          {st.step === "meter" && st.job && (
            <LiveMeter
              tool="capture.transcribe v3" headline={st.job.headline}
              unitsDone={st.job.unitsDone} unitsEstimate={st.job.unitsEstimate}
              unitLabel={st.job.unitLabel} creditsSoFar={st.job.creditsSoFar}
              cap={st.job.cap} elapsedSeconds={st.job.elapsed} state={st.job.state}
              onStop={() => dispatch({ type: "SETTLE", used: st.job.creditsSoFar, outcome: "partial",
                measuredNote: `${st.job.unitsDone.toFixed(1)} minutes`, bucket: "plan" })}
            />
          )}

          {st.step === "settle" && st.settled && (
            <SettleReceipt {...st.settled} balanceAfter={bal} headline="Transcribe — weekly review"
              onDismiss={() => dispatch({ type: "RESET", initial: FLOW2_INITIAL })} />
          )}

          {st.step === "slow" && <SlowLane queuePosition={4} onTopUp={() => dispatch({ type: "GOTO", step: "topup" })} />}
        </div>

        <div className="wt-case">
          <span className="wt-case__lbl">What the money is doing</span>
          <div className="wt-stats">
            <MiniStat label="Balance"><CreditValue amount={bal} variant="withCurrency" size="lg" stack /></MiniStat>
            <MiniStat label="On hold"><CreditValue amount={openHolds(st.holds)} variant="held" size="lg" /></MiniStat>
            <MiniStat label="This job needs" note={`${fmtCredits(hold)} cr hold at 1.2×`}>
              <CreditValue amount={needed} variant="estimate" size="lg" />
            </MiniStat>
          </div>

          <div className="card tablewrap" style={{ padding: 0 }}>
            <table className="c-ledger">
              <thead>
                <tr>
                  <th scope="col"><span className="sr">Type</span></th>
                  <th scope="col">Time</th>
                  <th scope="col">What</th>
                  <th scope="col" className="is-hidden-mobile">Measured</th>
                  <th scope="col" className="ta-r">Change</th>
                  <th scope="col"><span className="sr">Detail</span></th>
                </tr>
              </thead>
              <tbody>
                {st.holds.filter((h) => h.state === "open").map((h) => (
                  <LedgerRow key={h.id} entry={{ ...h, type: "hold" }} expandable={false} showBalance={false} />
                ))}
                {st.ledger.map((e) => <LedgerRow key={e.id} entry={e} showBalance={false} />)}
              </tbody>
            </table>
          </div>
          {st.note && <p className="c-short__compare">{st.note}</p>}
          <p style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>
            Every branch on the sheet is reachable and none of them charges without a further explicit step. The top-up
            writes a <code>grant</code> row to the <code>purchased</code> bucket, which is spent last.
          </p>
        </div>
      </div>
    </div>
  );
}

function FlowRail({ steps, current = 0 }) {
  return (
    <ol style={{ display: "flex", gap: 6, flexWrap: "wrap", listStyle: "none", margin: 0, padding: 0 }}>
      {steps.map((s, i) => (
        <li key={s}>
          <span className={`chip ${i === current ? "chip--brand" : ""}`} style={i < current ? { opacity: 0.55 } : undefined}>
            {i + 1}. {s}
          </span>
        </li>
      ))}
    </ol>
  );
}
