import fs from "node:fs";
import path from "node:path";
import PagerScript from "../components/PagerScript";

// Same static-markup approach as the main page: the five-page update is checked
// in as markup under /content and rendered with the shared house stylesheet.
const contentPath = path.join(process.cwd(), "content", "summary-update.html");
const html = fs.readFileSync(contentPath, "utf8");

export const metadata = {
  title: "Summary Update — The HERE Money Model",
  description:
    "The updated five-page Monetization PRD: Tier 8 Live Surfaces, the two fixed-cost pillars, the 3× infrastructure exception, and free hosting envelopes on every plan.",
};

export default function SummaryUpdate() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <PagerScript />
    </>
  );
}
