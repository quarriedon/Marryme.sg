export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1 px-6 py-16 max-w-2xl mx-auto">
      <h1 className="gilded-heading font-display text-3xl mb-4">Privacy Policy</h1>
      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6 mb-6">
        <p className="font-sans text-sm">
          <strong>Placeholder.</strong> This page needs real legal copy —
          drafted or reviewed by a lawyer — covering what data MarryMe.sg
          collects (profile details, photos, messages, matching activity),
          how it&rsquo;s stored and secured, who it&rsquo;s shared with (e.g. matched
          users, service providers), how long it&rsquo;s retained, and how a
          user can access, correct, or delete their data. Replace this
          entire page before launch.
        </p>
      </div>
      <p className="font-sans text-sm text-[var(--paper-dim)]">
        In the meantime: account data is stored in a MySQL database, photos
        on the application server, and can be permanently deleted at any
        time from your account settings.
      </p>
    </main>
  );
}
