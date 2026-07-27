import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { AuthTabs } from "@/components/AuthTabs";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to see your matches and messages."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-gold-soft underline">
            Create a profile
          </Link>
        </>
      }
    >
      <AuthTabs intent="login" />
    </AuthCard>
  );
}
