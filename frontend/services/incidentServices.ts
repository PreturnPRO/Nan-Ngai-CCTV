import { prisma } from '@/prisma';
import {
	IncidentSeverity,
	IncidentType,
	VerificationStatus,
	Prisma,
} from '@prisma/client';
import { sendLineMessages, type LineMessage } from '@/lib/line';
import { haversineKm, etaMinutes } from '@/lib/geo';

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

// Notify the LINE Official Account that a verified accident needs response,
// including the nearest active aid post. Records the outcome in
// NotificationLog and never throws — a failed alert must not roll back the
// verification that triggered it.
async function dispatchLineAlert(incident: {
	id: string;
	location: string | null;
	latitude: number | null;
	longitude: number | null;
	confidenceScore: number;
	detectedAt: Date;
	incidentType: IncidentType | null;
	severity: IncidentSeverity | null;
	imageUrl: string | null;
	cctv: { name: string; latitude: number; longitude: number; landmark: string | null };
}) {
	try {
		const lat = incident.latitude ?? incident.cctv.latitude;
		const lng = incident.longitude ?? incident.cctv.longitude;

		let nearestLine = 'N/A';
		if (lat != null && lng != null) {
			const posts = await prisma.trafficAidPost.findMany({
				where: { status: 'active' },
			});
			const ranked = posts
				.map(p => ({ p, dKm: haversineKm(lat, lng, p.latitude, p.longitude) }))
				.sort((a, b) => a.dKm - b.dKm);
			if (ranked.length) {
				const n = ranked[0];
				nearestLine = `${n.p.name} (${n.dKm.toFixed(1)}กม - ${etaMinutes(n.dKm)}นาที) ${n.p.contactNumber}`;
			}
		}

		const mapLink =
			lat != null && lng != null
				? `https://www.google.com/maps?q=${lat},${lng}`
				: 'N/A';

		const when = incident.detectedAt.toLocaleString('th-TH', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		});

		// The backend may store location as the literal "Unknown location";
		// fall back to the camera name (+ landmark) in that case.
		const hasLocation =
			incident.location && incident.location !== 'Unknown location';
		const locationText = hasLocation
			? incident.location
			: [incident.cctv.name, incident.cctv.landmark].filter(Boolean).join(' - ');

		const text = [
			'🚨 แจ้งเตือนอุบัติเหตุ',
			`เวลาเกิดเหตุ: ${when} น.`,
			`สถานที่: ${locationText}`,
			`สถานที่ใกล้เคียง: ${nearestLine}`,
			`แผนที่: ${mapLink}`,
		].join('\n');

		const messages: LineMessage[] = [{ type: 'text', text }];

		// Attach the accident snapshot. LINE requires a public HTTPS URL. If the
		// backend uploaded to Cloudinary, imageUrl is already a full https URL;
		// otherwise prefix the stored relative path with APP_BASE_URL.
		let imgUrl: string | null = null;
		if (incident.imageUrl?.startsWith('https://')) {
			imgUrl = incident.imageUrl;
		} else if (incident.imageUrl) {
			const baseUrl = process.env.APP_BASE_URL;
			if (baseUrl?.startsWith('https://')) {
				imgUrl = `${baseUrl.replace(/\/$/, '')}${incident.imageUrl}`;
			}
		}
		if (imgUrl) {
			messages.push({
				type: 'image',
				originalContentUrl: imgUrl,
				previewImageUrl: imgUrl,
			});
		}

		const result = await sendLineMessages(messages);
		if (!result.ok) {
			console.error('LINE alert not sent:', result.error);
		}

		await prisma.notificationLog.create({
			data: {
				incidentId: incident.id,
				channel: 'LINE',
				recipient: process.env.LINE_TARGET_ID ?? 'broadcast',
				status: result.ok ? 'SUCCESS' : 'FAILED',
				errorMsg: result.ok ? null : result.error,
				sentAt: new Date(),
			},
		});
	} catch (err) {
		console.error('LINE dispatch failed:', err);
	}
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

	// If response is needed, notify the LINE OA with dispatch details.
	if (data.responseNeeded) {
		await dispatchLineAlert(updatedIncident);
	}

	return updatedIncident;
}

export async function initiateResponse(id: string, userId: string) {
	const updatedIncident = await prisma.incident.update({
		where: { id },
		data: {
			responseInitiated: true,
			dispatchedAt: new Date(),
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
