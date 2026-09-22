// PART 4 + PART 5 — the mock store, and the derivations that read it.
//
// THE CARDINAL RULE: a balance is not a column. Everything below that looks
// like a balance is a SUM over the append-only ledger. Nothing in this file
// stores one, and no component is given one to read.

export const RATE = {
  listPerCredit: 0.01, // 1 credit = $0.01 of list value
  tiers: [
    { id: "swift", name: "Swift", multiplier: 0.5, blurb: "quick, good enough" },
    { id: "standard", name: "Standard", multiplier: 1, blurb: "the everyday choice" },
    { id: "deep", name: "Deep", multiplier: 2.5, blurb: "when it really matters" },
    { id: "cinematic", name: "Cinematic", multiplier: 5, blurb: "the best we have" },
  ],
  plans: [
    {
      tier: "signal", name: "Signal", price: 0, credits: 500, effectiveRate: null,
      topupRate: null, scircles: 1, guardianLane: "shared, low priority", retentionDays: 7,
      features: ["1 Scircle", "Shared guardian, low priority", "7-day retention", "1 static surface"],
    },
    {
      tier: "prime", name: "Prime", price: 39, credits: 5000, effectiveRate: 0.0078,
      topupRate: 0.0095, scircles: 3, guardianLane: "shared pool", retentionDays: 90,
      features: ["3 Scircles", "Shared guardian pool", "90-day retention", "1 live app + 1 static, + 500 cr/mo"],
    },
    {
      tier: "studio", name: "Studio", price: 199, credits: 30000, effectiveRate: 0.0066,
      topupRate: 0.0085, scircles: 10, guardianLane: "shared, priority lane", retentionDays: 365,
      features: ["10 Scircles", "Priority lane", "1-year retention", "3 live apps + static, + 3,000 cr/mo", "Overdraft"],
    },
    {
      tier: "world", name: "World", price: 999, credits: 175000, effectiveRate: 0.0057,
      topupRate: 0.0075, scircles: null, guardianLane: "priority + JEM SSO", retentionDays: 1095,
      features: ["Unlimited Scircles", "Priority + JEM SSO", "3-year retention", "10 live apps + static, + 15,000 cr/mo", "Overdraft"],
    },
  ],
};

export const STORE = {
  now: "2026-09-20T14:32:00Z",

  account: {
    id: "acc_7fa2",
    name: "Aman Porwal",
    handle: "aman",
    plan: "prime",
    cycle_start: "2026-09-04",
    cycle_end: "2026-10-04",
    topup_rate: 0.0095,
    effective_rate: 0.0078,
    auto_recharge: { enabled: false, threshold: 500, amount: 2500, ceiling: 10000 },
    caps: { account: null, scircle: 3000, tool: { "media.video": 1000 } },
    payment: { brand: "visa", last4: "4142", exp: "11/28", status: "ok" },
    dunning_stage: null,
  },

  // Balance is DERIVED from these. There is no balance field anywhere.
  buckets: [
    { id: "bk_promo", bucket: "promo", granted: 2000, remaining: 340,
      source: "Welcome grant", expires_at: "2026-09-23T00:00:00Z" },
    { id: "bk_plan", bucket: "plan", granted: 5000, remaining: 3145,
      source: "Prime, September", expires_at: "2026-11-03T00:00:00Z" },
    { id: "bk_pur", bucket: "purchased", granted: 2500, remaining: 2500,
      source: "Top-up 12 Sep", expires_at: "2027-09-12T00:00:00Z" },
    { id: "bk_over", bucket: "overdraft", granted: 0, remaining: 0,
      source: null, expires_at: null },
  ],

  holds: [
    { id: "h_04", job_id: "job_2291", amount: 42, estimate: 35, state: "open",
      reason: "Pending — summarise Harbour",
      created_at: "2026-09-20T14:31:40Z", expires_at: "2026-09-20T14:41:40Z" },
  ],

  ledger: [
    { id: "le_221", type: "spend", delta: -30, bucket: "plan", created_at: "2026-09-20T14:28:00Z",
      reason: "Summarise this week in Harbour", tool: "guardian.run", tool_version: 4,
      model_tier: "standard", units: 1, unit_label: "run", rate_version: "rc_2026_09_01",
      job_id: "job_2288", authorised_by: "aman", payer: "acc_7fa2", scircle_id: "sc_harbour",
      cogs_actual_usd: 0.058, estimate_was: 36, released: 6 },

    { id: "le_220", type: "spend", delta: -55, bucket: "plan", created_at: "2026-09-20T11:04:00Z",
      reason: "Transcribe — standup, 18m", tool: "capture.transcribe", tool_version: 3,
      model_tier: null, units: 18.4, unit_label: "audio minutes", rate_version: "rc_2026_09_01",
      job_id: "job_2280", authorised_by: "aman", payer: "acc_7fa2", scircle_id: "sc_harbour",
      cogs_actual_usd: 0.11, estimate_was: 60, released: 5 },

    { id: "le_219", type: "refund", delta: 75, bucket: "plan", created_at: "2026-09-19T16:52:00Z",
      reason: "Render failed on our side — voided", ref_id: "le_218", rate_version: "rc_2026_09_01",
      tool: "capture.render", job_id: "job_2274", authorised_by: "system" },

    { id: "le_218", type: "spend", delta: -75, bucket: "plan", created_at: "2026-09-19T16:51:00Z",
      reason: "Render — cut 03 (FAILED)", tool: "capture.render", tool_version: 2,
      units: 3.75, unit_label: "output minutes", rate_version: "rc_2026_09_01",
      job_id: "job_2274", authorised_by: "aman", payer: "acc_7fa2", failed: true },

    { id: "le_215", type: "spend", delta: -350, bucket: "plan", created_at: "2026-09-18T09:14:00Z",
      reason: "Cerebral — Q3 pattern read", tool: "cerebral.analyse", tool_version: 1,
      model_tier: "deep", units: 1, unit_label: "analysis", rate_version: "rc_2026_08_01",
      job_id: "job_2251", authorised_by: "priya", payer: "sc_harbour", scircle_id: "sc_harbour",
      cogs_actual_usd: 0.694, estimate_was: 380, released: 30, disputed: true },

    { id: "le_214", type: "standing", delta: -6150, bucket: "plan", created_at: "2026-09-17T00:00:00Z",
      reason: "Ridge status board — always-on app, Postgres, custom domain",
      tool: "surface.standing", tool_version: 1, surface_id: "sf_ridge",
      units: 1, unit_label: "month", rate_version: "rc_2026_09_01",
      authorised_by: "aman", payer: "acc_7fa2", scircle_id: "sc_ridge", cogs_actual_usd: 20.4 },

    { id: "le_213", type: "standing", delta: 0, bucket: "plan", created_at: "2026-09-17T00:00:00Z",
      reason: "Harbour intake form — included in your Prime plan",
      tool: "surface.standing", tool_version: 1, surface_id: "sf_intake",
      units: 1, unit_label: "month", rate_version: "rc_2026_09_01",
      authorised_by: "aman", payer: "acc_7fa2", cogs_actual_usd: 0.61 },

    { id: "le_212", type: "adjustment", delta: 120, bucket: "promo", created_at: "2026-09-15T10:31:00Z",
      reason: "Goodwill credit — support #4471", authorised_by: "support", rate_version: "rc_2026_09_01" },

    { id: "le_210", type: "grant", delta: 2500, bucket: "purchased", created_at: "2026-09-12T10:02:00Z",
      reason: "Top-up — Maker pack", expires_at: "2027-09-12T00:00:00Z", rate_version: "rc_2026_09_01" },

    { id: "le_201", type: "grant", delta: 5000, bucket: "plan", created_at: "2026-09-04T00:00:00Z",
      reason: "Prime allotment, September", expires_at: "2026-11-03T00:00:00Z", rate_version: "rc_2026_09_01" },

    { id: "le_188", type: "expiry", delta: -120, bucket: "promo", created_at: "2026-09-03T00:00:00Z",
      reason: "Welcome credits expired unused", rate_version: "rc_2026_08_01" },

    { id: "le_001", type: "grant", delta: 2000, bucket: "promo", created_at: "2026-08-27T09:41:00Z",
      reason: "Welcome grant", expires_at: "2026-09-23T00:00:00Z", rate_version: "rc_2026_08_01" },
  ],

  surfaces: [
    { id: "sf_intake", account_id: "acc_7fa2", scircle_id: "sc_harbour",
      name: "Harbour intake form", url: "harbour-intake.here.app",
      class: "live_app", datastore: "firestore", domain: null, state: "live",
      built_by: "gd_11", built_by_name: "Harbour pool 3", region: "us-central1",
      credits_monthly: 200, list_credits_monthly: 200, included_in_plan: true,
      cogs_actual_usd: 0.61, budget_cap: 1200, spent_this_cycle: 180,
      idle_since: null, warned_at: [], last_deploy_at: "2026-09-16T11:20:00Z" },

    { id: "sf_ridge", account_id: "acc_7fa2", scircle_id: "sc_ridge",
      name: "Ridge status board", url: "status.ridge-works.com",
      class: "always_on", datastore: "postgres", domain: "status.ridge-works.com",
      state: "sleeping", built_by: "gd_04", built_by_name: "Pool 1", region: "us-central1",
      credits_monthly: 6150, list_credits_monthly: 6150, included_in_plan: false,
      cogs_actual_usd: 20.4, budget_cap: 8000, spent_this_cycle: 6150,
      idle_since: "2026-09-14T00:00:00Z",
      warned_at: ["2026-09-06T09:00:00Z", "2026-09-17T09:00:00Z"],
      last_deploy_at: "2026-08-29T15:02:00Z" },
  ],

  scircles: [
    { id: "sc_harbour", name: "Harbour", members: 7, pool_remaining: 8420, pool_cap: 20000,
      guardian: "gd_11", lane: "shared", approval_threshold: 200 },
    { id: "sc_ridge", name: "Ridge", members: 3, pool_remaining: 1180, pool_cap: 5000,
      guardian: "gd_11", lane: "shared", approval_threshold: null },
  ],

  members: [
    { id: "aman", name: "Aman", role: "owner", spend_role: "payer", burned_this_cycle: 1240, colour: "var(--ok)" },
    { id: "priya", name: "Priya", role: "member", spend_role: "spender", burned_this_cycle: 615, colour: "var(--violet)" },
    { id: "tomas", name: "Tomas", role: "member", spend_role: "approver", burned_this_cycle: 0, colour: "var(--info)" },
  ],

  guardians: [
    { id: "gd_11", name: "Harbour pool 3", type: "shared", accounts_served: 84,
      cost_monthly_usd: 500, utilisation: 0.71, queue_depth: 2, state: "healthy",
      latency_p50: 1.9, latency_p95: 6.4, success_rate: 0.987 },
    { id: "gd_04", name: "Pool 1", type: "shared", accounts_served: 41,
      cost_monthly_usd: 500, utilisation: 0.38, queue_depth: 0, state: "under",
      latency_p50: 1.4, latency_p95: 4.1, success_rate: 0.994 },
    { id: "gd_22", name: "Kestrel (dedicated)", type: "dedicated", accounts_served: 1,
      cost_monthly_usd: 500, utilisation: 0.06, queue_depth: 0, state: "hibernate_candidate",
      latency_p50: 1.1, latency_p95: 2.8, success_rate: 1.0 },
  ],

  invoices: [
    { id: "inv_0912", number: "HERE-0912", date: "2026-09-04", status: "paid",
      subtotal: 39.0, topups: 25.0, addons: 0, tax: 11.52, total: 75.52 },
    { id: "inv_0811", number: "HERE-0811", date: "2026-08-04", status: "paid",
      subtotal: 39.0, topups: 0, addons: 0, tax: 7.02, total: 46.02 },
  ],

  ops: {
    wscb_this_week: 1284500,
    wscb_last_week: 1196200,
    blended_gm: 0.6,
    nrr: 1.12,
    mrr: 176082,
    unburned_liability_credits: 14880000,
    breakage_rate: 0.041,
    guardrails: [
      { id: "failed_charges", label: "Charged for our failures", value: 0, limit: 0, state: "ok",
        compare: "limit 0" },
      { id: "surprise", label: "Surprise-charge reports / 1k GOs", value: 0.4, limit: 1, state: "ok",
        compare: "limit < 1" },
      { id: "rationing", label: "Accounts over 95% burn depth", value: 0.11, limit: 0.15, state: "ok",
        compare: "limit < 15%" },
      { id: "breakage", label: "Breakage as share of credit sales", value: 0.041, limit: 0.08, state: "ok",
        compare: "limit < 8%" },
      { id: "apg", label: "Lowest accounts/guardian", value: 41, limit: 50, state: "warn",
        compare: "limit ≥ 50" },
    ],
  },
};

/* ------------------------------------------------------------------ format */
// REQUIRED: all money formatting goes through these two functions. One place
// to fix, one place to test.
export function fmtCredits(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("en-US");
}
export function fmtMoney(n, currency = "USD") {
  return (Number(n) || 0).toLocaleString("en-US", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}
export function creditsToFiat(credits, rate = RATE.listPerCredit) {
  return (Number(credits) || 0) * rate;
}
export function fmtPct(n, dp = 0) {
  return `${((Number(n) || 0) * 100).toFixed(dp)}%`;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function fmtDate(iso, opts = {}) {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const m = MONTHS[d.getUTCMonth()];
  if (opts.withYear) return `${day} ${m} ${d.getUTCFullYear()}`;
  if (opts.monthYear) return `${m} ${d.getUTCFullYear()}`;
  if (opts.weekday) return `${DAYS[d.getUTCDay()]} ${day} ${m}`;
  return `${day} ${m}`;
}
export function fmtTime(iso) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
export function addDays(iso, n) {
  return new Date(new Date(iso).getTime() + n * 86400000).toISOString();
}
export function relativeExpiry(iso, now = STORE.now) {
  if (!iso) return "no expiry";
  const d = daysBetween(now, iso);
  if (d < 0) return "expired";
  if (d === 0) return "expires today";
  if (d <= 7) return `expires in ${d} day${d === 1 ? "" : "s"}`;
  if (d <= 60) return `expires ${fmtDate(iso)}`;
  return `expires ${fmtDate(iso, { monthYear: true })}`;
}

/* ----------------------------------------------------------------- derived */
// The mock `ledger` above is a 12-row EXCERPT of a real history (note the
// gaps in the ids: le_001 … le_221). Summing an excerpt would disagree with
// the spec's demo figures, so the account's opening position is itself
// expressed as a sum over the buckets — each bucket's `remaining` is the
// result of every entry that ever touched it, including the rows the excerpt
// leaves out. Anything the prototype appends from here is summed live.
//
// This keeps the cardinal rule intact: no component is handed a stored
// balance, and every number on screen is a sum this file computes.
export const OPENING = {
  // Σ bucket.remaining = 340 + 3,145 + 2,500 = 5,985 cr = $59.85 of list value
  balance: STORE.buckets.reduce((s, b) => s + b.remaining, 0),
  burnedThisCycle: 1855,   // Prime, September, to 20 Sep
  grantedThisCycle: 5000,  // the Prime allotment — top-ups are not allotment
};

export function balanceOf(ledger, opening = OPENING.balance) {
  // Entries appended during this session carry `appended: true`. Seeded rows
  // are already inside the opening sum and must not be counted twice.
  return ledger.filter((e) => e.appended).reduce((sum, e) => sum + e.delta, opening);
}
export function heldOf(holds) {
  return holds.filter((h) => h.state === "open").reduce((s, h) => s + h.amount, 0);
}
export function availableOf(ledger, holds) {
  return balanceOf(ledger) - heldOf(holds);
}
// REQUIRED: `standing` rows are excluded from burn. They are recurring, not
// daily behaviour, and folding them in makes the sparkline lie. Burn is read
// off the same series the sparkline draws, so the two can never disagree.
export function burnRatePerDay(store = STORE, days = 7) {
  const series = burnSeries(store, 30).slice(-days);
  return series.reduce((s, d) => s + d.credits, 0) / series.length;
}
// SPEC CONFLICT, flagged not guessed: PART 4 defines this over surfaces where
// state = 'live', but PART 5 states the derived value as 6,150 cr with
// sf_ridge already sleeping. A sleeping surface keeps its commitment for the
// cycle it has already settled (le_214), so `stopped` is the exclusion here.
// Change this one predicate if the intent was the narrower reading.
export function monthlyStandingCommitment(surfaces) {
  return surfaces
    .filter((s) => !s.included_in_plan && s.state !== "stopped")
    .reduce((s, x) => s + x.credits_monthly, 0);
}
// The 2.0 runway. The 1.0 formula divided the balance by a 7-day burn rate
// and ignored the recurring monthly draw entirely, so it OVERSTATED runway
// for exactly the users most likely to be surprised by a charge.
export function runway(store = STORE) {
  const available = availableOf(store.ledger, store.holds);
  const burn = burnRatePerDay(store);
  const daysLeftInCycle = Math.max(daysBetween(store.now, store.account.cycle_end), 0);
  const cycleDays = daysBetween(store.account.cycle_start, store.account.cycle_end) || 30;
  const commitment = monthlyStandingCommitment(store.surfaces);
  const remainingStanding = commitment * (daysLeftInCycle / cycleDays);
  const naive = burn > 0 ? Math.floor(available / burn) : null;
  const days = burn > 0 ? Math.max(Math.floor((available - remainingStanding) / burn), 0) : null;
  return {
    days,
    date: days === null ? null : addDays(store.now, days),
    naiveDays: naive,
    naiveDate: naive === null ? null : addDays(store.now, naive),
    remainingStanding: Math.round(remainingStanding),
    commitment,
    burn,
  };
}
export function burnDepth(store = STORE) {
  const sessionSpend = store.ledger
    .filter((e) => e.appended && e.type === "spend")
    .reduce((s, e) => s + Math.abs(e.delta), 0);
  const burned = OPENING.burnedThisCycle + sessionSpend;
  const granted = OPENING.grantedThisCycle;
  return { burned, granted, ratio: granted ? burned / granted : 0 };
}
export function guardianCoverage(g, grossProfitPerAccount = 23.72) {
  return (g.accounts_served * grossProfitPerAccount) / g.cost_monthly_usd;
}
export function surfaceMargin(s) {
  const billed = s.included_in_plan ? 0 : s.credits_monthly;
  const revenue = billed * RATE.listPerCredit;
  if (!revenue) return null;
  return (revenue - s.cogs_actual_usd) / revenue;
}

/* ---------------------------------------- a 30-day burn series for C-04 */
// Real ledger spend where a row exists; a deterministic walk where the
// excerpt has no rows, so the chart never renders an empty box on a demo
// account and the 7-day average lands on the spec's ~272 cr/day.
export function burnSeries(store = STORE, days = 30) {
  const end = new Date(store.now);
  const byDay = new Map();
  store.ledger
    .filter((e) => e.type === "spend")
    .forEach((e) => {
      const k = e.created_at.slice(0, 10);
      byDay.set(k, (byDay.get(k) || 0) + Math.abs(e.delta));
    });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const seeded = 184 + ((d.getUTCDate() * 61 + d.getUTCMonth() * 17) % 27) * 11;
    out.push({ date: key, credits: byDay.has(key) ? byDay.get(key) : seeded });
  }
  return out;
}

/* -------------------------------- hosting-only and operator-side series */
// Hosting burn ramps as surfaces are published: a static page, then a live
// app, then the always-on board. 90 days, for U6.1.
export const HOSTING_SERIES = (() => {
  const out = [];
  const end = new Date(STORE.now);
  for (let i = 89; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400000);
    const ramp = i > 60 ? 40 : i > 30 ? 120 : 205;
    out.push({ date: d.toISOString().slice(0, 10), credits: ramp + ((d.getUTCDate() * 13) % 40) });
  }
  return out;
})();

// Twelve weeks of weekly successful credit burn, for the D1.1 hero.
export const WSCB_SERIES = [
  1042000, 1061000, 998000, 1104000, 1122000, 1090000,
  1168000, 1151000, 1203000, 1196200, 1240000, 1284500,
].map((credits, i) => {
  const d = new Date(new Date(STORE.now).getTime() - (11 - i) * 7 * 86400000);
  return { date: d.toISOString().slice(0, 10), credits };
});

/* --------------------------------------------- the demo account, derived */
export function snapshot(store = STORE) {
  const balance = balanceOf(store.ledger);
  const held = heldOf(store.holds);
  const depth = burnDepth(store);
  return {
    balance,
    held,
    available: balance - held,
    fiat: creditsToFiat(balance),
    burn: burnRatePerDay(store),
    standing: monthlyStandingCommitment(store.surfaces),
    runway: runway(store),
    depth,
    total: depth.granted,
  };
}
