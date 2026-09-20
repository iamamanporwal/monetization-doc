"use client";

import { useEffect } from "react";

// Highlights the current page number in the floating pager as the reader
// scrolls, using the same IntersectionObserver logic as the original page.
export default function PagerScript() {
  useEffect(() => {
    const links = Array.prototype.slice.call(document.querySelectorAll(".pager a"));
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
    return () => io.disconnect();
  }, []);

  return null;
}
