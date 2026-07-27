import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { AuthTabs } from "@/components/AuthTabs";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your profile"
      subtitle="Two minutes to get started — real details come next."
      footer={
        <>
          Already a member?{" "}
          <Link href="/login" className="text-gold-soft underline">
            Sign in
          </Link>
        </>
      }
    >
      <AuthTabs intent="signup" />
    </AuthCard>
  );
}
