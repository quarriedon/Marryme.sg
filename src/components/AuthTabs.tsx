"use client";

import { useState, FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Mode = "email" | "phone";
type Intent = "signup" | "login";

const inputClass =
  "w-full font-sans text-sm bg-white/70 border border-black/10 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] placeholder:text-black/40";

export function AuthTabs({ intent }: { intent: Intent }) {
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (intent === "signup") {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setLoading(false);
        setError(body.error ?? "Could not create your account.");
        return;
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push(
      intent === "signup" ? "/onboarding/personality-test" : "/dashboard/matches"
    );
  }

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not send a code — please try again.");
      return;
    }
    setOtpSent(true);
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("phone-otp", {
      phone,
      code: otp,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("That code didn't work — check it and try again.");
      return;
    }
    router.push(intent === "signup" ? "/onboarding/personality-test" : "/dashboard/matches");
  }

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-black/5 rounded-lg p-1">
        <TabButton active={mode === "email"} onClick={() => setMode("email")}>
          Email
        </TabButton>
        <TabButton active={mode === "phone"} onClick={() => setMode("phone")}>
          Phone
        </TabButton>
      </div>

      {mode === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email address"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min. 8 characters)"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <SubmitButton loading={loading}>
            {intent === "signup" ? "Create your profile" : "Sign in"}
          </SubmitButton>
        </form>
      )}

      {mode === "phone" && !otpSent && (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <input
            type="tel"
            required
            placeholder="+65 8123 4567"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <SubmitButton loading={loading}>Send code</SubmitButton>
        </form>
      )}

      {mode === "phone" && otpSent && (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <input
            type="text"
            required
            inputMode="numeric"
            placeholder="6-digit code"
            className={inputClass}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <SubmitButton loading={loading}>Verify &amp; continue</SubmitButton>
        </form>
      )}

      {/* Singpass — disabled until the relying-party application
          with the Singpass developer portal is approved. */}
      <button
        type="button"
        disabled
        title="Coming soon — pending Singpass relying-party approval"
        className="w-full mt-3 font-sans text-sm border border-black/10 text-black/40 rounded-lg px-3 py-2.5 cursor-not-allowed flex items-center justify-center gap-2"
      >
        Continue with Singpass
        <span className="text-xs bg-black/5 rounded-full px-2 py-0.5">
          Coming soon
        </span>
      </button>

      {error && (
        <p className="font-sans text-sm text-[var(--maroon)] mt-3">{error}</p>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 font-sans text-sm py-1.5 rounded-md transition-colors ${
        active ? "bg-white shadow-sm" : "text-black/50"
      }`}
    >
      {children}
    </button>
  );
}

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-ink text-[var(--paper)] font-sans font-medium rounded-lg px-3 py-2.5 hover:bg-ink-soft transition-colors disabled:opacity-50"
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
