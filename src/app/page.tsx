import Link from "next/link";
import { Interlace } from "@/components/Interlace";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="px-6 pt-20 pb-16 md:pt-28 md:pb-24 max-w-3xl mx-auto text-center">
        <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold-soft mb-6">
          Singapore · Est. for people who mean it
        </p>
        <h1 className="font-display text-4xl md:text-6xl leading-[1.05] italic text-[var(--text-on-ink)]">
          Date like you&rsquo;re building
          <br className="hidden md:block" /> a life, not a highlight reel.
        </h1>
        <p className="font-sans text-base md:text-lg text-[var(--paper-dim)] mt-6 max-w-xl mx-auto">
          MarryMe.sg is a matchmaking home for Singapore&rsquo;s many
          communities — Chinese, Malay, Indian, Eurasian, and everyone
          between — built around one question: is this someone you&rsquo;d
          actually marry.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Link
            href="/signup"
            className="bg-gold text-ink font-sans font-medium px-6 py-3 rounded-full hover:bg-gold-soft transition-colors"
          >
            Create your profile
          </Link>
          <Link
            href="/login"
            className="font-sans text-[var(--paper-dim)] px-6 py-3 hover:text-[var(--text-on-ink)] transition-colors"
          >
            Sign in
          </Link>
        </div>
        <div className="flex justify-center mt-14">
          <Interlace />
        </div>
      </section>

      {/* Positioning pillars */}
      <section className="px-6 py-16 md:py-20 bg-paper text-[var(--text-on-paper)]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10">
          <Pillar
            eyebrow="Built for here"
            title="Every community, one table"
            body="Filters and matching that understand Singapore's mix of races, religions, and family expectations — instead of pretending they don't exist."
            accent="var(--jade)"
          />
          <Pillar
            eyebrow="Vetted, not viral"
            title="Curated, not swiped"
            body="No infinite scroll. You receive a small, considered set of matches from our team and our matching model — quality over volume."
            accent="var(--maroon)"
          />
          <Pillar
            eyebrow="Verified people"
            title="Real identity, real intent"
            body="Sign in with Singpass, so who you're speaking to is exactly who they say they are. Built for people ready to date seriously."
            accent="var(--gold)"
          />
        </div>
      </section>

      {/* CTA band */}
      <section className="px-6 py-20 text-center">
        <h2 className="font-display italic text-2xl md:text-3xl max-w-lg mx-auto">
          Your next chapter starts with one honest conversation.
        </h2>
        <Link
          href="/signup"
          className="inline-block mt-8 bg-gold text-ink font-sans font-medium px-7 py-3 rounded-full hover:bg-gold-soft transition-colors"
        >
          Join MarryMe.sg
        </Link>
      </section>

      <footer className="px-6 py-8 text-center font-sans text-xs text-[var(--paper-dim)] opacity-60">
        MarryMe.sg — Singapore
      </footer>
    </main>
  );
}

function Pillar({
  eyebrow,
  title,
  body,
  accent,
}: {
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div className="text-left">
      <div
        className="w-8 h-[3px] mb-4 rounded-full"
        style={{ background: accent }}
      />
      <p className="font-sans text-xs tracking-[0.15em] uppercase opacity-60 mb-2">
        {eyebrow}
      </p>
      <h3 className="font-display text-xl mb-2">{title}</h3>
      <p className="font-sans text-sm leading-relaxed opacity-80">{body}</p>
    </div>
  );
}
