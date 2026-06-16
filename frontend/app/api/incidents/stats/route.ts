import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/prisma';

// GET /api/incidents/stats
// Aggregates for the Accident Logs dashboard cards (Page 1):
//   - systemHealth:   % of CCTV cameras currently active
//   - avgResponseSec: mean time from detection to verification
//   - falsePositives24h: incidents REJECTED in the last 24 hours
export async function GET() {
	try {
		const session = await auth();
		if (!session || !session.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const [totalCameras, activeCameras, verified, falsePositives24h] =
			await Promise.all([
				prisma.cCTV.count(),
				prisma.cCTV.count({ where: { status: 'active' } }),
				prisma.incident.findMany({
					where: { verifiedAt: { not: null } },
					select: { detectedAt: true, verifiedAt: true },
				}),
				prisma.incident.count({
					where: {
						verificationStatus: 'REJECTED',
						updatedAt: { gte: since24h },
					},
				}),
			]);

		const responseSecs = verified.map(
			i => (i.verifiedAt!.getTime() - i.detectedAt.getTime()) / 1000
		);
		const avgResponseSec = responseSecs.length
			? Math.round(responseSecs.reduce((a, b) => a + b, 0) / responseSecs.length)
			: null;

		const systemHealth = totalCameras
			? Math.round((activeCameras / totalCameras) * 100)
			: 0;

		return NextResponse.json({
			systemHealth,
			totalCameras,
			activeCameras,
			avgResponseSec,
			falsePositives24h,
		});
	} catch (error) {
		console.error('Error computing incident stats:', error);
		return NextResponse.json(
			{ error: 'Failed to compute incident stats' },
			{ status: 500 }
		);
	}
}
