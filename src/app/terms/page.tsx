export default function TermsOfServicePage() {
  return (
    <main className="flex-1 px-6 py-16 max-w-2xl mx-auto">
      <h1 className="gilded-heading font-display text-3xl mb-4">Terms of Service</h1>
      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6 mb-6">
        <p className="font-sans text-sm">
          <strong>Placeholder.</strong> This page needs real legal copy —
          drafted or reviewed by a lawyer — covering eligibility (18+),
          acceptable use and prohibited conduct, the photo content policy
          referenced during signup, account suspension/termination,
          membership/billing terms once those launch, limitation of
          liability, and dispute resolution. Replace this entire page
          before launch.
        </p>
      </div>
      <p className="font-sans text-sm text-[var(--paper-dim)]">
        In the meantime: MarryMe.sg is for people 18 and older, and photos
        must clearly show your face with no obscene, offensive, or
        misleading content — uploads are screened automatically and
        accounts may be suspended for violations.
      </p>
    </main>
  );
}
