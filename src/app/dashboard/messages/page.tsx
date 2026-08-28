// Messaging stub. Wire to the MySQL `messages` table (see
// mysql/schema.sql) once matches can actually connect — polling or a
// small WebSocket/SSE layer instead of Supabase Realtime.

export default function MessagesPage() {
  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl mb-1">Messages</h1>
      <p className="font-sans text-sm text-[var(--paper-dim)] mb-8">
        Conversations with people you&rsquo;ve said hello to will appear
        here.
      </p>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-12 text-center">
        <p className="font-sans text-sm opacity-70">
          No conversations yet. Say hello to a match to start one.
        </p>
      </div>
    </main>
  );
}
