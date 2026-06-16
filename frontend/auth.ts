import NextAuth from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
	secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
	// @auth/prisma-adapter pulls @auth/core 0.38 while next-auth bundles 0.41;
	// the Adapter shapes are compatible, so cast to next-auth's expected type
	// to bridge the duplicate-version mismatch.
	adapter: PrismaAdapter(prisma) as Adapter,
	session: {
		strategy: 'jwt',
	},
	providers: [
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					throw new Error('Please enter an email and password');
				}

				const user = await prisma.user.findUnique({
					where: { email: credentials.email as string },
				});

				if (!user || !user.password) {
					throw new Error('No user found with this email');
				}

				const passwordMatch = await bcrypt.compare(
					credentials.password as string,
					user.password
				);

				if (!passwordMatch) {
					throw new Error('Incorrect password');
				}

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role, // Attach the role to the returned user
				};
			},
		}),
	],
	callbacks: {
		async session({ session, token }) {
			// Attach user details to the session
			if (session.user) {
				session.user.id = token.id as string;
				session.user.role = token.role as string;
			}
			return session;
		},
		async jwt({ token, user }) {
			// user is only available the first time right after sign in
			if (user) {
				token.id = user.id as string;
				// @ts-ignore
				token.role = user.role;
			}
			return token;
		},
	},
	pages: {
		signIn: '/login', // Custom login page
	},
});
