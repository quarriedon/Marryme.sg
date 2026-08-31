import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { GoldFlakes } from "@/components/GoldFlakes";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MarryMe.sg — Dating with intention",
  description:
    "A Singapore matchmaking platform for people who want to date with a real future in mind — built for the country's multicultural fabric.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-[var(--text-on-ink)]">
        <GoldFlakes />
        <SessionProvider>
          <div className="relative z-10 flex-1 flex flex-col">{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
