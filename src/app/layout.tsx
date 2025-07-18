// src/app/layout.tsx (Updated with Auth)

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KureCal - Antidote to Information Overload",
  description:
    "A modern calendar for tech conferences, keynotes, software releases, and updates. Never miss important tech events again.",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kurecal.com",
    siteName: "KureCal",
    title: "KureCal - Antidote to Information Overload",
    description:
      "All major tech conferences, product launches and developer events in one beautiful calendar.",
    images: [
      { url: "/web-app-manifest-512x512.png", width: 512, height: 512, alt: "TechCalendar preview" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KureCal - Antidote to Information Overload",
    description:
      "Unified calendar for Apple, Google, Microsoft and startup events.",
    images: ["/web-app-manifest-512x512.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}