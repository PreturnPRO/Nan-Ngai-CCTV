'use client';

import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet's default marker images don't resolve under bundlers; point them at a CDN.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
	iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
	iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface AidPost {
	latitude: number;
	longitude: number;
	name: string;
}

interface IncidentMapProps {
	latitude: number;
	longitude: number;
	aidPost?: AidPost | null;
	zoom?: number;
}

// Read-only map: a marker at the incident location plus an optional highlighted
// nearest aid post.
export default function IncidentMap({
	latitude,
	longitude,
	aidPost,
	zoom = 14,
}: IncidentMapProps) {
	return (
		<MapContainer
			center={[latitude, longitude]}
			zoom={zoom}
			scrollWheelZoom={false}
			className="h-full w-full"
		>
			<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
			<Marker position={[latitude, longitude]}>
				<Tooltip>Incident location</Tooltip>
			</Marker>
			{aidPost && (
				<CircleMarker
					center={[aidPost.latitude, aidPost.longitude]}
					radius={9}
					pathOptions={{ color: '#89CEFF', fillColor: '#89CEFF', fillOpacity: 0.7 }}
				>
					<Tooltip>{aidPost.name} (nearest unit)</Tooltip>
				</CircleMarker>
			)}
		</MapContainer>
	);
}
