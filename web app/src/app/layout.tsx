import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { firebaseConfig } from "@/lib/firebase";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const firebaseConfigScript = `window.__FIREBASE_CONFIG__ = ${JSON.stringify(firebaseConfig)};`;

export const metadata: Metadata = {
  title: "TalentCompass AI"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script id="firebase-config" strategy="beforeInteractive">
          {firebaseConfigScript}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
