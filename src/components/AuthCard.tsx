import Link from "next/link";
import { ReactNode } from "react";
import { Interlace } from "@/components/Interlace";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="font-display italic text-lg text-gold-soft block text-center mb-8"
        >
          MarryMe.sg
        </Link>
        <div className="bg-paper text-[var(--text-on-paper)] rounded-2xl px-7 py-8">
          <h1 className="font-display text-2xl mb-1">{title}</h1>
          <p className="font-sans text-sm opacity-70 mb-6">{subtitle}</p>
          {children}
        </div>
        <div className="flex justify-center my-6">
          <Interlace className="opacity-70" />
        </div>
        <p className="font-sans text-sm text-center text-[var(--paper-dim)]">
          {footer}
        </p>
      </div>
    </main>
  );
}
