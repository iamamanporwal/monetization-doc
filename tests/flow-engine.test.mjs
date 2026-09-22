// The five trust rules from PART 2, as executable checks against the engine.
import { reducer, balance, openHolds, available } from "../app/credit-billing/lib/flow-engine.js";

let pass = 0, fail = 0;
const t = (name, cond) => { cond ? (pass++, console.log("  ok   " + name)) : (fail++, console.log("  FAIL " + name)); };

const fresh = () => ({
  step: "grant",
  ledger: [{ id: "g", type: "grant", delta: 2000, bucket: "promo", appended: true, created_at: "2026-09-21T09:00:00Z", reason: "Welcome grant" }],
  holds: [], job: null, settled: null,
});
const go = (st, estimate = 55) => reducer(st, {
  type: "HOLD", estimate, tier: "standard", cap: 90, headline: "Transcribe — standup, 18m",
  unitsEstimate: 18.4, unitLabel: "audio minutes",
});

console.log("RULE 1 — a GO holds, it does not charge");
{
  const a = fresh(), b = go(a);
  t("balance is untouched by a hold", balance(b.ledger) === 2000);
  t("the hold is estimate x 1.2 = 66", openHolds(b.holds) === 66);
  t("available drops by the hold, balance does not", available(b) === 1934);
  t("no ledger row is written at GO time", b.ledger.length === a.ledger.length);
}

console.log("RULE 2 — a job that fails on our side is never charged");
{
  const b = go(fresh());
  const f = reducer(b, { type: "FAIL" });
  t("balance is numerically unchanged", balance(f.ledger) === 2000);
  t("no spend row exists", f.ledger.filter((e) => e.type === "spend").length === 0);
  t("the hold is released, not committed", f.holds[0].state === "released");
  t("nothing is reserved any more", openHolds(f.holds) === 0);
  t("the receipt returns the whole hold", f.settled.returned === 66 && f.settled.used === 0);
}

console.log("RULE 4 — we settle the measured amount, never the estimate");
{
  const b = go(fresh());
  const s = reducer({ ...b, job: { ...b.job, creditsSoFar: 55 } }, { type: "SETTLE", used: 55, bucket: "promo" });
  t("charged is less than the hold", s.settled.used < s.settled.held);
  t("held 66, used 55, returned 11", s.settled.held === 66 && s.settled.used === 55 && s.settled.returned === 11);
  t("balance is 2000 - 55 = 1945", balance(s.ledger) === 1945);
  t("the hold no longer reserves anything", openHolds(s.holds) === 0);
  t("the spend row records units and rate version", s.ledger[0].units === 18.4 && s.ledger[0].rate_version === "rc_2026_09_01");
  t("the row records what was released", s.ledger[0].released === 11);
}

console.log("RULE — stopping mid-job charges only what was measured");
{
  const b = go(fresh());
  const stopped = reducer({ ...b, job: { ...b.job, creditsSoFar: 43, unitsDone: 14.2 } },
    { type: "SETTLE", used: 43, outcome: "partial", measuredNote: "14.2 minutes", bucket: "promo" });
  t("only the measured 43 cr is charged", balance(stopped.ledger) === 1957);
  t("the rest of the hold comes back", stopped.settled.returned === 23);
}

console.log("RULE — cancelling a GO creates nothing");
{
  const a = fresh();
  const cancelled = reducer(a, { type: "GOTO", step: "tool", note: "Cancelled." });
  t("no hold", cancelled.holds.length === 0);
  t("no ledger row", cancelled.ledger.length === 1);
  t("balance unchanged", balance(cancelled.ledger) === 2000);
}

console.log("RULE — settle is never more than the quote, over many runs");
{
  let bad = 0;
  for (let est = 3; est <= 900; est += 7) {
    for (const frac of [0.1, 0.5, 0.87, 1]) {
      const b = go(fresh(), est);
      const used = Math.round(est * frac);
      const s = reducer({ ...b, job: b.job }, { type: "SETTLE", used, bucket: "promo" });
      if (s.settled.used > s.settled.held) bad++;
      if (balance(s.ledger) !== 2000 - used) bad++;
    }
  }
  t("516 settlements, none charged above the hold and all balances derive correctly", bad === 0);
}

console.log("A top-up lands in the purchased bucket, spent last");
{
  const b = reducer(fresh(), { type: "TOPUP", credits: 2500, label: "Maker pack" });
  t("balance 2000 + 2500", balance(b.ledger) === 4500);
  t("bucket is purchased", b.ledger[0].bucket === "purchased");
  t("it is a grant, not a spend", b.ledger[0].type === "grant");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
