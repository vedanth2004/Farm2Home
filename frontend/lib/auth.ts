import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        // For demo purposes, we'll use a simple password check
        // In production, you'd hash passwords properly
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password || "",
        );

        if (!isPasswordValid) {
          return null;
        }

        // Check account status: Only APPROVED users can log in
        // Note: TypeScript types may need IDE/server restart after prisma generate
        const accountStatus = (user as any).accountStatus as string | undefined;
        if (accountStatus !== "APPROVED") {
          return null; // Will trigger error in signin handler
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          internalId: (user as any).internalId || user.id,
          displayId: (user as any).displayId || user.id,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.internalId = user.internalId;
        token.displayId = user.displayId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.internalId = token.internalId;
        session.user.displayId = token.displayId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
