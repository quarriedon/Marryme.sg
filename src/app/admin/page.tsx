// Minimal admin stub for moderating new sign-ups.
// Restrict properly via a `role` column + RLS policy before launch —
// this page currently only checks that a user is signed in.

export default function AdminPage() {
  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl mb-1">Admin</h1>
      <p className="font-sans text-sm text-[var(--paper-dim)] mb-8">
        Pending profile approvals will appear here.
      </p>
      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-12 text-center">
        <p className="font-sans text-sm opacity-70">Nothing pending review.</p>
      </div>
    </main>
  );
}
