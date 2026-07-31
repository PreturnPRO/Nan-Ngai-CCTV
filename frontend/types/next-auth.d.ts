/* eslint-disable @typescript-eslint/no-unused-vars */
// These imports look unused but are required for the module augmentations below.
import NextAuth, { type DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
	interface Session {
		user: {
			id: string;
			role: string;
		} & DefaultSession['user'];
	}

	interface User {
		role: string;
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		id: string;
		role: string;
	}
}
