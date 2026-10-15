import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { getSiteSettingsForRequest } from "@/src/editorial/preview-content.server";

import { BagOverlayBoundary } from "./ui/bag-overlay-boundary";
import {
  FooterBagTrigger,
  ShellNavigation,
} from "./ui/shell-navigation";
import shellStyles from "./ui/shell-navigation.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  display: "swap",
  preload: false,
  style: "italic",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "VANTA — Sound, given mass.",
    template: "%s | VANTA",
  },
  description:
    "VANTA creates MONOLITH, an eight-voice hybrid desktop synthesizer shaped by continuous movement between SUB and FRACTURE.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const siteSettings = await getSiteSettingsForRequest();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a className={shellStyles.skipLink} href="#main-content">
          Skip to main content
        </a>
        <header className={shellStyles.siteHeader}>
          <Link aria-label="VANTA home" className={shellStyles.siteBrand} href="/">
            VANTA
          </Link>
          <ShellNavigation bagContent={<BagOverlayBoundary />} />
        </header>
        {children}
        <footer className={shellStyles.siteFooter}>
          <p>VANTA / MONOLITH</p>
          <nav aria-label="Footer navigation" className={shellStyles.footerNavigation}>
            <Link href="/">Home</Link>
            <Link href="/monolith">Product</Link>
            <Link href="/synth">Synth</Link>
            <Link href={siteSettings.privacyNoticeUrl}>Privacy</Link>
            <FooterBagTrigger />
          </nav>
        </footer>
      </body>
    </html>
  );
}
