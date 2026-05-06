import type { NextAuthConfig } from "next-auth";

export default {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isPublic =
        path === "/login" ||
        path.startsWith("/api/auth") ||
        path.startsWith("/_next") ||
        path === "/favicon.ico";
      if (isPublic) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
