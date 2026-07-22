import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

/**
 * Typography (brief §5) — provisional pass, final faces are a stakeholder
 * decision. Proposed options documented in README: display = Fraunces
 * (chosen) / Bricolage Grotesque / Instrument Serif; body = Hanken Grotesk;
 * metrics = Spline Sans Mono (tabular numerals).
 */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz"],
});
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans" });
const mono = Spline_Sans_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "CodeHive", template: "%s · CodeHive" },
  description: "The private community for AI leaders — stacked by Redington.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
