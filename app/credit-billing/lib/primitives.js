"use client";

// GROUP 1 — MONEY PRIMITIVES. C-01 … C-04.
// Everything else in the library is built out of these four.

import { useId, useMemo, useState } from "react";
import { RATE, creditsToFiat, fmtCredits, fmtMoney, fmtDate, relativeExpiry } from "./store";

/* ========================================================================== *
 * C-01  CREDIT VALUE
 * The atom. Every credit number in the product goes through this, so they can
 * never disagree in format, alignment or colour.
 * ========================================================================== */
export function CreditValue({
  amount,
  variant = "plain",     // plain | withCurrency | delta | held | estimate
  size = "md",           // sm 13 | md 15 | lg 22 | xl 34
  rate = RATE.listPerCredit,
  band = null,           // [lo, hi] for the estimate variant
  unit = "cr",
  state,                 // muted | emphasis
  stack = false,
  className = "",
  ...rest
}) {
  const n = Math.round(Number(amount) || 0);
  const signed = variant === "delta";
  const shown = variant === "estimate" ? `~${fmtCredits(Math.abs(n))}` : fmtCredits(Math.abs(n));
  const prefix = signed ? (n >= 0 ? "+" : "−") : "";
  // Reserve the width so a number changing never reflows anything around it.
  const ch = Math.max(String(fmtCredits(Math.abs(n))).length, 3) + (variant === "estimate" ? 1 : 0);

  const cls = [
    "c-credit",
    `c-credit--${variant}`,
    `c-credit--${size}`,
    state ? `c-credit--${state}` : "",
    stack ? "c-credit--stack" : "",
    signed ? (n >= 0 ? "is-pos" : "is-neg") : "",
    className,
  ].filter(Boolean).join(" ");

  const figure = (
    <>
      <span className="c-credit__value" style={{ minWidth: `${ch}ch` }}>
        {prefix}{shown}
      </span>
      {unit && <span className="c-credit__unit">{unit}</span>}
    </>
  );

  return (
    <span className={cls} {...rest}>
      {stack ? <span className="c-credit__row">{figure}</span> : figure}
      {variant === "withCurrency" && (
        <span className="c-credit__fiat">{fmtMoney(creditsToFiat(n, rate))}</span>
      )}
      {variant === "held" && <span className="c-credit__unit">held</span>}
      {variant === "estimate" && band && (
        <span className="c-credit__fiat">between {fmtCredits(band[0])} and {fmtCredits(band[1])}</span>
      )}
    </span>
  );
}

/* ========================================================================== *
 * C-02  FUEL GAUGE
 * Remaining balance as a proportion, not just a number. The most-looked-at
 * element in Product A.
 * ========================================================================== */
export function toneFor(ratio) {
  if (ratio <= 0) return "empty";
  if (ratio > 0.4) return "ok";
  if (ratio >= 0.15) return "warn";
  return "risk";
}

export function FuelGauge({
  remaining,
  total,
  variant = "ring",      // ring | bar | inline
  band = null,           // [lo, hi] healthy zone
  capMarker = null,
  tone = "auto",
  center,                // override the big number
  sub,
  loading = false,
  unknown = false,
  label,
}) {
  const ratio = total > 0 ? Math.max(Math.min(remaining / total, 1), 0) : 0;
  const t = tone === "auto" ? toneFor(ratio) : tone;
  const aria = label || `${fmtCredits(remaining)} of ${fmtCredits(total)} credits remaining`;

  if (loading) return <div className="c-gauge__skeleton" aria-hidden="true" />;

  if (variant === "ring") {
    const R = 76, C = 2 * Math.PI * R;
    return (
      <div
        className={`c-gauge c-gauge--ring c-gauge--${t}`}
        role="meter"
        aria-valuenow={unknown ? undefined : remaining}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={unknown ? "balance unavailable" : aria}
      >
        <svg viewBox="0 0 180 180" aria-hidden="true">
          <circle className="c-gauge__track" cx="90" cy="90" r={R} />
          {band && (
            <circle
              className="c-gauge__band" cx="90" cy="90" r={R + 11}
              strokeDasharray={`${C * (band[1] - band[0])} ${C}`}
              strokeDashoffset={-C * band[0]}
            />
          )}
          {!unknown && (
            <circle
              className="c-gauge__fill" cx="90" cy="90" r={R}
              strokeDasharray={`${C * ratio} ${C}`}
            />
          )}
          {capMarker != null && total > 0 && (
            <circle
              className="c-gauge__cap" cx="90" cy="90" r={R} fill="none"
              strokeDasharray={`2 ${C}`} strokeDashoffset={-C * (capMarker / total)}
            />
          )}
        </svg>
        <div className="c-gauge__center">
          {center ?? (
            unknown
              ? <span className="c-credit c-credit--xl"><span className="c-credit__value">—</span></span>
              : <CreditValue amount={remaining} size="xl" unit="" />
          )}
          <span className="c-gauge__sub">{unknown ? "balance unavailable" : sub}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`c-gauge c-gauge--${variant} c-gauge--${t}`}>
      <div
        className="c-gauge__rail" role="meter"
        aria-valuenow={remaining} aria-valuemin={0} aria-valuemax={total} aria-label={aria}
      >
        <div className="c-gauge__bar" style={{ width: `${ratio * 100}%` }} />
        {capMarker != null && total > 0 && (
          <span className="c-gauge__tick" style={{ left: `${(capMarker / total) * 100}%` }} />
        )}
      </div>
      {sub && <p className="c-gauge__sub" style={{ marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

/* ========================================================================== *
 * C-03  BUCKET BAR
 * The four wallet buckets as one stacked bar, in SPEND ORDER, with expiry.
 * Bucket order is the thing users most often suspect a credit product of
 * cheating on. Showing the order is the defence.
 * ========================================================================== */
const BUCKET_ORDER = ["promo", "plan", "purchased", "overdraft"];
const BUCKET_SWATCH = {
  promo: "var(--violet)", plan: "var(--ok)", purchased: "var(--info)", overdraft: "var(--amber)",
};
const BUCKET_LABEL = {
  promo: "Promo", plan: "Plan", purchased: "Purchased", overdraft: "Overdraft",
};

export function BucketBar({ buckets, showLegend = true, compact = false, now, soonDays = 7 }) {
  const ordered = BUCKET_ORDER
    .map((b) => buckets.find((x) => x.bucket === b))
    .filter((b) => b && b.remaining > 0);
  const empty = ordered.length === 0;

  const isSoon = (b) => {
    if (!b.expires_at) return false;
    const d = Math.round((new Date(b.expires_at) - new Date(now)) / 86400000);
    return d >= 0 && d <= soonDays;
  };

  return (
    <div className={`c-buckets ${empty ? "c-buckets--empty" : ""}`}>
      <div className="c-buckets__bar" aria-hidden="true">
        {ordered.map((b) => (
          <i
            key={b.id}
            className={`seg seg--${b.bucket} ${isSoon(b) ? "seg--expiring" : ""}`}
            style={{ flex: b.remaining }}
          />
        ))}
      </div>
      <p className="c-buckets__order">
        {empty ? "No credits" : "Spends soonest-to-expire first"}
      </p>
      {showLegend && !compact && (
        <ul className="c-buckets__legend">
          {ordered.map((b) => (
            <li key={b.id}>
              <span className="c-buckets__sw" style={{ background: BUCKET_SWATCH[b.bucket] }} />
              <span className="c-buckets__name">
                {b.source || BUCKET_LABEL[b.bucket]}
              </span>
              <CreditValue amount={b.remaining} size="sm" />
              <span className={`c-buckets__exp ${isSoon(b) ? "is-soon" : ""}`}>
                {relativeExpiry(b.expires_at, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========================================================================== *
 * C-04  BURN SPARKLINE
 * Daily burn over time, with an optional dashed forecast tail. Answers "am I
 * spending a lot?" without a number being read.
 * ========================================================================== */
export function BurnSparkline({
  series = [],
  variant = "card",      // inline 40 | card 120 | full 220
  forecast = false,
  capLine = null,
  runwayLabel = null,
  emptyNote = "No spend yet",
  unitLabel = "cr",
}) {
  const H = variant === "inline" ? 40 : variant === "full" ? 220 : 120;
  const W = 600;
  const padT = 8, padB = variant === "inline" ? 2 : 6;
  const [hover, setHover] = useState(null);

  const { line, area, tail, max, pts } = useMemo(() => {
    if (!series.length) return { line: "", area: "", tail: "", max: 0, pts: [] };
    const values = series.map((d) => d.credits);
    const forecastDays = forecast && series.length >= 3 ? 8 : 0;
    const recent = values.slice(-7);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const max = Math.max(...values, capLine || 0, forecastDays ? avg : 0) * 1.15 || 1;
    const n = series.length + forecastDays;
    const x = (i) => (i / Math.max(n - 1, 1)) * W;
    const y = (v) => padT + (1 - v / max) * (H - padT - padB);
    const pts = series.map((d, i) => ({ ...d, x: x(i), y: y(d.credits) }));
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${W} ${H - padB} L0 ${H - padB} Z`;
    let tail = "";
    if (forecastDays) {
      const start = pts[pts.length - 1];
      const fpts = [start].concat(
        Array.from({ length: forecastDays }, (_, k) => ({
          x: x(series.length - 1 + k + 1), y: y(avg),
        }))
      );
      tail = fpts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    }
    return { line, area, tail, max, pts };
  }, [series, forecast, capLine, H]);

  if (!series.length) {
    return <div className="c-spark__empty" style={{ height: H }}>{emptyNote} — publish or run something to start the curve</div>;
  }
  if (series.length === 1) {
    return (
      <div className="c-spark">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ height: H }} aria-hidden="true">
          <circle className="c-spark__dot" cx={W / 2} cy={H / 2} r="4" />
        </svg>
        <div className="c-spark__axis"><span>{fmtDate(series[0].date)}</span><span>one day of history</span></div>
      </div>
    );
  }

  const flat = series.every((d) => d.credits === 0);
  const yFor = (v) => padT + (1 - v / max) * (H - padT - padB);

  return (
    <div className="c-spark">
      {variant !== "inline" && (
        <p className="c-spark__readout" aria-live="polite">
          {hover
            ? `${fmtDate(hover.date, { weekday: true })} · ${fmtCredits(hover.credits)} ${unitLabel}`
            : flat ? "No spend yet" : " "}
        </p>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`} style={{ height: H }} preserveAspectRatio="none"
        role="img" aria-label={`Daily burn over ${series.length} days`}
        onMouseLeave={() => setHover(null)}
      >
        {variant === "full" && [0.25, 0.5, 0.75].map((f) => (
          <line key={f} className="c-spark__grid" x1="0" x2={W} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} />
        ))}
        {variant !== "inline" && <path className="c-spark__area" d={area} />}
        <path className="c-spark__line" d={line} />
        {tail && <path className="c-spark__forecast" d={tail} />}
        {capLine != null && (
          <line className="c-spark__cap" x1="0" x2={W} y1={yFor(capLine)} y2={yFor(capLine)} />
        )}
        {runwayLabel && tail && (
          <line className="c-spark__runway" x1={W * 0.93} x2={W * 0.93} y1={padT} y2={H - padB} />
        )}
        {hover && <circle className="c-spark__dot" cx={hover.x} cy={hover.y} r="3.5" />}
        {pts.map((p, i) => (
          <rect
            key={p.date} className="c-spark__hit"
            x={p.x - W / series.length / 2} y="0" width={W / series.length} height={H}
            onMouseEnter={() => setHover(p)}
          />
        ))}
      </svg>
      {variant !== "inline" && (
        <div className="c-spark__axis">
          <span>{fmtDate(series[0].date)}</span>
          {forecast && series.length < 3 && <span>not enough history to forecast yet</span>}
          {runwayLabel && <span style={{ color: "var(--risk)" }}>{runwayLabel}</span>}
          <span>{fmtDate(series[series.length - 1].date)}</span>
        </div>
      )}
    </div>
  );
}

/* A labelled mini statistic, used on the wallet beside the gauge. */
export function MiniStat({ label, children, note }) {
  const id = useId();
  return (
    <div className="card" style={{ padding: "13px 14px", display: "grid", gap: 6, boxShadow: "none" }}>
      <span className="lbl" id={id}>{label}</span>
      <span aria-labelledby={id}>{children}</span>
      {note && <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>{note}</span>}
    </div>
  );
}
