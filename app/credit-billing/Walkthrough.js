"use client";

// The Credit & Billing walkthrough. Every component in the spec, every
// variant and state that matters, each one with the user flow it sits in.

import { useEffect, useState } from "react";
import "./money.css";

import {
  STORE, RATE, snapshot, burnSeries, HOSTING_SERIES, WSCB_SERIES,
  fmtCredits, fmtMoney, fmtDate, creditsToFiat, fmtPct, guardianCoverage,
  monthlyStandingCommitment,
} from "./lib/store";
import { CreditValue, FuelGauge, BucketBar, BurnSparkline, MiniStat } from "./lib/primitives";
import {
  GoCard, StandingGoCard, InstantChip, ModelTierPicker, LiveMeter, SettleReceipt,
  InsufficientSheet, SlowLane,
} from "./lib/gate";
import { LedgerRow, LedgerTable, FilterBar, RateVersionBadge, filterLedger } from "./lib/ledger";
import {
  PlanCard, AnnualToggle, ProrationPreview, InvoiceDocument, DunningBanner,
  PaywallSheet, CheckoutPanel, TopUpPacks,
} from "./lib/billing";
import { SharedPoolGauge, PayerPicker, ApprovalCard, SpendRoleMatrix } from "./lib/shared";
import { MetricTile, GuardrailLight, CapacityGauge, HealthChip } from "./lib/operator";
import { StandingMeterCard, SleepWakeSheet } from "./lib/surfaces";
import { ActivationFlow, RunningLowFlow } from "./lib/flows";

const S = snapshot();
const SERIES = burnSeries(STORE, 30);

/* ------------------------------------------------------------- scaffolding */
function Group({ n, id, title, lede, children, kicker }) {
  return (
    <section className="wt-group" id={id}>
      <span className="wt-group__n">{kicker || `Group ${n}`}</span>
      <h2>{title}</h2>
      <p className="wt-group__lede">{lede}</p>
      {children}
    </section>
  );
}

function Comp({ id, name, purpose, children, flow, rules, title }) {
  return (
    <article className="wt-c" id={id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
      <header className="wt-c__head">
        <span className="wt-c__id">[{id}]</span>
        <h3 className="wt-c__name">{name}</h3>
        {title && <span className="chip">{title}</span>}
      </header>
      <p className="wt-c__purpose">{purpose}</p>
      {children}
      {rules && (
        <ul className="wt-rules">
          {rules.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
      {flow && (
        <div className="wt-flow">
          <span className="wt-flow__t">{flow.title || "The user flow"}</span>
          <ol>{flow.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}
    </article>
  );
}

function Case({ label, note, children, grow }) {
  return (
    <div className="wt-case" style={grow ? { flex: "1 1 320px" } : undefined}>
      <span className="wt-case__lbl">{label}</span>
      {children}
      {note && <p className="wt-case__note">{note}</p>}
    </div>
  );
}

const NAV = [
  ["C-01", "Credit value"], ["C-02", "Fuel gauge"], ["C-03", "Bucket bar"], ["C-04", "Burn sparkline"],
  ["C-05", "GO card"], ["C-06", "Tier picker"], ["C-07", "Live meter"], ["C-08", "Settle receipt"],
  ["C-09", "Not enough credits"], ["C-10", "Ledger row"], ["C-11", "Filter bar"], ["C-12", "Rate badge"],
  ["C-13", "Plan card"], ["C-14", "Proration"], ["C-15", "Invoice"], ["C-16", "Dunning"],
  ["C-17", "Paywall"], ["C-18", "Checkout"], ["C-19", "Shared pool"], ["C-20", "Payer picker"],
  ["C-21", "Approval"], ["C-22", "Spend roles"], ["C-23", "Metric tile"], ["C-24", "Guardrail"],
  ["C-25", "Capacity"], ["C-26", "Health chip"], ["C-27", "Standing meter"], ["C-28", "Sleep / wake"],
];

/* ================================================================== page */
export default function Walkthrough() {
  const [theme, setTheme] = useState("system");
  const [annual, setAnnual] = useState(false);
  const [filters, setFilters] = useState({ q: "" });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [checkout, setCheckout] = useState("default");
  const [payer, setPayer] = useState("personal");
  const [tier, setTier] = useState("standard");
  const [role, setRole] = useState("spender");
  const [paywall, setPaywall] = useState("exhausted");

  // A GO card demo that can be opened and cancelled like the real thing.
  const [goOpen, setGoOpen] = useState("job");

  const filtered = filterLedger(STORE.ledger, filters);
  const plans = RATE.plans;
  const standing = monthlyStandingCommitment(STORE.surfaces);

  useEffect(() => {
    document.documentElement.style.setProperty("color-scheme", "light dark");
  }, []);

  return (
    <div className="money money-page" data-theme={theme === "system" ? undefined : theme}>
      <div className="wt-top">
        <div className="wt-top__in">
          <span className="wt-top__brand">NOW · <span>Credit &amp; Billing</span></span>
          <span className="chip">spec 2.0 · 28 components</span>
          <span className="wt-top__spacer" />
          <div style={{ display: "flex", gap: 6 }} role="group" aria-label="Theme">
            {["light", "dark", "system"].map((t) => (
              <button
                key={t} type="button"
                className={`btn btn--sm ${theme === t ? "btn--primary" : "btn--ghost"}`}
                aria-pressed={theme === t}
                onClick={() => setTheme(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="money-wrap">
        <header className="wt-hero">
          <h1>The credit and billing surfaces, component by component</h1>
          <p>
            Every component in the money spec, built from HERE&rsquo;s real tokens, shown in the variants and states that
            decide whether the design works — and beneath each one, the user flow it belongs to. The two prototype flows at
            the end are wired to an append-only ledger: holds actually reserve, settlement actually releases the
            difference, and a failed job charges a numerically unchanged balance.
          </p>
          <div className="wt-hero__facts">
            <span className="chip">balance {fmtCredits(S.balance)} cr · {fmtMoney(S.fiat)}</span>
            <span className="chip chip--amber">{fmtCredits(S.held)} cr held</span>
            <span className="chip">burn {fmtCredits(S.burn)} cr/day</span>
            <span className="chip chip--info">standing {fmtCredits(standing)} cr/mo</span>
            <span className="chip chip--risk">runway {S.runway.days} days · {fmtDate(S.runway.date)}</span>
          </div>
          <nav className="wt-nav" aria-label="Components">
            {NAV.map(([id, name]) => (
              <a key={id} href={`#${id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><b>{id}</b>{name}</a>
            ))}
            <a href="#flows"><b>PART 8</b>The wired flows</a>
            <a href="#screens"><b>PART 7</b>Assembled screens</a>
          </nav>
        </header>

        {/* ============================================ GROUP 1 — PRIMITIVES */}
        <Group
          n="1" id="g1" title="Money primitives"
          lede="Build these four first; everything else in the library is made of them. Their job is consistency: if every credit number in the product goes through C-01, no two numbers can ever disagree in format, alignment or colour."
        >
          <Comp
            id="C-01" name="Credit value"
            purpose="The atom. A credit amount, rendered the same way everywhere it appears — tabular numerals, thousands separators, integers only, and a reserved width so a ticking balance never moves a pixel of anything around it."
            rules={[
              "font-variant-numeric: tabular-nums on every amount, always.",
              "Credits are integers. Currency gets two decimal places. Never a decimal credit.",
              "The words are “credits” and “cr”. Never tokens, points, coins or units.",
            ]}
            flow={{
              title: "Where the user meets it",
              steps: [
                "Every screen. The same 5,985 in the wallet gauge, the ledger row, the invoice line and the receipt is this component with a different size prop — which is why the four screens can never disagree.",
                "The delta variant carries a sign always, so a refund reads as money coming back rather than as another charge.",
                "The estimate variant is the only one allowed to be approximate, and it always shows its band.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-row">
                <Case label="plain"><CreditValue amount={5985} size="lg" /></Case>
                <Case label="withCurrency"><CreditValue amount={5985} variant="withCurrency" size="lg" stack /></Case>
                <Case label="delta, negative"><CreditValue amount={-30} variant="delta" size="lg" /></Case>
                <Case label="delta, positive"><CreditValue amount={75} variant="delta" size="lg" /></Case>
                <Case label="held"><CreditValue amount={42} variant="held" size="lg" /></Case>
                <Case label="estimate + band"><CreditValue amount={55} variant="estimate" size="lg" band={[50, 62]} /></Case>
              </div>
              <div className="wt-row">
                <Case label="sm 13"><CreditValue amount={5985} size="sm" /></Case>
                <Case label="md 15"><CreditValue amount={5985} size="md" /></Case>
                <Case label="lg 22"><CreditValue amount={5985} size="lg" /></Case>
                <Case label="xl 34"><CreditValue amount={5985} size="xl" /></Case>
                <Case label="muted, in a disabled row"><CreditValue amount={5985} size="lg" state="muted" /></Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-02" name="Fuel gauge"
            purpose="Remaining balance as a proportion, not just a number. A visible usage bar makes a limit feel transparent rather than punitive, which is why this is the single most-looked-at element in the wallet."
            rules={[
              "role=“meter” with valuenow/min/max and a sentence-shaped label.",
              "A missing value shows dashes, never 0 — unknown must not read as an empty wallet.",
              "Animates over 400ms; snaps under prefers-reduced-motion.",
            ]}
            flow={{
              steps: [
                "The user opens NOW. The ring answers “how much have I got” before they read a word — the tone alone (teal, amber, red) answers “should I care”.",
                "Under 40% it turns amber and the sub-label starts quoting time rather than credits: “about 1 day”.",
                "At zero it does not lock: the sub-label reads “you’re in the slow lane” and hands off to C-09 the next time a paid action is attempted.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-row">
                <Case label="ring · healthy" note="above 40% of the cycle allotment">
                  <FuelGauge remaining={5985} total={7500} sub="credits left" />
                </Case>
                <Case label="ring · low" note="15–40%: amber, and the sub-label starts quoting time">
                  <FuelGauge remaining={340} total={2000} sub="credits left · about 1 day" />
                </Case>
                <Case label="ring · at risk" note="under 15%">
                  <FuelGauge remaining={190} total={5000} sub="credits left · runs out today" />
                </Case>
                <Case label="ring · empty" note="a speed limit, not a locked door">
                  <FuelGauge remaining={0} total={5000} sub="you're in the slow lane" />
                </Case>
              </div>
              <div className="wt-row">
                <Case label="ring · unknown" note="dashes, never a zero">
                  <FuelGauge remaining={0} total={5000} unknown sub="" />
                </Case>
                <Case label="ring · loading"><FuelGauge remaining={0} total={1} loading /></Case>
                <Case label="ring · healthy band + cap marker" note="band [0.6,0.8] is the healthy burn-depth zone">
                  <FuelGauge remaining={1855} total={5000} band={[0.6, 0.8]} capMarker={4000} sub="burned this cycle" tone="ok" />
                </Case>
              </div>
              <div className="wt-cols">
                <Case label="bar" note="lists and cards">
                  <FuelGauge remaining={8420} total={20000} variant="bar" capMarker={16000} sub="8,420 of 20,000 cr left in Harbour" />
                </Case>
                <Case label="inline" note="beside a label in a table row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "var(--text-sm)" }}>Ridge</span>
                    <FuelGauge remaining={1180} total={5000} variant="inline" />
                    <CreditValue amount={1180} size="sm" />
                  </div>
                </Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-03" name="Bucket bar"
            purpose="The four wallet buckets as one stacked bar, in spend order, with their expiry dates. Bucket order is the thing users most often suspect a credit product of cheating on; showing the order is the defence."
            rules={[
              "Segment order is always promo → plan → purchased → overdraft. Never sorted by size.",
              "“Spends soonest-to-expire first” is always visible, never a tooltip.",
              "The bar is aria-hidden; the legend is the accessible content.",
            ]}
            flow={{
              steps: [
                "After a GO settles, the user watches which segment shrank — the promo bucket goes first, exactly as the line under the bar promised.",
                "A bucket inside seven days of expiry pulses and its legend row turns amber: “expires in 3 days”. That is the nudge that turns breakage into usage.",
                "Tapping a legend row opens U3.2, the ledger filtered to that bucket, so “where did the welcome grant go” is one click, not a support ticket.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols">
                <Case label="full · with an expiring bucket" note="promo expires in 3 days — the segment pulses and the legend row turns amber">
                  <div className="card"><BucketBar buckets={STORE.buckets} now={STORE.now} /></div>
                </Case>
                <Case label="one bucket only" note="still labelled, still states the spend order">
                  <div className="card">
                    <BucketBar
                      buckets={[{ id: "b1", bucket: "plan", remaining: 5000, source: "Signal, September", expires_at: "2026-10-04T00:00:00Z" }]}
                      now={STORE.now}
                    />
                  </div>
                </Case>
                <Case label="empty" note="a grey track and the words, never a zero-width bar">
                  <div className="card"><BucketBar buckets={[]} now={STORE.now} /></div>
                </Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-04" name="Burn sparkline"
            purpose="Daily burn over time, with an optional dashed forecast tail. It turns &ldquo;am I spending a lot?&rdquo; into an answer without a single number being read. Standing charges are excluded from the series, because a recurring monthly draw folded into a daily curve makes the curve lie."
            rules={[
              "Chart text takes its colour from theme tokens so it reads in both themes.",
              "Fewer than three days of history: hide the tail and say so, never draw a guess.",
              "All zeros shows the baseline and “no spend yet”, never an empty box.",
            ]}
            flow={{
              steps: [
                "On the wallet the card variant sits under the gauge; hovering any day gives “Thu 18 Sep · 431 cr”.",
                "On U3.7 the full variant adds the dashed forecast and the runway marker — this is where a user first sees the date they run out.",
                "The inline variant is the sparkline inside every operator metric tile, so a number and its trend are never separated.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="card · 30 days, hover for a readout">
                  <div className="card"><BurnSparkline series={SERIES} variant="card" /></div>
                </Case>
                <Case label="full · forecast tail, cap line, runway marker">
                  <div className="card">
                    <BurnSparkline series={SERIES} variant="full" forecast capLine={400} runwayLabel={`runs out ${fmtDate(S.runway.date)}`} />
                  </div>
                </Case>
              </div>
              <div className="wt-cols">
                <Case label="inline · 40px, no axes"><div className="card"><BurnSparkline series={SERIES.slice(-14)} variant="inline" /></div></Case>
                <Case label="flat · all zeros"><div className="card"><BurnSparkline series={SERIES.map((d) => ({ ...d, credits: 0 }))} variant="card" /></div></Case>
                <Case label="single point · a dot, not a line"><div className="card"><BurnSparkline series={[SERIES[0]]} variant="card" /></div></Case>
                <Case label="empty · says what to do next"><div className="card"><BurnSparkline series={[]} variant="card" /></div></Case>
              </div>
            </div>
          </Comp>
        </Group>

        {/* ================================================= GROUP 2 — GATE */}
        <Group
          n="2" id="g2" title="The gate"
          lede="The signature of the product. Nothing paid ever runs without a GO that shows the cost first, and the complaint this whole group is designed against is the one in every credit-product teardown: I can't tell what an action costs until after it runs."
        >
          <Comp
            id="C-05" name="GO card" title="three variants"
            purpose="The authorisation moment. In one glance: what is about to happen, which model will do it, what it will cost, and what the worst case is. Instant actions get a chip rather than a dialog, jobs get the canonical card, and anything recurring gets a card that cannot be authorised without a budget, an expiry and a stop condition."
            rules={[
              "Cancel is a real button of equal visual weight. Escape closes. The backdrop closes. There is no dark pattern in this component.",
              "Focus starts on the headline, never on GO — Enter must never be an accidental purchase.",
              "On GO: a hold of estimate × 1.2. On Cancel: nothing is created — no hold, no row, no charge, ever.",
              "A standing job stops by default rather than continuing by default.",
            ]}
            flow={{
              steps: [
                "The user presses a paid action. The card opens with Standard preselected and the estimate already computed — they never see a spinner where a price should be.",
                "They change the tier. The estimate recalculates in front of them, in a 200ms count. This is the moment the pricing model becomes legible.",
                "They raise or lower the cap. The hint is a promise: we will stop rather than go past it.",
                "GO creates the hold and hands to C-07. Cancel returns them exactly where they were, with nothing written.",
                "If the balance cannot cover the hold, the card hands off to C-09 rather than refusing — the dead end is the thing being designed out.",
                "Over a Scircle threshold, GO becomes “Request approval” and names who can give it (C-21).",
              ],
            }}
          >
            <div className="wt-demo">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["instant", "C-05a instant"], ["job", "C-05b job"], ["standing", "C-05c standing"], ["states", "C-05b states"]].map(([k, l]) => (
                  <button
                    key={k} type="button"
                    className={`btn btn--sm ${goOpen === k ? "btn--primary" : ""}`}
                    onClick={() => setGoOpen(k)}
                  >{l}</button>
                ))}
              </div>

              {goOpen === "instant" && (
                <div className="wt-cols">
                  <Case label="chip · counting" note="A persistent chip, bottom-right. Interrupting someone to approve 3 credits is worse than the charge.">
                    <InstantChip
                      sessionTotal={42}
                      actions={[
                        { what: "Room turn", tier: "Standard", cost: 6 },
                        { what: "Muse tool call", tier: "—", cost: 2 },
                        { what: "Web extraction, 4 pages", tier: "—", cost: 4 },
                        { what: "Room turn", tier: "Deep", cost: 15 },
                      ]}
                      defaultOpen
                    />
                  </Case>
                  <Case label="chip · paused" note="One switch stops all metered actions without leaving the room.">
                    <InstantChip sessionTotal={42} paused actions={[]} />
                  </Case>
                </div>
              )}

              {goOpen === "job" && (
                <div className="wt-backdrop">
                  <GoCard
                    tool="capture.transcribe" version={3}
                    headline="Transcribe this recording"
                    detail="Standup — 18 min 24 s · 3 cr per audio minute"
                    baseCost={55} balance={S.balance} held={S.held}
                    scircle={STORE.scircles[0]}
                    payerPicker={
                      <PayerPicker
                        personal={S.available} estimate={55} selected={payer} onSelect={setPayer}
                        pool={{ name: "Harbour", remaining: 8420, approval_threshold: 200 }}
                      />
                    }
                  />
                </div>
              )}

              {goOpen === "standing" && (
                <div className="wt-backdrop">
                  <StandingGoCard
                    tool="capture.live" version={2}
                    headline="Go live from Harbour"
                    detail="Live production" ratePerUnit={15} unitLabel="stream minute"
                    balance={S.balance}
                  />
                </div>
              )}

              {goOpen === "states" && (
                <div className="wt-cols wt-cols--2">
                  <Case label="over cap" note="GO stays enabled and relabels itself. We stop; we do not silently exceed.">
                    <GoCard
                      tool="media.video" version={1} headline="Generate a 15 second clip"
                      detail="Cinematic · 200 cr per 5 seconds" baseCost={600}
                      balance={S.balance} held={S.held} rememberEligible={false}
                    />
                  </Case>
                  <Case label="approval required · loading estimate · insufficient" note="Left to right in one card set: the Cerebral job is over Harbour's 200 cr threshold, so GO becomes a request naming the approver.">
                    <GoCard
                      tool="cerebral.analyse" version={1} headline="Read the quarter's patterns"
                      detail="Cerebral analysis · one run" baseCost={350}
                      balance={S.balance} held={S.held}
                      scircle={STORE.scircles[0]} approver="Tomas"
                      disabledTiers={["cinematic"]}
                    />
                  </Case>
                </div>
              )}
            </div>
          </Comp>

          <Comp
            id="C-06" name="Model tier picker"
            purpose="Lets a person choose how much intelligence to spend, and shows the cost changing as they choose. The multipliers track our cost exactly, so margin is identical whichever tier they pick — which is why this can be genuinely open, and why that openness is hard for a competitor to copy."
            rules={[
              "Show the cost for THIS job on every tier. “75 cr” is actionable; “×2.5” is homework.",
              "role=radiogroup with arrow-key navigation; a locked tier says which plan unlocks it.",
              "Selecting recalculates the parent estimate immediately — never a confirm inside the picker.",
            ]}
            flow={{
              steps: [
                "Inside the GO card the user sees four prices for the same job. Most people take the recommendation and move on in under a second.",
                "Someone cost-sensitive drops to Swift and watches 55 become 28. Someone doing something that matters picks Deep and accepts 138 with their eyes open.",
                "A tier their plan does not include is greyed with a lock and the plan that unlocks it — the upgrade case is made by the price list, not by a banner.",
              ],
            }}
          >
            <div className="wt-demo">
              <Case label="live · this is a real 18-minute transcription priced at every tier" note={`Selected: ${tier}. Standard is the default and usually the recommendation; Cinematic is locked on Prime.`}>
                <div className="card">
                  <ModelTierPicker baseCost={55} selected={tier} onSelect={setTier} disabled={["cinematic"]} />
                  <p style={{ marginTop: 14, fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
                    Estimate now{" "}
                    <CreditValue
                      amount={Math.round(55 * (RATE.tiers.find((t) => t.id === tier)?.multiplier ?? 1))}
                      variant="estimate" size="md"
                    />{" "}
                    · {fmtMoney(creditsToFiat(55 * (RATE.tiers.find((t) => t.id === tier)?.multiplier ?? 1)))} of list value
                  </p>
                </div>
              </Case>
              <Case label="price-loading" note="A dash, never a zero. A zero price is a promise you cannot keep.">
                <div className="card"><ModelTierPicker baseCost={55} loading /></div>
              </Case>
            </div>
          </Comp>

          <Comp
            id="C-07" name="Live meter"
            purpose="A job actually running and consuming, against its hold. It turns waiting into watching and makes the cap feel real. Stop actually stops, and settles only what was measured — a cancel that still charges the full estimate is the fastest way to lose a user permanently."
            rules={[
              "aria-live=“polite” on the credit figure, throttled to once every five seconds.",
              "At 80% of the cap the bar turns amber and says so; at 100% the job stops itself and settles as a partial.",
              "Stop settles the measured units, and the copy says which units those were.",
            ]}
            flow={{
              steps: [
                "GO closes and this appears in its place. The units tick up against the estimate, the credits tick up against the cap.",
                "If the job runs long, the cap catches it before the balance does — the user set that number a moment ago, so the stop is theirs, not ours.",
                "Stop mid-run hands to C-08 as a partial: “you paid for the 14.2 minutes we measured”.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="starting" note="Indeterminate bar. No fake percentage before we know anything.">
                  <LiveMeter tool="capture.transcribe v3" headline="Transcribe — standup, 18m" unitsDone={0} unitsEstimate={18.4} unitLabel="audio minutes" creditsSoFar={0} cap={80} elapsedSeconds={1} state="starting" />
                </Case>
                <Case label="counting">
                  <LiveMeter tool="capture.transcribe v3" headline="Transcribe — standup, 18m" unitsDone={14.2} unitsEstimate={18.4} unitLabel="audio minutes" creditsSoFar={43} cap={80} elapsedSeconds={52} state="counting" />
                </Case>
                <Case label="near cap · 80%">
                  <LiveMeter tool="capture.render v2" headline="Render — cut 03" unitsDone={3.2} unitsEstimate={3.8} unitLabel="output minutes" creditsSoFar={65} cap={80} elapsedSeconds={98} state="near-cap" />
                </Case>
                <Case label="at cap · stops itself">
                  <LiveMeter tool="capture.render v2" headline="Render — cut 03" unitsDone={3.7} unitsEstimate={3.8} unitLabel="output minutes" creditsSoFar={80} cap={80} elapsedSeconds={121} state="at-cap" />
                </Case>
                <Case label="cancelling">
                  <LiveMeter tool="capture.transcribe v3" headline="Transcribe — standup, 18m" unitsDone={14.2} unitsEstimate={18.4} unitLabel="audio minutes" creditsSoFar={43} cap={80} elapsedSeconds={54} state="cancelling" />
                </Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-08" name="Settle receipt"
            purpose="The moment trust is either built or lost. It shows that we charged less than we quoted and returns the difference in front of them. The failed variant is three elements and one sentence, and it is the highest trust-per-pixel screen in the product."
            rules={[
              "Always state all three numbers: held, used, returned. “55 cr” alone is a worse experience than “held 60, used 55, kept 5”, even though it is the same money.",
              "The failed variant never uses apologetic corporate language and never routes to a support form. The primary action is a free retry.",
              "Charged is always ≤ quoted. Never once more.",
            ]}
            flow={{
              steps: [
                "The job finishes. The toast variant appears bottom-right for six seconds on routine work; the panel variant stays put inside the tool for anything the user was watching.",
                "The three-cell held / used / returned strip is the whole argument: the estimate was an estimate, and the difference came back.",
                "“See receipt” opens U3.5, the full page variant, with every field the ledger holds — including the rate version, so the receipt stays true after a price change.",
                "On failure the balance is unchanged and the retry is labelled free. The user is not asked to do anything else.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="completed · panel">
                  <SettleReceipt outcome="completed" held={60} used={55} returned={5} balanceAfter={5930} headline="Transcribe — standup, 18m" jobId="job_2280" onReceipt={() => {}} />
                </Case>
                <Case label="partial · stopped at the cap">
                  <SettleReceipt outcome="partial" held={96} used={43} returned={53} balanceAfter={5942} measuredNote="14.2 minutes" headline="Transcribe — standup, 18m" onReceipt={() => {}} />
                </Case>
                <Case label="failed · our side" note="Reassuring, not alarming. The hold is back and the retry is free.">
                  <SettleReceipt outcome="failed" held={75} used={0} returned={75} balanceAfter={5985} headline="Render — cut 03" jobId="job_2274" onRetry={() => {}} />
                </Case>
                <Case label="completed · toast, 6s" note="For routine completions that nobody is watching.">
                  <SettleReceipt variant="toast" outcome="completed" held={36} used={30} returned={6} balanceAfter={5955} headline="Summarise this week in Harbour" onDismiss={() => {}} />
                </Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-09" name="Not enough credits"
            purpose="The revenue moment, handled honestly. It appears when the available balance is below estimate × 1.2, and it never charges automatically. Auto-recharge fires only if the user turned it on themselves, and when it does it announces itself before running."
            rules={[
              "Always all four options, always in this order: top up, a cheaper tier, a smaller scope, cancel.",
              "The honest comparison sits beside the top-up: on Studio these credits cost less, and here is the monthly saving as a number.",
              "Zero reaches the slow lane, not a dead end. Swift, low priority, free, with one tap out.",
            ]}
            flow={{
              steps: [
                "The GO card computes an estimate the balance cannot cover and hands off here, mid-intent. The user wanted something; the sheet's job is to keep that possible.",
                "Four routes out. Two of them cost nothing: run it smaller, or run it on Swift.",
                "The slow-lane option is offered as an equal, not as a punishment — this is the deliberate steal from Relax Mode, and it converts better over thirty days than a wall does.",
                "A Scircle pool appears as a fifth route when one exists, and names that pool spend is visible to everyone in it.",
                "Top up leads to U4.1 and C-18, then straight back to the GO card, which is still holding the user's intent.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="default · 18 credits short">
                  <InsufficientSheet needed={55} available={37} swiftCost={28} trimCost={30} trimNote="Just the first 10 minutes" />
                </Case>
                <Case label="slow lane + pool available" note="Both free routes are visible before any paid one is pressed.">
                  <InsufficientSheet
                    needed={55} available={37} heldByJobs={42} swiftCost={28}
                    slowLane={{ queuePosition: 4 }} pool={{ name: "Harbour", remaining: 8420 }}
                  />
                </Case>
                <Case label="auto-recharge armed" note="It still asks. A silent charge is the thing this sheet exists to prevent.">
                  <InsufficientSheet needed={55} available={37} swiftCost={28} autoRecharge={{ amount: 2500, price: 25 }} />
                </Case>
                <Case label="U4.6 · the slow lane itself">
                  <SlowLane queuePosition={4} />
                </Case>
              </div>
            </div>
          </Comp>
        </Group>

        {/* =============================================== GROUP 3 — LEDGER */}
        <Group
          n="3" id="g3" title="Ledger and history"
          lede="&ldquo;Where did my credits go&rdquo; is the top support question in every credit product. These three components exist so it is never asked — and the ledger is a real table, because finance people will want to select and copy it."
        >
          <Comp
            id="C-10" name="Ledger row"
            purpose="One entry in the append-only history: scannable in bulk, fully explainable on demand. The summary line is written in the user's words; the tool identifier, the rate version and the held-versus-settled arithmetic live in the expansion."
            rules={[
              "Six types, each visually distinguishable: grant, spend, refund, expiry, adjustment and standing — plus the pending hold.",
              "The pending hold is pinned at the top, italic, and excluded from the running balance column.",
              "A failed spend is struck through and links to the refund row that voided it.",
              "Reasons are the user’s words: “Transcribe — standup, 18m”, never “capture.transcribe invocation 2280”.",
            ]}
            flow={{
              steps: [
                "The user wonders what a charge was. They open NOW, scan the reason column, and stop at the row they recognise.",
                "They expand it. Units measured, the rate applied, the rate version, who authorised it, which Scircle, who paid — enough to settle the question without asking anyone.",
                "From the expansion they can re-run the same work, open the full receipt, or dispute it. Dispute adds a chip to the row and nothing is re-priced.",
              ],
            }}
          >
            <div className="wt-demo">
              <Case label="all six types plus the pending hold" note="Expand any row. The standing row is a Tier 8 hosting charge — filterable separately, because folding recurring charges into weekly burn tells you nothing about engagement.">
                <div className="card tablewrap" style={{ padding: 0 }}>
                  <table className="c-ledger">
                    <caption className="sr">One row of each ledger type</caption>
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
                      {STORE.holds.map((h) => <LedgerRow key={h.id} entry={{ ...h, type: "hold" }} expandable={false} />)}
                      {["le_221", "le_219", "le_218", "le_214", "le_212", "le_201", "le_188"].map((id, i) => {
                        const e = STORE.ledger.find((x) => x.id === id);
                        return <LedgerRow key={id} entry={e} runningBalance={S.balance - i * 30} />;
                      })}
                    </tbody>
                  </table>
                </div>
              </Case>
              <Case label="loading">
                <LedgerTable entries={[]} openingBalance={0} loading />
              </Case>
            </div>
          </Comp>

          <Comp
            id="C-11" name="Filter bar"
            purpose="Narrows the ledger or any operator table. Filters apply live with no Apply button, and the filter state belongs in the URL so a filtered view can be linked — which is what makes it useful to support."
            rules={[
              "No-results copy names the filters: “No entries match Tool: render + Sep 1–14.”",
              "Saved views exist because finance people return to the same three filters every month.",
              "Filter state lives in the query string so a view can be shared.",
            ]}
            flow={{
              steps: [
                "A user asks “what did hosting cost me?”. Type: standing narrows twelve entries to two, and the count chip confirms it.",
                "Support asks for the render charges. One facet, one link, sent — nobody reads an id out loud.",
                "A dead end offers both exits: clear the filters, or widen the range. Never a bare “nothing found”.",
              ],
            }}
          >
            <div className="wt-demo">
              <Case label="live · filter the real twelve-row ledger" note={`${filtered.length} of ${STORE.ledger.length} entries match. Try Type: standing, or search "render".`}>
                <LedgerTable
                  entries={filtered} holds={filters.q || Object.keys(filters).length > 1 ? [] : STORE.holds}
                  openingBalance={S.balance} active={filters} onChange={setFilters}
                />
              </Case>
            </div>
          </Comp>

          <Comp
            id="C-12" name="Rate version badge"
            purpose="Small but load-bearing. It shows which version of the rate card a charge was made under, so an old receipt stays true forever after prices change. This badge is the visible proof of that promise, and it is the thing that makes a price change safe to make."
            rules={[
              "Historical rows keep the rate version they were charged at. History is never re-priced.",
            ]}
            flow={{
              steps: [
                "Prices change on 1 September. A user opens an August receipt.",
                "The badge is amber and says “rate of 1 Aug”; the tooltip says rates have changed since and this charge is unaffected.",
                "Nothing else on the receipt moves. The number they were charged is the number they still see.",
              ],
            }}
          >
            <div className="wt-demo wt-demo--plain">
              <div className="wt-row">
                <Case label="current"><RateVersionBadge version="rc_2026_09_01" /></Case>
                <Case label="historical · hover for the promise"><RateVersionBadge version="rc_2026_08_01" /></Case>
              </div>
            </div>
          </Comp>
        </Group>

        {/* ============================================== GROUP 4 — BILLING */}
        <Group
          n="4" id="g4" title="Plans and billing"
          lede="The part of the product that takes money. Its distinguishing feature is arithmetic: effective cost per credit next to the top-up rate on every card, proration shown before it is committed, and an invoice whose usage lines link to the ledger rows behind them."
        >
          <Comp
            id="C-13" name="Plan card"
            purpose="One tier in the comparison, including the column no competitor shows: effective cost per credit. A Prime member's included credits cost $0.0078 and their top-ups cost $0.0095 — so the moment they top up regularly, Studio is visibly cheaper for them. You are not upselling, you are showing arithmetic."
            rules={[
              "Effective $/credit and the top-up rate appear on every card.",
              "The annual toggle shows the saving as a number, never just “-17%”.",
              "The current plan’s CTA is disabled and labelled “Current” — never a live button that does nothing.",
            ]}
            flow={{
              steps: [
                "A user tops up twice in a month. The wallet notices and links them to U5.2.",
                "They compare the two rate lines on their own card and see that their real cost per credit is not the plan rate, it is the top-up rate.",
                "One card up, the same arithmetic reads better. The upgrade is their conclusion, not our pitch — which is why it does not feel like one.",
              ],
            }}
          >
            <div className="wt-demo">
              <AnnualToggle on={annual} onChange={setAnnual} />
              <div className="wt-plans">
                <PlanCard plan={plans[0]} state="downgrade" annual={annual} />
                <PlanCard plan={plans[1]} state="current" annual={annual} />
                <PlanCard plan={plans[2]} state="recommended" annual={annual} />
                <PlanCard plan={plans[3]} state="upgrade" annual={annual} />
              </div>
            </div>
          </Comp>

          <Comp
            id="C-14" name="Proration preview"
            purpose="The arithmetic of a plan change, before it is committed. It removes the single biggest source of billing support tickets, and it is the component that makes a downgrade safe to offer — because a downgrade must never imply credits are lost when they are not."
            rules={[
              "A downgrade charges nothing today and says so in those words.",
              "If the proration cannot be computed, say so and disable the CTA. Never guess a number someone will be charged.",
            ]}
            flow={{
              steps: [
                "The user picks Studio on U5.2 and lands on U5.3. Four lines, a total, and the effective date — nothing is charged yet.",
                "They see their existing 5,985 credits are kept with their expiry unchanged. That line is the one that stops the support ticket.",
                "They commit. The credits land immediately on an upgrade; on a downgrade nothing moves until the period ends.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="upgrade · charges today">
                  <div className="card">
                    <ProrationPreview
                      variant="upgrade"
                      rows={[
                        { label: "Studio, 14 days remaining", value: "+ $92.87" },
                        { label: "Prime, unused 14 days", value: "− $18.20", tone: "green" },
                        { label: "Credits added now", value: "+ 25,000 cr" },
                        { label: "Your existing 5,985 cr", value: "kept, expiry unchanged" },
                      ]}
                      total="$74.67" next={{ date: "4 Oct", amount: "$199.00" }}
                    />
                  </div>
                </Case>
                <Case label="downgrade · nothing today">
                  <div className="card">
                    <ProrationPreview
                      variant="downgrade"
                      rows={[
                        { label: "Studio until 4 October", value: "no change" },
                        { label: "Prime from 4 October", value: "$39.00 / month" },
                        { label: "Your 5,985 cr", value: "unaffected" },
                      ]}
                      total="$0.00" next={{ date: "4 Oct", amount: "$39.00" }}
                      note="You keep Studio until 4 October. Your 5,985 credits are unaffected."
                    />
                  </div>
                </Case>
                <Case label="loading · CTA disabled"><div className="card"><ProrationPreview loading /></div></Case>
                <Case label="error · never a guess"><div className="card"><ProrationPreview error /></div></Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-15" name="Invoice document"
            purpose="A bill someone can audit themselves. An invoice you can check is an invoice you do not dispute — so every usage line links through to exactly the ledger rows behind it. That single affordance is worth more than any amount of billing FAQ."
            rules={[
              "Clicking the credit figure on a usage line opens the ledger filtered to those entries.",
              "A print stylesheet exists: no chrome, black on white.",
            ]}
            flow={{
              steps: [
                "The invoice email arrives. The user opens the document, scans four line types — subscription, top-up, add-on, overage.",
                "The overage line looks unfamiliar. They click the credit figure and land in the ledger, filtered to the rows that produced it.",
                "They recognise the work, close the tab, and do not write to support. That is the whole design goal.",
              ],
            }}
          >
            <div className="wt-demo">
              <Case label="screen · paid">
                <InvoiceDocument
                  invoice={STORE.invoices[0]}
                  lines={[
                    { description: "Prime — 4 Sep to 4 Oct", qty: 1, unit: "month", amount: 39.0, type: "subscription" },
                    { description: "Top-up — Maker pack, 2,500 cr", qty: 1, unit: "pack", amount: 25.0, type: "topup" },
                    { description: "Overage — 1,240 cr at $0.0095", qty: 1240, unit: "credits", amount: 11.78, type: "usage", credits: 1240 },
                    { description: "Live surfaces — Ridge status board", qty: 1, unit: "month", amount: 61.5, type: "usage", credits: 6150 },
                  ]}
                />
              </Case>
              <div className="wt-cols">
                <Case label="compact · the list row"><InvoiceDocument variant="compact" invoice={STORE.invoices[0]} lines={[]} /></Case>
                <Case label="compact · past due"><InvoiceDocument variant="compact" invoice={{ ...STORE.invoices[1], status: "past_due", number: "HERE-1004" }} lines={[]} /></Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-16" name="Dunning banner"
            purpose="A failed payment communicated without punishing the user. The governing principle is degrade, never delete — and the copy is the component. One person's card failing must never break a shared Scircle for everyone else in it, and stage three says so explicitly."
            rules={[
              "Nothing is taken away while we are still retrying.",
              "Nothing is deleted before day 30, and cancellation opens a 60-day export window.",
              "No guilt language at any stage.",
            ]}
            flow={{
              steps: [
                "Day 1 — the card declines. Amber banner, full access, and the date of the next attempt. No access is withdrawn while we are still trying.",
                "Day 7 — grace. Paid jobs pause, guardians sleep, reading and export keep working, and the banner names all three.",
                "Day 14 — read-only. The banner states that nothing was deleted and that their Scircles still work for everyone else. Export everything sits next to Update payment.",
                "Resolved — green, eight seconds, then gone: everything that was paused is running again.",
              ],
            }}
          >
            <div className="wt-demo" style={{ gap: 12 }}>
              <DunningBanner stage="retrying" />
              <DunningBanner stage="grace" />
              <DunningBanner stage="suspended" />
              <DunningBanner stage="resolved" />
            </div>
          </Comp>

          <Comp
            id="C-17" name="Paywall sheet"
            purpose="Converts a free user, through three triggers that convert differently — so all three are built as distinct entry contexts of one component and measured separately. At the moment of exhaustion the free fallback leads: a paywall at that moment reads as a hostage situation, while the slow lane reads as generous and converts better over thirty days."
            rules={[
              "Dismiss is always available and always obvious. A paywall you cannot close is the most-screenshotted dark pattern on the internet.",
              "Never show all four plans — the one that fits plus one step up. The full comparison lives on U5.2.",
              "The value-moment trigger fires at most once a week.",
            ]}
            flow={{
              steps: [
                "Exhausted: the allotment runs out. The slow lane is offered first, the upgrade second.",
                "Feature-gated: they reach for Cerebral on Prime. The sheet explains what it does and what one run costs, rather than only what it costs to unlock.",
                "Value-moment: a render comes out well, and the sheet says three more like it are on Prime. Softest trigger, highest conversion.",
              ],
            }}
          >
            <div className="wt-demo">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["exhausted", "a · exhausted"], ["gated", "b · feature-gated"], ["value", "c · value-moment"]].map(([k, l]) => (
                  <button key={k} type="button" className={`btn btn--sm ${paywall === k ? "btn--primary" : ""}`} onClick={() => setPaywall(k)}>{l}</button>
                ))}
              </div>
              <div className="wt-backdrop">
                <PaywallSheet
                  trigger={paywall}
                  plans={paywall === "gated" ? [plans[2], plans[3]] : [plans[1], plans[2]]}
                />
              </div>
            </div>
          </Comp>

          <Comp
            id="C-18" name="Checkout panel"
            purpose="Takes money, hosted by the gateway and wrapped in our chrome. We never see, store or handle card data, and the screen says so. The button carries the exact amount, and tax appears before the button rather than after it."
            rules={[
              "The button says the amount: “Pay $25.00”, never “Continue”.",
              "While processing, the whole panel is non-interactive — a double-submit is a double charge.",
              "A decline shows the gateway’s reason in plain words plus what to try. The $10 minimum is stated.",
            ]}
            flow={{
              steps: [
                "From U4.1 the user arrives with a pack already chosen; the order summary repeats it so nothing is a surprise.",
                "Card fields are the provider's iframe. The trust line explains that in one sentence.",
                "Pay → processing, with the panel locked. 3DS appears as an overlay and states that nothing is charged until they confirm.",
                "Success writes a grant row to the purchased bucket and returns them to the GO card that sent them here, still holding their intent.",
              ],
            }}
          >
            <div className="wt-demo">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["default", "validating", "processing", "declined", "requires-action"].map((s) => (
                  <button key={s} type="button" className={`btn btn--sm ${checkout === s ? "btn--primary" : ""}`} onClick={() => setCheckout(s)}>{s}</button>
                ))}
              </div>
              <div className="wt-cols wt-cols--2">
                <Case label={`state: ${checkout}`}><CheckoutPanel state={checkout} /></Case>
                <Case label="U4.1 · the packs that lead here" note="$10 minimum, and the honest comparison with the tier above.">
                  <div className="card"><TopUpPacks selected="maker" /></div>
                </Case>
              </div>
            </div>
          </Comp>
        </Group>

        {/* ======================================== GROUP 5 — SHARED MONEY */}
        <Group
          n="5" id="g5" title="Shared money — Scircles"
          lede="Nobody in this market has built this well, which makes it HERE's opening. A shared pool with invisible spending becomes an argument, so transparency here is a conflict-prevention feature, not a surveillance one — and the copy is written that way."
        >
          <Comp
            id="C-19" name="Shared pool gauge"
            purpose="A Scircle's shared credit pool: what is left, who has been spending it, and what the cap is. It extends the fuel gauge with attribution, and per-member spend is visible to every member of the Scircle."
            rules={[
              "Per-member spend is visible to all members. Frame it as “who’s been building”, never accusatorially.",
              "A single-member Scircle hides the contribution strip — it is noise.",
              "At the cap, pool spending blocks and “Raise the cap” appears only for people whose spend role allows it.",
            ]}
            flow={{
              steps: [
                "Someone opens Harbour's budget screen (U7.1). One bar, one cap marker, three names with numbers.",
                "At 84% of the cap the bar turns amber and says so. Spending still works — the warning is early on purpose.",
                "At the cap, pool spending stops and personal wallets still work, so nobody is fully blocked by someone else's spending.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="default · Harbour, 7 members"><SharedPoolGauge scircle={STORE.scircles[0]} members={STORE.members} /></Case>
                <Case label="approaching the cap · over 80%">
                  <SharedPoolGauge scircle={{ ...STORE.scircles[0], pool_remaining: 3200 }} members={STORE.members} capState="approaching" />
                </Case>
                <Case label="at the cap · spending blocked">
                  <SharedPoolGauge scircle={{ ...STORE.scircles[0], pool_remaining: 0 }} members={STORE.members} capState="at-cap" />
                </Case>
                <Case label="no cap set · single member">
                  <SharedPoolGauge
                    scircle={{ ...STORE.scircles[1], pool_cap: null, approval_threshold: null }}
                    members={[STORE.members[0]]} capState="no-cap"
                  />
                </Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-20" name="Payer picker"
            purpose="Answers &ldquo;who pays for this job&rdquo; whenever more than one wallet could fund it. It never silently defaults to whoever clicked, because charging a shared pool by accident is a social problem, not just a billing one."
            rules={[
              "If a pool exists and the user may spend from it, the choice is explicit.",
              "Charging someone else’s wallet requires their prior consent; otherwise the option is disabled and offers to ask them.",
              "A split validates live and names the actual split in credits, not just percentages.",
            ]}
            flow={{
              steps: [
                "The picker appears inside the GO card, above the estimate, whenever the user belongs to a Scircle with a pool.",
                "Choosing the pool shows the pool's remaining balance and whether this job crosses the approval threshold — before GO, not after.",
                "A split expands to percentage inputs that must sum to 100, and restates the result in credits so nobody is doing mental arithmetic about someone else's money.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="live · personal / pool / split" note={`Selected: ${payer}. The pool option names the 200 cr approval threshold once the estimate crosses it.`}>
                  <div className="card">
                    <PayerPicker
                      personal={S.available} estimate={350} selected={payer} onSelect={setPayer}
                      pool={{ name: "Harbour", remaining: 8420, approval_threshold: 200 }}
                    />
                  </div>
                </Case>
                <Case label="pool insufficient · sponsor without consent">
                  <div className="card">
                    <PayerPicker
                      personal={S.available} estimate={2000} selected="personal"
                      pool={{ name: "Ridge", remaining: 1180, approval_threshold: null }}
                      sponsor={{ name: "Priya", allowed: false }}
                    />
                  </div>
                </Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-21" name="Approval card"
            purpose="A job above a Scircle's threshold, waiting for someone with the authority to release it. Approving creates the hold and starts the job as if the approver pressed GO, and the ledger records both people."
            rules={[
              "A decline requires a reason — a decline without one is just friction.",
              "Over four hours waiting, the time chip turns amber; at 24 hours it auto-declines, the requester is told, and “Ask again” is offered.",
              "authorised_by is the approver; the requester is recorded alongside.",
            ]}
            flow={{
              steps: [
                "Priya presses GO on a 350 cr Cerebral run. It is over Harbour's 200 cr threshold, so GO became “Request approval” and named Tomas.",
                "Tomas sees the card: who, what, how much, and the sentence Priya wrote about why. He approves in one tap and the job starts without Priya doing anything again.",
                "Or he declines with a reason from a short list. Priya gets the reason, not a silence.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="pending">
                  <ApprovalCard requester="Priya" initials="P" what="Cerebral — Q3 pattern read" estimate={350} note="Need this before the Thursday review" waiting="2h 14m" />
                </Case>
                <Case label="pending · urgent, over 4h">
                  <ApprovalCard state="pending-urgent" requester="Priya" initials="P" what="Cerebral — Q3 pattern read" estimate={350} note="Need this before the Thursday review" waiting="5h 02m" />
                </Case>
                <Case label="approved"><ApprovalCard state="approved" requester="Priya" initials="P" what="Cerebral — Q3 pattern read" estimate={350} approvedBy="Tomas, 14:31" /></Case>
                <Case label="declined · with a reason"><ApprovalCard state="declined" requester="Priya" initials="P" what="Video generation — 30s" estimate={1200} declineReason="too expensive · “let's do 10 seconds first”" /></Case>
                <Case label="expired · auto-declined at 24h"><ApprovalCard state="expired" requester="Priya" initials="P" what="Scircle recompute" estimate={45} waiting="24h" /></Case>
                <Case label="self · your own request"><ApprovalCard state="self" requester="You" initials="A" what="Cerebral — Q3 pattern read" estimate={350} waiting="12m" /></Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-22" name="Spend role matrix"
            purpose="Sets what someone may do with money inside a Scircle, deliberately separate from their social role — being a member of a world is not the same as being allowed to spend its credits."
            rules={[
              "Four roles, four capabilities, and the invite copy states the consequence in plain words.",
            ]}
            flow={{
              steps: [
                "Invite: the role select carries one sentence — “Priya will be able to spend from Harbour's pool (8,420 cr left)”. That is the consent moment, so it is a sentence and not a permissions grid.",
                "Settings: the full matrix, with radio buttons per person. Changing a role never changes their social membership.",
                "A member's profile shows the matrix read-only, so anyone can check who can approve before they ask.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="editor · in Scircle settings"><SpendRoleMatrix variant="editor" value={role} onChange={setRole} /></Case>
                <Case label="compact · in the invite flow" note="The consent sentence changes with the role.">
                  <SpendRoleMatrix variant="compact" value={role} onChange={setRole} pool={STORE.scircles[0]} />
                </Case>
              </div>
            </div>
          </Comp>
        </Group>

        {/* ============================================= GROUP 6 — OPERATOR */}
        <Group
          n="6" id="g6" title="Operator components — Product B"
          lede="The console for the people deciding what credits cost. The governing rule: every widget names a definition, an owner, a threshold and a next action. If it cannot name all four, cut it."
        >
          <Comp
            id="C-23" name="Metric tile"
            purpose="The atom of the operator console: a number that means something and leads somewhere. All six parts are required — label, value, delta, sparkline, threshold chip and a next action — plus the owner and the definition on hover."
            rules={[
              "Delta direction is explicit per metric. Churn going up is bad; burn going up is good. Never assume green-is-up.",
              "No data reads “not measured yet”, never 0 — a missing metric must not read as a zero metric.",
              "Stale data carries a clock and the age.",
            ]}
            flow={{
              steps: [
                "Monday, D1.1. The founder reads six tiles in fifteen seconds and knows whether the week was good.",
                "One tile is amber. Its threshold chip says why, and its action link is the next step rather than a dashboard filter.",
                "Hovering names the owner — so an amber tile has a person attached to it before the meeting starts.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-tiles">
                <MetricTile
                  label="Weekly successful credit burn" value={STORE.ops.wscb_this_week} format="credits"
                  delta={STORE.ops.wscb_this_week - STORE.ops.wscb_last_week} deltaDirection="up-good"
                  series={WSCB_SERIES} state="ok" threshold="target +5%/wk"
                  owner="Founder" definition="credits burned on jobs that succeeded, 7d"
                  action="Open the burn console"
                />
                <MetricTile
                  label="Lowest accounts per guardian" value={41} delta={-3} deltaDirection="up-good"
                  series={WSCB_SERIES.slice(-8)} state="warn" threshold="floor 50"
                  owner="Guardian ops" definition="min(accounts_served) across all pools"
                  action="Rebalance pools"
                />
                <MetricTile
                  label="Blended gross margin" value={STORE.ops.blended_gm} format="percent" delta={-0.02}
                  deltaDirection="up-good" state="ok" threshold="floor 55%"
                  owner="Finance" definition="(credit revenue − COGS) / credit revenue, 30d"
                  action="Open the margin console"
                />
                <MetricTile
                  label="Unburned credit liability" value={STORE.ops.unburned_liability_credits} format="credits"
                  delta={412000} deltaDirection="up-bad" state="breach" threshold="cap 12M cr"
                  owner="Finance" definition="sum of unexpired, unspent granted credits"
                  action="Review expiry policy"
                />
                <MetricTile
                  label="Surface margin, hosting" value={0.68} format="percent" state="ok" threshold="target 65%"
                  owner="Platform" definition="(credits billed × $0.01 − GCP cost) / credits billed"
                  action="Open surface capacity" stale
                />
                <MetricTile
                  label="Dedicated guardian utilisation" noData value={0} state="ok"
                  owner="Guardian ops" definition="busy seconds / available seconds, 7d"
                  action="Instrument this"
                />
              </div>
            </div>
          </Comp>

          <Comp
            id="C-24" name="Guardrail light"
            purpose="A pass or fail on something we are never allowed to trade away. Five of them sit in a row on the North Star home, and every one is drillable to its evidence — a guardrail that cannot be drilled is decoration."
            rules={[
              "“Unknown” is visually distinct from “ok”, because an uninstrumented guardrail is not a passing one.",
              "A breach is promoted to the first position in the row.",
            ]}
            flow={{
              steps: [
                "The founder's eye goes along the row. Four green, one amber: lowest accounts per guardian is 41 against a floor of 50.",
                "They click it and land on the fleet, sorted ascending, with Pool 1 as the top row.",
                "Two clicks from the Monday screen to the guardian that needs them. That is the three-click test in the acceptance checklist.",
              ],
            }}
          >
            <div className="wt-demo" style={{ gap: 10 }}>
              {[...STORE.ops.guardrails]
                .sort((a, b) => (a.state === "breach" ? -1 : b.state === "breach" ? 1 : 0))
                .map((g) => <GuardrailLight key={g.id} guardrail={g} />)}
              <GuardrailLight guardrail={{ id: "x", label: "End-user AI pass-through margin", value: 0, limit: 0, state: "unknown", compare: "" }} />
            </div>
          </Comp>

          <Comp
            id="C-25" name="Capacity gauge"
            purpose="Accounts per guardian against the three zones that decide whether a guardian makes or loses money — the operator's equivalent of the fuel gauge. One guardian costs $500 a month whether it does one job or ten thousand; break-even is 17 accounts and the target is 80 or more."
            rules={[
              "A dedicated guardian serves one account by design and must never be shown as “losing money” — it switches to a utilisation gauge and flags hibernation below 10%.",
            ]}
            flow={{
              steps: [
                "Arriving from the amber guardrail, the operator sees the fleet as a column of these gauges, worst first.",
                "The break-even tick explains itself on hover: below 17 accounts this guardian costs more than the accounts on it contribute.",
                "Rebalance moves 20 accounts from the healthy pool; the margin figure updates before anything is committed.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                {STORE.guardians.map((g) => (
                  <Case key={g.id} label={`${g.name} · ${g.type}`} note={`coverage ${guardianCoverage(g).toFixed(2)}× of its $500 fixed cost · ${fmtPct(g.utilisation)} utilised · queue ${g.queue_depth}`}>
                    <div className="card">
                      <CapacityGauge accounts={g.accounts_served} type={g.type} utilisation={g.utilisation} />
                    </div>
                  </Case>
                ))}
                <Case label="losing money · below break-even" note="Red zone: the accounts on it contribute less than it costs.">
                  <div className="card"><CapacityGauge accounts={11} /></div>
                </Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-26" name="Health chip and its composition panel"
            purpose="An account's health as a number that can explain itself. A score nobody can explain is a score nobody uses, so the explanation is part of the component: the panel shows the arithmetic, and a reader can add the contributions up and arrive at the score."
            rules={[
              "Weights are editable by the founder role and every change is written to the audit log.",
              "An account younger than 21 days reads “too new to score” — never score a fresh account low and put it in the at-risk queue.",
              "The panel names the biggest drag and a suggested play.",
            ]}
            flow={{
              steps: [
                "The operator opens an account (D5.2) and sees 52 · drifting with a downward trend.",
                "They open the panel. Burn depth is contributing 5 of a possible 25 — this account is paying for credits it is not using.",
                "The suggested play is the right-size email, which is the opposite of an upsell, and is why the number is trustworthy enough to act on.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-row">
                <Case label="drifting · open the panel" note="52 from the six weighted inputs. The arithmetic is in the table."><HealthChip defaultOpen /></Case>
                <Case label="new account"><HealthChip newAccount /></Case>
                <Case label="weights edited · audited"><HealthChip weightsEdited /></Case>
              </div>
            </div>
          </Comp>
        </Group>

        {/* ========================================= GROUP 7 — LIVE SURFACES */}
        <Group
          n="7" id="g7" title="Live surfaces — Tier 8"
          lede="New in spec 2.0, and the reason the runway formula changed. The GO card answers what something costs now; these two answer what it costs forever, which is the question a recurring charge actually raises. The governing promise is sleep, never delete."
        >
          <Comp
            id="C-27" name="Standing meter card"
            purpose="One live surface, as a thing that costs money every month: its URL, its class, its state, the monthly number in credits and fiat, the budget meter for this cycle, and the guardian that built it."
            rules={[
              "Never a monthly cost without the date it next settles.",
              "An included surface bills zero and shows the list price struck through — people need to see the value of what they are not being charged for.",
              "“Sleep it” is always available and never buried. A one-tap way to stop a recurring charge is what makes the recurring charge acceptable.",
              "A surface can only enter sleeping after two warnings, and the sleeping state says the data is kept and until when, as a date.",
            ]}
            flow={{
              steps: [
                "The user publishes something a guardian built. The publish button stated the monthly figure before the first deploy, so this card is a confirmation, not a surprise.",
                "Every cycle the standing charge gets a renewal GO rather than a one-time GO at creation. The card is where that renewal is read.",
                "If the balance will not cover it, two warnings arrive — fourteen days out and three days out — and the card states what happens next in a date, not a duration.",
                "It then sleeps behind a wake page with its data kept 60 days. The URL does not change, and nothing is deleted.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="included in plan · bills zero" note="Inside the Prime envelope. The struck-through 200 cr is the value received.">
                  <StandingMeterCard surface={STORE.surfaces[0]} />
                </Case>
                <Case label="billing · inside budget">
                  <StandingMeterCard surface={{ ...STORE.surfaces[1], state: "live", spent_this_cycle: 3100, warned_at: [] }} />
                </Case>
                <Case label="approaching the budget cap">
                  <StandingMeterCard surface={{ ...STORE.surfaces[1], state: "live", spent_this_cycle: 7200, warned_at: [] }} />
                </Case>
                <Case label="over the budget cap" note="We stopped adding metered usage rather than going further.">
                  <StandingMeterCard surface={{ ...STORE.surfaces[1], state: "live", spent_this_cycle: 8400, warned_at: [] }} />
                </Case>
                <Case label="warned once · 14 days out">
                  <StandingMeterCard surface={{ ...STORE.surfaces[1], state: "live", warned_at: ["2026-09-06T09:00:00Z"] }} />
                </Case>
                <Case label="warned twice · the state that matters" note="It says what happens next and when, as a date.">
                  <StandingMeterCard surface={{ ...STORE.surfaces[1], state: "live" }} />
                </Case>
                <Case label="sleeping · data kept, URL unchanged">
                  <StandingMeterCard surface={STORE.surfaces[1]} />
                </Case>
                <Case label="deploying">
                  <StandingMeterCard surface={{ ...STORE.surfaces[0], state: "deploying", included_in_plan: false, credits_monthly: 200, spent_this_cycle: 0, warned_at: [] }} />
                </Case>
              </div>
            </div>
          </Comp>

          <Comp
            id="C-28" name="Sleep / wake sheet"
            purpose="The out-of-credits moment for something already live — a strictly worse moment than a job that will not start, because the user has an audience. It leads with the free fallback, states the keep-until date, and never uses the word delete in any state."
            rules={[
              "Lead with the free fallback, not the payment. “Pay or lose it” reads as a hostage situation.",
              "The word “delete” appears nowhere in this component, in any state. We do not delete a live surface to collect a debt, and the copy is where that promise is kept.",
              "The wake-confirm variant confirms the URL is unchanged. That is the specific fear.",
            ]}
            flow={{
              steps: [
                "Fourteen days out: the first warning. The sheet leads with “let it sleep”, then top up, then move to a smaller plan. All three are real.",
                "Three days out: the second warning, same shape, sharper date. This is the last one, and it says so.",
                "It sleeps. Visitors see a wake page rather than an error, and the owner sees a keep-until date, not a countdown.",
                "Waking is one tap and free, and the confirm states the address is unchanged — because that is what they are actually worried about.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-cols wt-cols--2">
                <Case label="warning one · 14 days out"><SleepWakeSheet surface={STORE.surfaces[1]} variant="warning-one" /></Case>
                <Case label="warning two · 3 days out"><SleepWakeSheet surface={STORE.surfaces[1]} variant="warning-two" /></Case>
                <Case label="sleeping now"><SleepWakeSheet surface={STORE.surfaces[1]} variant="sleeping-now" sleepDate="2026-09-17" /></Case>
                <Case label="wake confirm · the URL is the fear"><SleepWakeSheet surface={STORE.surfaces[1]} variant="wake-confirm" sleepDate="2026-09-17" /></Case>
              </div>
            </div>
          </Comp>
        </Group>

        {/* ================================================ PART 7 — SCREENS */}
        <Group
          kicker="Part 7" id="screens" title="The components, assembled"
          lede="Nothing below is a new element. Three of the ten first screens, built only out of the library above — which is the point of building the library first: ninety-nine screens assembled from a library stay consistent, while ninety-nine drawn one at a time drift by screen twenty."
        >
          <Comp
            id="U3.1" name="Wallet home" title="the most-opened screen"
            purpose="The ten-second test: a person must be able to answer &ldquo;how much have I got and how long will it last&rdquo; without scrolling and without reading a sentence."
            flow={{
              title: "What the screen is for",
              steps: [
                "The gauge answers the first question before any text is read; the runway line answers the second in a date.",
                "The bucket bar answers the question nobody asks out loud — which credits go first — and states the rule.",
                "Top up is the primary action, but nothing on this screen pushes it: the honest number is the better salesman.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-wallet">
                <div className="card" style={{ display: "grid", gap: 16, justifyItems: "center" }}>
                  <FuelGauge remaining={S.balance} total={S.total + 2500} sub="credits left" />
                  <CreditValue amount={S.balance} variant="withCurrency" size="md" stack />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn--primary">Top up</button>
                    <button className="btn btn--ghost">See everything</button>
                  </div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--amber)", textAlign: "center" }}>
                    {fmtCredits(S.held)} cr held by a job still running — spendable {fmtCredits(S.available)} cr
                  </p>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  <div className="card"><BucketBar buckets={STORE.buckets} now={STORE.now} /></div>
                  <div className="card" style={{ display: "grid", gap: 10 }}>
                    <span className="lbl">Burn, 30 days</span>
                    <BurnSparkline series={SERIES} variant="card" forecast />
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--ink)" }}>
                      At this rate you run out on <strong>{fmtDate(S.runway.date, { withYear: false })}</strong> — {S.runway.days} days,
                      counting the {fmtCredits(S.runway.remainingStanding)} cr of hosting still to settle this cycle.
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>
                      Ignoring that standing commitment, the old formula said {S.runway.naiveDays} days
                      ({fmtDate(S.runway.naiveDate)}) — {S.runway.naiveDays - S.runway.days} days of runway that was never there.
                    </p>
                  </div>
                  <div className="wt-stats">
                    <MiniStat label="Burn rate" note="7-day average, standing excluded">
                      <CreditValue amount={S.burn} size="lg" unit="cr/day" />
                    </MiniStat>
                    <MiniStat label="Burn depth" note="below the 60–80% healthy band">
                      <span className="num" style={{ fontSize: 22, fontWeight: 600 }}>{fmtPct(S.depth.ratio)}</span>
                    </MiniStat>
                    <MiniStat label="Monthly standing" note={`settles ${fmtDate(STORE.account.cycle_end)}`}>
                      <CreditValue amount={standing} variant="withCurrency" size="lg" stack />
                    </MiniStat>
                  </div>
                </div>
              </div>
            </div>
          </Comp>

          <Comp
            id="U6.1" name="Live surfaces" title="new in 2.0"
            purpose="Everything this account has running, and what it costs every month. The ten-second test: what am I paying every month, and for what."
            flow={{
              title: "What the screen is for",
              steps: [
                "The summary strip answers the monthly question first, then the settle date, then how many are live versus asleep.",
                "One standing meter card per surface, so every recurring charge has a URL attached to it.",
                "This is the screen where the corrected runway matters most, and where a user notices if it is wrong.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="wt-tiles">
                <MiniStat label="Monthly standing commitment" note="before you do a single thing">
                  <CreditValue amount={standing} variant="withCurrency" size="xl" stack />
                </MiniStat>
                <MiniStat label="Next settles">
                  <span className="num" style={{ fontSize: 22, fontWeight: 600 }}>{fmtDate(STORE.account.cycle_end)}</span>
                </MiniStat>
                <MiniStat label="Surfaces">
                  <span className="num" style={{ fontSize: 22, fontWeight: 600 }}>1 live · 1 asleep</span>
                </MiniStat>
                <MiniStat label="Inside your plan" note="value received, billed at zero">
                  <CreditValue amount={200} variant="withCurrency" size="lg" stack />
                </MiniStat>
              </div>
              <div className="card" style={{ display: "grid", gap: 10 }}>
                <span className="lbl">Hosting burn, 90 days</span>
                <BurnSparkline series={HOSTING_SERIES} variant="card" unitLabel="cr" />
              </div>
              <div className="wt-cols wt-cols--2">
                {STORE.surfaces.map((s) => <StandingMeterCard key={s.id} surface={s} />)}
              </div>
            </div>
          </Comp>

          <Comp
            id="D1.1" name="North Star home" title="the Monday screen"
            purpose="The fifteen-second test: no scrolling, and a founder knows whether the week was good and whether anything is on fire."
            flow={{
              title: "What the screen is for",
              steps: [
                "Hero number: weekly successful credit burn, with last week's delta. Successful is the word doing the work — failed jobs are not revenue.",
                "Six tiles across the funnel, each with a threshold and a next action.",
                "Five guardrail lights beneath, with any breach promoted to first position. One amber light here is the entire agenda for the meeting.",
              ],
            }}
          >
            <div className="wt-demo">
              <div className="card" style={{ display: "grid", gap: 12 }}>
                <span className="lbl">Weekly successful credit burn</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
                  <CreditValue amount={STORE.ops.wscb_this_week} variant="withCurrency" size="xl" />
                  <span className="chip chip--green">
                    ▲ {fmtCredits(STORE.ops.wscb_this_week - STORE.ops.wscb_last_week)} cr vs last week
                  </span>
                  <span className="chip">MRR {fmtMoney(STORE.ops.mrr)}</span>
                  <span className="chip">NRR {fmtPct(STORE.ops.nrr)}</span>
                </div>
                <BurnSparkline series={WSCB_SERIES} variant="full" unitLabel="cr" />
              </div>
              <div className="wt-tiles">
                <MetricTile label="Acquisition · new JEM identities" value={1284} delta={96} series={WSCB_SERIES.slice(-6)} state="ok" threshold="target 1,200/wk" owner="Growth" definition="new JEM sign-ins, 7d" action="Open acquisition" />
                <MetricTile label="Activation · first GO within 8 min" value={0.61} format="percent" delta={0.03} series={WSCB_SERIES.slice(-6)} state="ok" threshold="floor 55%" owner="Product" definition="share of new accounts with a settled GO in 8 min" action="Open the first-run funnel" />
                <MetricTile label="Engagement · GOs per active account" value={11.4} delta={0.6} series={WSCB_SERIES.slice(-6)} state="ok" threshold="target 10/wk" owner="Product" definition="settled GOs / weekly active accounts" action="Open engagement" />
                <MetricTile label="Consumption · burn depth in band" value={0.42} format="percent" delta={-0.04} deltaDirection="up-good" series={WSCB_SERIES.slice(-6)} state="warn" threshold="target 60%" owner="Product" definition="accounts burning 60–80% of allotment" action="Open burn depth" />
                <MetricTile label="Economics · blended gross margin" value={STORE.ops.blended_gm} format="percent" delta={-0.02} state="ok" threshold="floor 55%" owner="Finance" definition="(credit revenue − COGS) / credit revenue" action="Open the margin console" />
                <MetricTile label="Retention · net revenue retention" value={STORE.ops.nrr} format="percent" delta={0.03} state="ok" threshold="floor 100%" owner="Founder" definition="revenue from last quarter's cohort, this quarter" action="Open the expansion queue" />
              </div>
              <div className="wt-lights">
                {[...STORE.ops.guardrails]
                  .sort((a, b) => (a.state === "warn" ? -1 : b.state === "warn" ? 1 : 0))
                  .map((g) => <GuardrailLight key={g.id} guardrail={g} />)}
              </div>
            </div>
          </Comp>
        </Group>

        {/* ================================================== PART 8 — FLOWS */}
        <Group
          kicker="Part 8" id="flows" title="The flows, wired"
          lede="Both paths run against a real append-only ledger. Holds reserve, settlement releases the difference, a cancelled GO writes nothing, and a failed job leaves the balance numerically unchanged — watch the ledger panel beside each screen as you click."
        >
          <Comp
            id="FLOW 1" name="The first eight minutes" title="activation"
            purpose="The flow that decides whether someone stays. A welcome grant, one real piece of work, and a receipt that returns money in front of them. The failure branch is built too, because the first failure is the moment the product either earns trust or loses it."
            flow={{
              title: "The path, step by step",
              steps: [
                "U1.2 — 2,000 credits, seven days, one sentence telling them to go make something. Reading and joining are free and always will be.",
                "The tool surface — a recording is there. Replay costs nothing; Transcribe opens the gate.",
                "U1.4 — the GO card. Standard is selected; switching to Swift drops the estimate to 28 cr and Deep raises it to 138. The cap defaults to 90 cr and the hint promises we stop rather than exceed it.",
                "GO writes a hold of 66 cr — estimate × 1.2. Note that no ledger row exists yet: a hold is a reservation, not a charge, and the balance column still reads 2,000.",
                "U2.4 — the live meter counts 0 → 18.4 audio minutes. Stop at any point settles only the minutes measured so far.",
                "U1.5 — the receipt: held 66, used 55, kept 11. The spend row appears, and the balance becomes 1,945.",
                "U3.1 — the wallet reads 1,945 cr and the promo segment has visibly shrunk. The welcome grant went first, exactly as the bucket bar said it would.",
                "The failure branch — tick the box on the tool surface before pressing Transcribe. The hold is voided, no spend row is ever written, and the balance is still 2,000. The retry is labelled free because it is free.",
              ],
            }}
          >
            <ActivationFlow />
          </Comp>

          <Comp
            id="FLOW 2" name="Running low" title="the revenue moment"
            purpose="37 credits, a job that needs 55, and four honest ways forward. Two of them cost nothing. This is where a credit product either behaves like a speed limit or like a locked door."
            rules={[
              "Nothing on this path charges without a further explicit step, and the two free routes are visible before any paid one is pressed.",
            ]}
            flow={{
              title: "The path, step by step",
              steps: [
                "U3.1 — the wallet at 37 cr. Red gauge, runway today, and a sentence saying what happens at zero: the slow lane, not a lock.",
                "U2.2 — the GO card quotes 55 cr against 37 available and hands off rather than refusing.",
                "U2.7 — “You're 18 credits short.” Four options in a fixed order: top up, run it on Swift, trim the scope, cancel — plus the slow lane and the Harbour pool where those exist.",
                "Trim to the first 10 minutes — 30 cr, now affordable. GO, meter, settle. The user got what they came for and paid less than they expected to.",
                "Or top up: U4.1 packs with the honest Studio comparison beside them, then C-18 checkout with the amount on the button. Success writes a grant to the purchased bucket, which is spent last.",
                "Or the slow lane: Swift, queue position 4, free, with one tap out. Nobody is stopped.",
                "Spec note, flagged rather than fudged: the spec's narrative says the Swift branch is “still short”, but 28 cr against 37 available clears even with the 1.2× hold. The sheet therefore treats Swift as affordable here. One number in the spec needs a decision — the balance, or that branch.",
              ],
            }}
          >
            <RunningLowFlow />
          </Comp>
        </Group>

        {/* =============================================== PART 10 — CHECKS */}
        <footer className="wt-foot">
          <h2>What this build guarantees</h2>
          <p className="wt-group__lede">
            The acceptance checks from PART 10 that are demonstrable on this page. The five trust rules are structural
            here, not copy: they are properties of the reducer in <code>lib/flows.js</code> and the derivations in{" "}
            <code>lib/store.js</code>.
          </p>
          <ul className="wt-check">
            <li>No paid action starts without a GO card showing the cost first.</li>
            <li>A failed job charges zero — the balance is numerically unchanged, and the retry is labelled free.</li>
            <li>Cancelling a GO creates nothing: no hold, no row, no charge.</li>
            <li>Stopping a running job settles only the measured units.</li>
            <li>Settle is always ≤ the quote; held, used and returned are always all three stated.</li>
            <li>Zero reaches the slow lane, never a dead end, and nothing auto-charges unless the user armed it.</li>
            <li>Balance is derived from the ledger everywhere; no component is handed a stored balance.</li>
            <li>Holds reduce available but not balance, and are shown separately and pinned.</li>
            <li>Buckets spend soonest-expiry first, and the UI states that they do.</li>
            <li>Every ledger row carries tool, model, units and rate version; history is never re-priced.</li>
            <li>Every amount uses tabular numerals with a reserved width, so nothing reflows as a number changes.</li>
            <li>Light, dark and system themes all resolve; the explicit dark block is duplicated so a dark choice beats a light OS.</li>
            <li>Keyboard traverse, visible focus, Escape closes the GO card, and reduced motion disables the animations.</li>
            <li>No empty state says &ldquo;no data&rdquo; — each one says what to do next.</li>
          </ul>

          <h2 style={{ marginTop: 40 }}>Two things flagged, not guessed</h2>
          <ul className="wt-check" style={{ marginBottom: 60 }}>
            <li>
              <strong>The standing-commitment predicate.</strong> PART 4 defines the monthly commitment over surfaces where{" "}
              <code>state = &#39;live&#39;</code>, but PART 5 states the derived figure as 6,150 cr with the Ridge board already
              sleeping. This build excludes only <code>stopped</code> surfaces, which reproduces the stated 6,150 and the
              corrected runway. One predicate in <code>monthlyStandingCommitment()</code> changes it back.
            </li>
            <li>
              <strong>The Swift branch in Flow 2.</strong> 28 cr against 37 available clears, so the spec&rsquo;s &ldquo;still
              short&rdquo; line needs either a lower balance or a different branch. The sheet is honest about the arithmetic
              rather than reproducing the narrative.
            </li>
          </ul>
        </footer>
      </div>
    </div>
  );
}
