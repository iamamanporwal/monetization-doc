import "./globals.css";

export const metadata = {
  title: "The HERE Money Model",
  description:
    "Five pages on how HERE makes money: the North Star metric tree, the credit rate card, Tier 8 Live Surfaces priced against real Google Cloud rates, the billing lifecycle, the two fixed costs, and two plans modelled to month twelve.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,600;12..96,75..100,800&family=Karla:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
