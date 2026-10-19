/* eslint-disable @next/next/no-html-link-for-pages -- Secondary shell links use resilient full-document navigation so Next Link stays outside the critical Product bundle. */
import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

import { resolveCanonicalOrigin } from "@/src/discoverability/configuration";
import { getSiteSettingsForRequest } from "@/src/editorial/preview-content.server";

import { FooterBagTrigger } from "./ui/bag-trigger";
import { DeferredShellNavigation } from "./ui/deferred-shell-navigation";
import { EditorialVisualEditing } from "./ui/editorial-visual-editing";
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
  metadataBase: new URL(resolveCanonicalOrigin()),
  applicationName: "VANTA",
  title: {
    default: "VANTA — Sound, given mass.",
    template: "%s | VANTA",
  },
  description:
    "VANTA creates MONOLITH, an eight-voice hybrid desktop synthesizer shaped by continuous movement between SUB and FRACTURE.",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
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
          <a
            aria-label="VANTA home"
            className={shellStyles.siteBrand}
            href="/"
          >
            VANTA
          </a>
          <DeferredShellNavigation />
        </header>
        {children}
        <footer className={shellStyles.siteFooter}>
          <p>VANTA / MONOLITH</p>
          <nav
            aria-label="Footer navigation"
            className={shellStyles.footerNavigation}
          >
            <a href="/">Home</a>
            <a href="/monolith">Product</a>
            <a href="/synth">Synth</a>
            <a href={siteSettings.privacyNoticeUrl}>Privacy</a>
            <FooterBagTrigger />
          </nav>
        </footer>
        <EditorialVisualEditing />
      </body>
    </html>
  );
}
