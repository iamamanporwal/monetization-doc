# The HERE Money Model

Five-page Next.js site: the North Star metric tree, the credit rate card,
the billing lifecycle, the $500 guardian maths, and two plans modelled to
month twelve. All twelve illustrations are static, pre-computed SVG markup
baked into `content/page.html` — no client-side chart library, no runtime
computation. The only client JS is `app/components/PagerScript.js`, which
highlights the current page number in the floating pager on scroll.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
vercel
```

Or push this folder to a GitHub repo and import it at vercel.com/new —
zero configuration needed, it's a standard Next.js App Router project.

## Structure

```
app/
  layout.js              <html>/<head> shell, Google Fonts, page metadata
  globals.css            all page styles (light + dark, extracted 1:1)
  page.js                reads content/page.html and renders it
  components/
    PagerScript.js       client component: scroll-spy for the page dots
content/
  page.html              the five pages of markup + inlined SVGs
```

## Editing content

`content/page.html` is plain HTML — edit it directly, or regenerate it from
the original SVG/illustration generator scripts (`illos.mjs`, `charts.mjs`,
`build.mjs`) if you want to change the computed charts.
