import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { cwd } from 'process';
import { existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const rtspUrl = formData.get('rtspUrl') as string;
		const latitude = parseFloat(formData.get('latitude') as string);
		const longitude = parseFloat(formData.get('longitude') as string);
		const status = formData.get('status') as string;
		const sector = formData.get('sector') as string | null;
		const roadSegment = formData.get('roadSegment') as string | null;
		const landmark = formData.get('landmark') as string | null;
		const accidentVideo = formData.get('accidentVideo') as File | null;

		let accidentVideoUrl = null;
		let hasAccidentVideo = false;

		if (accidentVideo) {
			const fileName = `${Date.now()}-${accidentVideo.name}`;
			const uploadDir = join(cwd(), 'public', 'uploads');

			if (!existsSync(uploadDir)) {
				await mkdir(uploadDir, { recursive: true });
				console.log(`Created directory: ${uploadDir}`);
			}

			const filePath = join(uploadDir, fileName);
			const buffer = Buffer.from(await accidentVideo.arrayBuffer());

			await writeFile(filePath, buffer);
			console.log(`File saved to: ${filePath}`);

			accidentVideoUrl = `/uploads/${fileName}`;
			hasAccidentVideo = true;
		}

		const currentDate = new Date().toISOString();
		const cctv = await prisma.cCTV.create({
			data: {
				name,
				rtspUrl,
				latitude,
				longitude,
				status,
				sector,
				roadSegment,
				landmark,
				accidentVideoUrl,
				hasAccidentVideo,
			},
		});

		return NextResponse.json(
			{
				...cctv,
				createdAt: cctv.createdAt.toISOString(),
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error creating CCTV:', error);
		return NextResponse.json(
			{ error: 'Internal server error', details: (error as Error).message },
			{ status: 500 }
		);
	}
}

export async function GET() {
	try {
		console.log('[API CCTVs GET] Fetching CCTVs from DB...');
		const cctvs = await prisma.cCTV.findMany({
			orderBy: { createdAt: 'desc' },
			include: {
				incidents: {
					where: {
						verificationStatus: 'PENDING'
					},
					take: 1
				}
			}
		});

		const formattedCctvs = cctvs.map(cctv => ({
			...cctv,
			hasActiveAlert: cctv.incidents.length > 0,
			activeIncidentId: cctv.incidents.length > 0 ? cctv.incidents[0].id : null,
			createdAt: cctv.createdAt.toISOString(),
		}));

		console.log(`[API CCTVs GET] Formatted ${formattedCctvs.length} CCTVs`);
		return NextResponse.json(formattedCctvs);
	} catch (error) {
		console.error('Error fetching CCTVs:', error);
		return NextResponse.json({ error: error }, { status: 500 });
	}
}
