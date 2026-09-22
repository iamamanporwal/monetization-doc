"use client";

// GROUP 4 — PLANS AND BILLING. C-13 … C-18.

import { useId, useState } from "react";
import { CreditValue } from "./primitives";
import { RATE, fmtCredits, fmtMoney, fmtDate } from "./store";

/* ========================================================================== *
 * C-13  PLAN CARD
 * Includes the column no competitor shows: effective cost per credit. Show it
 * next to the top-up rate and the upgrade sells itself — you are not
 * upselling, you are showing arithmetic.
 * ========================================================================== */
export function PlanCard({ plan, state = "default", annual = false, onCta = () => {} }) {
  const monthly = annual ? Math.round((plan.price * 10) / 12 * 100) / 100 : plan.price;
  const saving = plan.price * 2;
  const cta = {
    default: `Choose ${plan.name}`,
    current: "Current",
    recommended: `Choose ${plan.name}`,
    upgrade: `Upgrade to ${plan.name}`,
    downgrade: `Switch to ${plan.name}`,
    unavailable: "Talk to us",
  }[state];

  return (
    <div className={`c-plan ${state === "recommended" ? "c-plan--recommended" : ""} ${state === "current" ? "c-plan--current" : ""}`}>
      <div className="c-plan__name">
        {plan.name}
        {state === "current" && <span className="chip chip--ok">your plan</span>}
        {state === "recommended" && <span className="chip chip--brand">most people choose this</span>}
      </div>

      <div className="c-plan__price">
        {fmtMoney(monthly)}
        <span className="c-plan__period">/month{annual ? ", billed yearly" : ""}</span>
      </div>
      {annual && plan.price > 0 && (
        <span className="c-plan__save">Two months free — {fmtMoney(saving)} a year</span>
      )}

      <div className="c-plan__rates">
        <span className="c-plan__rate">
          <span>Credits each month</span><b>{fmtCredits(plan.credits)} cr</b>
        </span>
        <span className="c-plan__rate">
          <span>Effective cost per credit</span>
          <b>{plan.effectiveRate ? `$${plan.effectiveRate.toFixed(4)}` : "—"}</b>
        </span>
        <span className="c-plan__rate">
          <span>Top-up rate</span>
          <b>{plan.topupRate ? `$${plan.topupRate.toFixed(4)}` : "—"}</b>
        </span>
      </div>

      <ul className="c-plan__features">
        {plan.features.map((f) => <li key={f}>{f}</li>)}
      </ul>

      <button
        type="button"
        className={`btn btn--block ${state === "recommended" || state === "upgrade" ? "btn--primary" : ""}`}
        disabled={state === "current"}
        onClick={onCta}
      >
        {cta}
      </button>
    </div>
  );
}

export function AnnualToggle({ on, onChange }) {
  const id = useId();
  return (
    <div className="c-annual">
      <button
        type="button" id={id} className={`c-switch ${on ? "is-on" : ""}`}
        role="switch" aria-checked={on} aria-label="Annual billing"
        onClick={() => onChange(!on)}
      />
      <label htmlFor={id}>Annual — two months free</label>
    </div>
  );
}

/* ========================================================================== *
 * C-14  PRORATION PREVIEW — the arithmetic of a plan change, before it is
 * committed. A downgrade must never imply credits are lost when they are not.
 * ========================================================================== */
export function ProrationPreview({ variant = "upgrade", loading = false, error = false, rows, total, next, note }) {
  if (error) {
    return (
      <div className="c-proration">
        <p className="c-proration__err">We couldn&rsquo;t work out the proration. Nothing has changed.</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="c-proration">
        {[0, 1, 2, 3].map((i) => (
          <div className="c-proration__row" key={i}><span className="c-go__skel" style={{ width: "58%", height: 13 }} /><span /></div>
        ))}
      </div>
    );
  }
  return (
    <div className="c-proration">
      {rows.map((r) => (
        <div className="c-proration__row" key={r.label}>
          <span>{r.label}</span>
          <b style={r.tone ? { color: `var(--${r.tone})` } : undefined}>{r.value}</b>
        </div>
      ))}
      <div className="c-proration__total">
        <span>{variant === "downgrade" ? "Charged today" : "Charged today"}</span>
        <b>{total}</b>
      </div>
      {next && <div className="c-proration__next"><span>Next invoice {next.date}</span><span>{next.amount}</span></div>}
      {note && <p style={{ marginTop: 10, fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>{note}</p>}
    </div>
  );
}

/* ========================================================================== *
 * C-15  INVOICE DOCUMENT — a bill someone can audit themselves. Every usage
 * line links through to the ledger rows behind it.
 * ========================================================================== */
export function InvoiceDocument({ invoice, lines, variant = "screen", onDrill = () => {} }) {
  if (variant === "compact") {
    return (
      <div className="card c-invoice c-invoice--compact">
        <div>
          <strong className="num" style={{ fontSize: "var(--text-sm)" }}>{invoice.number}</strong>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>{fmtDate(invoice.date, { withYear: true })}</p>
        </div>
        <span className="num" style={{ fontWeight: 600 }}>{fmtMoney(invoice.total)}</span>
        <span className={`chip ${invoice.status === "paid" ? "chip--green" : "chip--amber"}`}>{invoice.status}</span>
        <button type="button" className="btn btn--sm btn--ghost">Open</button>
      </div>
    );
  }

  return (
    <div className="c-invoice">
      <div className="c-invoice__head">
        <div>
          <p className="c-invoice__num">{invoice.number}</p>
          <div className="c-invoice__meta">
            <span>Issued {fmtDate(invoice.date, { withYear: true })}</span>
            <span>Period 4 Sep – 4 Oct 2026</span>
            <span>HERE Labs · VAT GB 442 118 733</span>
          </div>
        </div>
        <div style={{ textAlign: "right", display: "grid", gap: 6, justifyItems: "end" }}>
          <span className={`chip ${invoice.status === "paid" ? "chip--green" : invoice.status === "past_due" ? "chip--amber" : ""}`}>
            {invoice.status === "past_due" ? "past due · retrying" : invoice.status}
          </span>
          <div className="c-invoice__meta">
            <span>Aman Porwal · @aman</span>
            <span>acc_7fa2</span>
          </div>
        </div>
      </div>

      <div className="tablewrap">
      <table>
        <caption className="sr">Invoice line items</caption>
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col">Qty</th>
            <th scope="col">Unit</th>
            <th scope="col" className="ta-r">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.description}>
              <td>
                {l.description}
                {l.type === "usage" && (
                  <>
                    {" — "}
                    <button type="button" className="c-invoice__link" onClick={() => onDrill(l)}>
                      {fmtCredits(l.credits)} cr
                    </button>
                    {" behind this line"}
                  </>
                )}
              </td>
              <td className="num">{l.qty}</td>
              <td>{l.unit}</td>
              <td className="ta-r">{fmtMoney(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="c-invoice__totals">
        <div className="c-invoice__totrow"><span>Subtotal</span><b>{fmtMoney(invoice.subtotal + invoice.topups + invoice.addons)}</b></div>
        <div className="c-invoice__totrow"><span>VAT at 20%</span><b>{fmtMoney(invoice.tax)}</b></div>
        <div className="c-invoice__totrow c-invoice__grand"><span>Total</span><b>{fmtMoney(invoice.total)}</b></div>
        <div className="c-invoice__totrow"><span>Visa ···· 4142</span><b>{invoice.status === "paid" ? fmtDate(invoice.date) : "—"}</b></div>
      </div>

      <p className="c-invoice__foot">
        Every usage line links to the ledger rows behind it. Something look wrong? Open the line, then Dispute on any row — a
        human reads it, and nothing is re-priced retroactively.
      </p>
    </div>
  );
}

/* ========================================================================== *
 * C-16  DUNNING BANNER — degrade, never delete. The copy IS the component.
 * ========================================================================== */
const DUNNING = {
  retrying: {
    title: "Your card ending 4142 was declined. We'll try again on Tuesday.",
    sub: "Nothing is taken away while we're still trying.",
    actions: ["Update payment method"],
    dismissible: false,
  },
  grace: {
    title: "You're on the free lane while we sort your payment out.",
    sub: "Reading, replay and export all still work. Paid jobs are paused and your guardians are asleep. Nothing has been deleted.",
    actions: ["Update payment method"],
    dismissible: true,
  },
  suspended: {
    title: "Your account is read-only. Nothing has been deleted.",
    sub: "Harbour and Ridge are still working for everyone else in them.",
    actions: ["Update payment method", "Export everything"],
    dismissible: false,
  },
  resolved: {
    title: "You're back. Everything that was paused is running again.",
    sub: null,
    actions: [],
    dismissible: true,
  },
};

export function DunningBanner({ stage = "retrying", onAction = () => {}, onDismiss }) {
  const d = DUNNING[stage];
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <div className={`c-dunning c-dunning--${stage}`} role={stage === "suspended" ? "alert" : "status"}>
      <span aria-hidden="true" style={{ fontWeight: 700 }}>
        {stage === "resolved" ? "✓" : stage === "suspended" ? "×" : "!"}
      </span>
      <div className="c-dunning__body">
        <p className="c-dunning__title">{d.title}</p>
        {d.sub && <p className="c-dunning__sub">{d.sub}</p>}
        {d.actions.length > 0 && (
          <div className="c-dunning__actions">
            {d.actions.map((a, i) => (
              <button key={a} type="button" className={`btn btn--sm ${i === 0 ? "btn--primary" : ""}`} onClick={() => onAction(a)}>
                {a}
              </button>
            ))}
          </div>
        )}
      </div>
      {d.dismissible && (
        <button
          type="button" className="c-dunning__x" aria-label="Dismiss for this session"
          onClick={() => { setGone(true); onDismiss && onDismiss(); }}
        >×</button>
      )}
    </div>
  );
}

/* ========================================================================== *
 * C-17  PAYWALL SHEET — three triggers. Dismiss is always available and
 * always obvious. Never show all four plans.
 * ========================================================================== */
const TRIGGERS = {
  exhausted: {
    context: "You've used September's 500 credits.",
    title: "The slow lane is on, free, for the rest of the month.",
    sub: "Swift model, low queue priority. Nothing is locked and nothing was deleted. Upgrade if you'd rather not wait.",
    secondary: "Stay on the slow lane",
  },
  gated: {
    context: "Cerebral is on Studio and above.",
    title: "Cerebral reads a quarter of Scircle activity and names the patterns.",
    sub: "350 cr per analysis — about $3.50 at Studio's rate. Studio includes 30,000 credits a month.",
    secondary: "Not now",
  },
  value: {
    context: "That render came out well.",
    title: "Three more like it are on Prime.",
    sub: "5,000 credits a month at $0.0078 each — about 65 renders of that length.",
    secondary: "Maybe later",
  },
};

export function PaywallSheet({ trigger = "exhausted", plans, onDismiss = () => {}, onChoose = () => {} }) {
  const t = TRIGGERS[trigger];
  const titleId = useId();
  return (
    <div className="c-paywall" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <p className="c-paywall__context">{t.context}</p>
      <h2 className="c-paywall__title" id={titleId} tabIndex={-1}>{t.title}</h2>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>{t.sub}</p>
      <div className="c-paywall__plans">
        {plans.map((p, i) => (
          <PlanCard key={p.tier} plan={p} state={i === 0 ? "recommended" : "upgrade"} onCta={() => onChoose(p)} />
        ))}
      </div>
      <div className="c-paywall__foot">
        <button type="button" className="btn btn--ghost" onClick={onDismiss}>{t.secondary}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss} aria-label="Close">Close ×</button>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * C-18  CHECKOUT PANEL — we never see, store or handle card data. The button
 * says the amount. Tax is shown before the button, never revealed after.
 * ========================================================================== */
export function CheckoutPanel({
  credits = 2500, subtotal = 25, taxRate = 0.2, state = "default",
  declineReason = "Your bank declined it — insufficient funds.",
  onPay = () => {}, onCancel = () => {}, on3DS = () => {},
}) {
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const processing = state === "processing";

  return (
    <div className={`c-checkout ${processing ? "is-processing" : ""}`} aria-busy={processing}>
      <strong style={{ fontSize: 16 }}>Top up {fmtCredits(credits)} credits</strong>

      <div className="c-checkout__summary">
        <span className="c-checkout__row"><span>{fmtCredits(credits)} cr at $0.0095</span><b>{fmtMoney(subtotal)}</b></span>
        <span className="c-checkout__row"><span>VAT at 20%, included</span><b>{fmtMoney(tax)}</b></span>
        <span className="c-checkout__row" style={{ color: "var(--ink)", fontWeight: 600 }}>
          <span>Total today</span><b>{fmtMoney(total)}</b>
        </span>
      </div>

      {state === "requires-action" ? (
        <div className="c-checkout__3ds">
          <strong>Your bank wants to confirm this payment.</strong>
          <span>Approve {fmtMoney(total)} in your banking app, or use the code they texted you. Nothing is charged until you do.</span>
          <button type="button" className="btn btn--sm btn--primary" onClick={on3DS}>I&rsquo;ve confirmed it</button>
        </div>
      ) : (
        <div className="c-checkout__iframe">
          <span className="lbl">Card details · our payment provider&rsquo;s secure fields</span>
          <span className="c-checkout__field">4242 4242 4242 4242</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <span className="c-checkout__field">11 / 28</span>
            <span className="c-checkout__field">CVC</span>
          </div>
        </div>
      )}

      {state === "declined" && (
        <p className="c-checkout__declined">
          {declineReason} Nothing was charged. Try another card, or a smaller top-up — the minimum is $10.
        </p>
      )}

      <p className="c-checkout__trust">
        <span aria-hidden="true">🔒</span>
        Your card details go straight to our payment provider. We never see them. HERE Labs is the merchant of record;
        VAT is included in the total above.
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        <button type="button" className="btn btn--primary btn--lg btn--block" disabled={processing} onClick={onPay}>
          {processing ? "Processing…" : state === "validating" ? "Checking your card…" : `Pay ${fmtMoney(total)}`}
        </button>
        <button type="button" className="btn btn--ghost btn--block" disabled={processing} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* U4.1 — top-up packs. $10 minimum, and the honest upgrade comparison. */
export function TopUpPacks({ selected, onSelect = () => {}, rate = 0.0095, compareRate = 0.0085 }) {
  const packs = [
    { id: "small", credits: 1100, price: 10, label: "Starter" },
    { id: "maker", credits: 2500, price: 25, label: "Maker" },
    { id: "studio", credits: 11000, price: 100, label: "Workhorse" },
  ];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="wt-cols--4" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(min(170px,100%),1fr))" }}>
        {packs.map((p) => {
          const on = selected === p.id;
          return (
            <button
              key={p.id} type="button"
              className={`c-payer__opt ${on ? "is-selected" : ""}`}
              aria-pressed={on}
              onClick={() => onSelect(p.id)}
            >
              <span className="c-payer__name">{p.label}</span>
              <CreditValue amount={p.credits} size="md" />
              <span className="c-payer__amt">{fmtMoney(p.price)} · ${(p.price / p.credits).toFixed(4)} each</span>
            </button>
          );
        })}
      </div>
      <p className="c-short__compare">
        On Studio these would cost ${compareRate.toFixed(4)}. You&rsquo;d save {fmtMoney(2.5)} a month at your current rate of
        top-ups — and Studio&rsquo;s 30,000 included credits cost $0.0066 each.
      </p>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>
        Minimum top-up $10. Purchased credits expire 12 months after purchase and are spent last, after promo and plan credits.
      </p>
    </div>
  );
}
