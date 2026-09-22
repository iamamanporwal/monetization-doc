// The flow engine, kept pure and separate from the components so the trust
// rules can be tested rather than asserted. PART 9: fake the network, fake
// the job execution — never fake the ledger.
//
//   HOLD   reserves estimate x 1.2 and writes NO ledger row
//   SETTLE commits the MEASURED amount and releases the difference
//   FAIL   voids the hold and writes no row at all, so the balance is
//          numerically unchanged
//   GOTO   never touches money, which is what makes Cancel free

let seq = 900;
const nextId = (p) => `${p}_${++seq}`;

/* ------------------------------------------------------- the local engine */
export const balance = (ledger) => ledger.reduce((s, e) => s + e.delta, 0);
export const openHolds = (holds) => holds.filter((h) => h.state === "open").reduce((s, h) => s + h.amount, 0);
export const available = (st) => balance(st.ledger) - openHolds(st.holds);

export function reducer(st, a) {
  switch (a.type) {
    case "GOTO":
      return { ...st, step: a.step, note: a.note ?? null };

    // A GO creates a hold of estimate × 1.2. No ledger row yet: a hold is a
    // reservation, not a charge.
    case "HOLD": {
      const hold = {
        id: nextId("h"), job_id: nextId("job"), amount: Math.round(a.estimate * 1.2),
        estimate: a.estimate, state: "open", created_at: new Date().toISOString(),
        reason: `Pending — ${a.headline.toLowerCase()}`,
      };
      return {
        ...st, holds: [...st.holds, hold], step: "meter",
        job: { hold, headline: a.headline, tier: a.tier, estimate: a.estimate, cap: a.cap,
               unitsEstimate: a.unitsEstimate, unitLabel: a.unitLabel, unitsDone: 0,
               creditsSoFar: 0, elapsed: 0, state: "starting" },
      };
    }
    case "TICK": {
      if (!st.job) return st;
      const j = st.job;
      const frac = Math.min((j.elapsed + 0.25) / 4, 1);
      const unitsDone = j.unitsEstimate * frac;
      const creditsSoFar = Math.min(Math.round(j.estimate * frac), j.cap);
      return {
        ...st,
        job: { ...j, elapsed: j.elapsed + 0.25, unitsDone, creditsSoFar,
               state: creditsSoFar >= j.cap ? "at-cap" : creditsSoFar >= j.cap * 0.8 ? "near-cap" : "counting" },
      };
    }

    // Settlement: commit the MEASURED amount, release the rest. Charged is
    // always ≤ quoted.
    case "SETTLE": {
      const j = st.job;
      const used = a.used ?? Math.round(j.estimate);
      const holds = st.holds.map((h) => (h.id === j.hold.id ? { ...h, state: "committed" } : h));
      const entry = {
        id: nextId("le"), type: "spend", delta: -used, bucket: a.bucket || "promo",
        created_at: new Date().toISOString(), reason: j.headline,
        tool: a.tool || "capture.transcribe", tool_version: 3, model_tier: j.tier,
        units: Number(j.unitsEstimate.toFixed(1)), unit_label: j.unitLabel,
        rate_version: "rc_2026_09_01", job_id: j.hold.job_id, authorised_by: "aman",
        payer: "acc_7fa2", estimate_was: j.hold.amount, released: j.hold.amount - used,
        appended: true,
      };
      return {
        ...st, holds, ledger: [entry, ...st.ledger], step: "settle",
        settled: { outcome: a.outcome || "completed", held: j.hold.amount, used,
                   returned: j.hold.amount - used, measuredNote: a.measuredNote },
        job: null,
      };
    }

    // A job that fails on our side is NEVER charged. The hold is voided.
    case "FAIL": {
      const j = st.job;
      const holds = st.holds.map((h) => (h.id === j.hold.id ? { ...h, state: "released" } : h));
      return {
        ...st, holds, step: "settle", job: null,
        settled: { outcome: "failed", held: j.hold.amount, used: 0, returned: j.hold.amount },
      };
    }

    case "TOPUP": {
      const entry = {
        id: nextId("le"), type: "grant", delta: a.credits, bucket: "purchased",
        created_at: new Date().toISOString(), reason: `Top-up — ${a.label}`,
        expires_at: "2027-09-21T00:00:00Z", rate_version: "rc_2026_09_01", appended: true,
        authorised_by: "aman",
      };
      return { ...st, ledger: [entry, ...st.ledger], step: a.then || "tool", pack: a.pack };
    }
    case "PACK": return { ...st, pack: a.pack };
    case "TIER": return { ...st, tier: a.tier, baseCost: a.baseCost ?? st.baseCost, step: "go" };
    case "RESET": return a.initial;
    default: return st;
  }
}

