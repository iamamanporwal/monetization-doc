"use client";

import { useEffect } from "react";

// Highlights the current page number in the floating pager as the reader
// scrolls, using the same IntersectionObserver logic as the original page.
export default function PagerScript() {
  useEffect(() => {
    // Only the in-page anchors take part in scroll highlighting; the pager also
    // carries a cross-document link (Summary Update / back to the money model).
    const links = Array.prototype.slice
      .call(document.querySelectorAll(".pager a"))
      .filter((a) => (a.getAttribute("href") || "").charAt(0) === "#");
    const pages = links.map((a) => document.querySelector(a.getAttribute("href")));
    if (!("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = pages.indexOf(e.target);
          if (i < 0) return;
          links.forEach((a, j) => a.classList.toggle("on", i === j));
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    pages.forEach((p) => p && io.observe(p));

    // The version switcher is a bare <details>, so it needs the two dismissals
    // people expect from a menu: click anywhere else, or press Escape.
    const sw = document.querySelector("details.vsw");
    const onDown = (e) => {
      if (sw && sw.open && !sw.contains(e.target)) sw.open = false;
    };
    const onKey = (e) => {
      if (e.key === "Escape" && sw && sw.open) {
        sw.open = false;
        const s = sw.querySelector("summary");
        if (s) s.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      io.disconnect();
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
