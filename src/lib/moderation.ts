// Content moderation via Google Cloud Vision's SafeSearch + face
// detection, called directly over REST (no SDK) — see the "why
// Google Vision" note in mysql/migrations and the project README.
// Needs GOOGLE_CLOUD_VISION_API_KEY. Without it, this skips
// moderation entirely (loud warning, not a silent gap) rather than
// blocking every upload in environments that haven't set it up yet.

type Likelihood =
  | "UNKNOWN"
  | "VERY_UNLIKELY"
  | "UNLIKELY"
  | "POSSIBLE"
  | "LIKELY"
  | "VERY_LIKELY";

export type ModerationResult =
  | { ok: true }
  | { ok: false; reason: string; publicMessage: string };

const REJECT_LIKELIHOODS: Likelihood[] = ["LIKELY", "VERY_LIKELY"];

const PROVIDER_ERROR_RESULT: ModerationResult = {
  ok: false,
  reason: "provider_error",
  publicMessage: "We couldn't process this photo right now — please try again.",
};

export async function moderatePhoto(buffer: Buffer): Promise<ModerationResult> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    console.warn(
      "[moderation] GOOGLE_CLOUD_VISION_API_KEY is not set — skipping photo " +
        "moderation. Uploads are NOT currently screened for inappropriate " +
        "content or checked for a visible face. Set this env var before launch."
    );
    return { ok: true };
  }

  let response: Response;
  try {
    response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: buffer.toString("base64") },
              features: [
                { type: "SAFE_SEARCH_DETECTION" },
                { type: "FACE_DETECTION" },
              ],
            },
          ],
        }),
      }
    );
  } catch (err) {
    console.error("[moderation] Vision API request failed:", err);
    return PROVIDER_ERROR_RESULT;
  }

  if (!response.ok) {
    console.error(
      "[moderation] Vision API returned",
      response.status,
      await response.text().catch(() => "")
    );
    return PROVIDER_ERROR_RESULT;
  }

  const data = await response.json();
  const result = data?.responses?.[0];

  if (!result || result.error) {
    console.error("[moderation] Vision API error:", result?.error);
    return PROVIDER_ERROR_RESULT;
  }

  const safeSearch = result.safeSearchAnnotation;
  if (safeSearch) {
    const { adult, violence, racy } = safeSearch as Record<string, Likelihood>;
    const flagged =
      REJECT_LIKELIHOODS.includes(adult) ||
      REJECT_LIKELIHOODS.includes(violence) ||
      racy === "VERY_LIKELY";
    if (flagged) {
      return {
        ok: false,
        reason: "explicit_content",
        publicMessage:
          "This photo doesn't meet our content guidelines — please upload a different photo.",
      };
    }
  }

  const faces = result.faceAnnotations ?? [];
  if (faces.length === 0) {
    return {
      ok: false,
      reason: "no_face_detected",
      publicMessage:
        "We couldn't detect a clear face in this photo — please upload one where your face is visible.",
    };
  }

  return { ok: true };
}
