import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma';

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;

		const post = await prisma.trafficAidPost.findUnique({
			where: { id },
		});

		if (!post) {
			return NextResponse.json({ error: 'Post not found' }, { status: 404 });
		}

		return NextResponse.json({
			...post,
			id: post.id.toString(),
			createdAt: post.createdAt.toISOString(),
			updatedAt: post.updatedAt.toISOString(),
		});
	} catch (error) {
		console.error('Error fetching traffic aid post:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch traffic aid post' },
			{ status: 500 }
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;

		const data = await request.json();

		const {
			name,
			address,
			latitude,
			longitude,
			contactNumber,
			hasPoliceService,
			hasAmbulance,
			hasFireService,
			operatingHours,
			status,
			additionalInfo,
		} = data;

		if (
			!name ||
			!address ||
			latitude === undefined ||
			longitude === undefined ||
			!contactNumber
		) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		const post = await prisma.trafficAidPost.update({
			where: { id },
			data: {
				name,
				address,
				latitude,
				longitude,
				contactNumber,
				hasPoliceService: Boolean(hasPoliceService),
				hasAmbulance: Boolean(hasAmbulance),
				hasFireService: Boolean(hasFireService),
				operatingHours,
				status,
				additionalInfo,
			},
		});

		return NextResponse.json({
			...post,
			id: post.id.toString(),
			createdAt: post.createdAt.toISOString(),
			updatedAt: post.updatedAt.toISOString(),
		});
	} catch (error) {
		console.error('Error updating traffic aid post:', error);
		return NextResponse.json(
			{ error: 'Failed to update traffic aid post' },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;

		await prisma.trafficAidPost.delete({
			where: { id },
		});

		return NextResponse.json({ message: 'Post deleted successfully' });
	} catch (error) {
		console.error('Error deleting traffic aid post:', error);
		return NextResponse.json(
			{ error: 'Failed to delete traffic aid post' },
			{ status: 500 }
		);
	}
}
