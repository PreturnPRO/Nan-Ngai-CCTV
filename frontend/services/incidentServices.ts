import { prisma } from '@/prisma';
import {
	IncidentSeverity,
	IncidentType,
	VerificationStatus,
	Prisma,
} from '@prisma/client';

export async function createIncidentFromDetection(data: {
	cctvId: string;
	confidenceScore: number;
	imageUrl?: string;
	thumbnailUrl?: string;
	location?: string;
	latitude?: number;
	longitude?: number;
	detectionMetadata?: Prisma.InputJsonValue;
}) {
	const incident = await prisma.incident.create({
		data: {
			cctvId: data.cctvId,
			confidenceScore: data.confidenceScore,
			imageUrl: data.imageUrl,
			thumbnailUrl: data.thumbnailUrl,
			location: data.location,
			latitude: data.latitude,
			longitude: data.longitude,
			verificationStatus: VerificationStatus.PENDING,
			detectionMetadata: data.detectionMetadata,
		},
		include: {
			cctv: true,
		},
	});

	// Automatically create PENDING history log
	await prisma.incidentHistory.create({
		data: {
			incidentId: incident.id,
			status: 'PENDING',
			notes: `Incident detected by AI model with ${Math.round(data.confidenceScore * 100)}% confidence`,
		},
	});

	return incident;
}

export async function getIncidents(filter?: {
	verificationStatus?: VerificationStatus;
	limit?: number;
	offset?: number;
}) {
	return await prisma.incident.findMany({
		where: {
			verificationStatus: filter?.verificationStatus,
		},
		include: {
			cctv: true,
			verifiedByUser: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
				},
			},
		},
		orderBy: {
			detectedAt: 'desc',
		},
		take: filter?.limit || 50,
		skip: filter?.offset || 0,
	});
}

export async function getPendingIncidents(limit?: number) {
	return await prisma.incident.findMany({
		where: {
			verificationStatus: VerificationStatus.PENDING,
		},
		include: {
			cctv: true,
		},
		orderBy: {
			detectedAt: 'desc',
		},
		take: limit || 50,
	});
}

export async function getIncidentById(id: string) {
	return await prisma.incident.findUnique({
		where: { id },
		include: {
			cctv: true,
			verifiedByUser: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
				},
			},
			resolvedByUser: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
				},
			},
			// Temporal Analysis timeline (Page 2) — ordered oldest-first.
			history: {
				orderBy: { createdAt: 'asc' },
			},
			notifications: {
				orderBy: { sentAt: 'asc' },
			},
		},
	});
}

export async function verifyIncident(
	id: string,
	data: {
		verificationStatus: VerificationStatus;
		verifiedBy: string;
		incidentType?: IncidentType;
		severity?: IncidentSeverity;
		notes?: string;
		responseNeeded: boolean;
	}
) {
	const updatedIncident = await prisma.incident.update({
		where: { id },
		data: {
			verificationStatus: data.verificationStatus,
			verifiedBy: data.verifiedBy,
			verifiedAt: new Date(),
			incidentType: data.incidentType,
			severity: data.severity,
			notes: data.notes,
			responseNeeded: data.responseNeeded,
		},
		include: {
			cctv: true,
			verifiedByUser: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
				},
			},
		},
	});

	// Create verification history log
	await prisma.incidentHistory.create({
		data: {
			incidentId: id,
			status: data.verificationStatus,
			changedBy: data.verifiedBy,
			notes: data.notes || `Incident verified by user. Response needed: ${data.responseNeeded}`,
		},
	});

	// If response is needed, log the alert dispatch
	if (data.responseNeeded) {
		await prisma.notificationLog.create({
			data: {
				incidentId: id,
				channel: 'CRS_API',
				recipient: 'http://crs-agency.gov/api/v1/alerts',
				status: 'SUCCESS',
				sentAt: new Date(),
			},
		});
	}

	return updatedIncident;
}

export async function initiateResponse(id: string, userId: string) {
	const updatedIncident = await prisma.incident.update({
		where: { id },
		data: {
			responseInitiated: true,
		},
	});

	// Create dispatch history log
	await prisma.incidentHistory.create({
		data: {
			incidentId: id,
			status: 'DISPATCHED',
			changedBy: userId,
			notes: 'Emergency response team dispatched.',
		},
	});

	return updatedIncident;
}

export async function resolveIncident(
	id: string,
	userId: string,
	notes?: string
) {
	const updatedIncident = await prisma.incident.update({
		where: { id },
		data: {
			resolvedAt: new Date(),
			resolvedBy: userId,
			notes: notes
				? `${notes}\n\nResolved on ${new Date().toLocaleString()}`
				: undefined,
		},
	});

	// Create resolution history log
	await prisma.incidentHistory.create({
		data: {
			incidentId: id,
			status: 'RESOLVED',
			changedBy: userId,
			notes: notes || 'Incident marked as resolved.',
		},
	});

	return updatedIncident;
}
