import type { Metadata } from "next";
import { Geist, Geist_Mono, Bangers } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RatingsNotice } from "@/components/ratings-notice";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const comic = Bangers({ variable: "--font-comic", weight: "400", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MCU Watchlist - watch order tracker for Avengers: Doomsday",
    template: "%s | MCU Watchlist",
  },
  description:
    "Track your Marvel Cinematic Universe watch order in story or release order, see what to watch before Avengers: Doomsday, and plan a viewing schedule that fits your week.",
  openGraph: { type: "website", siteName: "MCU Watchlist" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${comic.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppProvider>
          <AppShell>
            <SiteHeader />
            <RatingsNotice />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
            <SiteFooter />
          </AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
