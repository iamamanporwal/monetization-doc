import fs from "node:fs";
import path from "node:path";
import PagerScript from "./components/PagerScript";

// The page content and its twelve computed SVG illustrations are generated
// at build time from real formulas (see /generator in the repo root) and
// checked in as static markup here, so the page ships with zero client JS
// beyond the small pager-highlight script below.
const contentPath = path.join(process.cwd(), "content", "page.html");
const html = fs.readFileSync(contentPath, "utf8");

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <PagerScript />
    </>
  );
}
