// Geo utilities for distance + ETA between coordinates.

const EARTH_RADIUS_KM = 6371;

// Average emergency-vehicle road speed used for ETA estimation (km/h).
const AVG_RESPONSE_SPEED_KMH = 60;

/** Great-circle distance between two lat/lng points, in kilometres. */
export function haversineKm(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Rough ETA in minutes for the given road distance, rounded up. */
export function etaMinutes(distanceKm: number): number {
	return Math.ceil((distanceKm / AVG_RESPONSE_SPEED_KMH) * 60);
}
