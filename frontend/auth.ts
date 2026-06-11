import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
	secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
	adapter: PrismaAdapter(prisma),
	providers: [
		Google({
			clientId: process.env.AUTH_GOOGLE_ID!,
			clientSecret: process.env.AUTH_GOOGLE_SECRET!,
		}),
	],
	callbacks: {
		async session({ session, token, user }) {
			// Attach user details to the session
			if (session.user) {
				session.user.id = user.id;
				session.user.name = user.name;
				session.user.email = user.email;
				session.user.image = user.image;
			}
			return session;
		},
		async jwt({ token, user }) {
			// Attach user details to the JWT token
			if (user) {
				token.id = user.id;
				token.name = user.name;
				token.email = user.email;
				token.picture = user.image;
			}
			return token;
		},
	},
});
