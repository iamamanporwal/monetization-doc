import fs from "node:fs";
import path from "node:path";
import PagerScript from "../components/PagerScript";
import "./crypto.css";

// Same static-markup approach as the other pages: the stablecoin PRD is checked
// in as markup under /content and rendered with the shared house stylesheet,
// plus a few page-specific components in crypto.css.
const contentPath = path.join(process.cwd(), "content", "crypto.html");
const html = fs.readFileSync(contentPath, "utf8");

export const metadata = {
  title: "Stablecoin Payments — HERE Monetization PRD",
  description:
    "How HERE accepts USDC next to Card and UPI: the market, five decisions, user flows, unit economics, failure policy, compliance and a 90-day rollout.",
};

export default function Crypto() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <PagerScript />
    </>
  );
}
