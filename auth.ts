import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import authConfig from "./auth.config";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { loginSchema } from "@/lib/validators";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "agent";
      agentName?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "agent";
    agentName?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const parsed = loginSchema.safeParse(creds);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const [user] = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
          .limit(1);
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          agentName: user.agentName,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: "admin" | "agent" }).role;
        token.agentName = (user as { agentName?: string | null }).agentName ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.agentName = token.agentName;
      return session;
    },
  },
});
