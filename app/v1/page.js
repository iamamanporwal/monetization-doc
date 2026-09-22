import fs from "node:fs";
import path from "node:path";
import PagerScript from "../components/PagerScript";

// v1 of the money model, frozen as published on 20 September 2026. Kept
// readable so the numbers v2 corrects can still be checked against the
// original. Served from content/page-v1.html; never edited in place.
const contentPath = path.join(process.cwd(), "content", "page-v1.html");
const html = fs.readFileSync(contentPath, "utf8");

export const metadata = {
  title: "v1 — The HERE Money Model",
  description:
    "The original five-page Monetization PRD, as published 20 September 2026 — before Tier 8 Live Surfaces, the infrastructure margin exception, and the egress correction.",
};

export default function V1() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <PagerScript />
    </>
  );
}
