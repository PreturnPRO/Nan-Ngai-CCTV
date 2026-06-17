import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/prisma';
import { haversineKm, etaMinutes } from '@/lib/geo';

// GET /api/trafficaid/nearest?lat=..&lng=..&limit=..
// Returns active traffic-aid posts ordered by distance to the given point,
// each annotated with distance (km) and estimated ETA (minutes).
export async function GET(req: Request) {
	try {
		const session = await auth();
		if (!session || !session.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const url = new URL(req.url);
		const lat = parseFloat(url.searchParams.get('lat') ?? '');
		const lng = parseFloat(url.searchParams.get('lng') ?? '');
		const limit = parseInt(url.searchParams.get('limit') ?? '3');

		if (Number.isNaN(lat) || Number.isNaN(lng)) {
			return NextResponse.json(
				{ error: 'Valid lat and lng query params are required' },
				{ status: 400 }
			);
		}

		const posts = await prisma.trafficAidPost.findMany({
			where: { status: 'active' },
		});

		const ranked = posts
			.map(post => {
				const distanceKm = haversineKm(lat, lng, post.latitude, post.longitude);
				return {
					...post,
					distanceKm: Math.round(distanceKm * 100) / 100,
					etaMinutes: etaMinutes(distanceKm),
				};
			})
			.sort((a, b) => a.distanceKm - b.distanceKm)
			.slice(0, limit);

		return NextResponse.json({ nearest: ranked[0] ?? null, posts: ranked });
	} catch (error) {
		console.error('Error finding nearest traffic aid post:', error);
		return NextResponse.json(
			{ error: 'Failed to find nearest traffic aid post' },
			{ status: 500 }
		);
	}
}
