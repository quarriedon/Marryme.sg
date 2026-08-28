import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";
import type { OtpCodeRow, UserRole, UserRow, UserStatus } from "@/types/database";

/**
 * Two Credentials providers, replacing Supabase Auth's email/password
 * and phone-OTP sign-in. Account *creation* happens in our own API
 * routes (POST /api/auth/signup, POST /api/auth/send-otp) — these
 * providers only verify credentials against MySQL and issue a
 * session. Structured so a future Singpass provider slots in
 * alongside these without touching either.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await queryOne<UserRow>(
          "SELECT * FROM users WHERE email = ? LIMIT 1",
          [email]
        );
        if (!user?.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
    Credentials({
      id: "phone-otp",
      name: "Phone verification code",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone;
        const code = credentials?.code;
        if (typeof phone !== "string" || typeof code !== "string") {
          return null;
        }

        const otp = await queryOne<OtpCodeRow>(
          `SELECT * FROM otp_codes
           WHERE phone = ? AND consumed_at IS NULL AND expires_at > NOW()
           ORDER BY created_at DESC LIMIT 1`,
          [phone]
        );
        if (!otp) return null;

        const valid = await bcrypt.compare(code, otp.code_hash);
        if (!valid) return null;

        await query("UPDATE otp_codes SET consumed_at = NOW() WHERE id = ?", [
          otp.id,
        ]);

        // Phone sign-in doubles as sign-up, matching the previous
        // Supabase behaviour: verifying a code creates the account
        // if it doesn't already exist.
        let user = await queryOne<UserRow>(
          "SELECT * FROM users WHERE phone = ? LIMIT 1",
          [phone]
        );
        if (!user) {
          await query("INSERT INTO users (phone) VALUES (?)", [phone]);
          user = await queryOne<UserRow>(
            "SELECT * FROM users WHERE phone = ? LIMIT 1",
            [phone]
          );
        }
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.status = token.status as UserStatus;
      return session;
    },
  },
});
