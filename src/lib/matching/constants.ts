// Shared with client components — keep this to plain constants only.
// The actual filtering/scoring logic lives in engine.ts (server-only).
export const BATCH_SIZE = 5;
export const MAX_INTERESTS_PER_BATCH = 2;
export const BATCH_DURATION_DAYS = 7;
// Placeholder — confirm the final cooling-off period before launch.
export const COOLING_OFF_DAYS = 14;
