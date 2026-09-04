import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";
import { verifyAndConsumeOtp } from "@/lib/otp";
import type { UserRole, UserRow, UserStatus } from "@/types/database";

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

        const valid = await verifyAndConsumeOtp(phone, code);
        if (!valid) return null;

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
        // `user` is only populated on an actual sign-in (not on every
        // JWT refresh), so this runs once per login — see the
        // Activity summary on /dashboard/profile.
        await query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
      } else if (token.id) {
        // Re-checked on every request that reads the session (confirmed:
        // this branch runs on every page/route that calls auth(), not
        // just occasionally) — so promoting/demoting a user's role, or
        // approving/suspending their account, directly in the database
        // takes effect on their very next request instead of requiring
        // a full logout/login to get a fresh JWT. A single indexed
        // lookup by primary key; cheap at this app's scale.
        const current = await queryOne<Pick<UserRow, "role" | "status">>(
          "SELECT role, status FROM users WHERE id = ?",
          [token.id]
        );
        if (current) {
          token.role = current.role;
          token.status = current.status;
        }
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
