'use client';

import { MapContainer, TileLayer, Marker, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
	iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
	iconRetinaUrl:
		'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface MapComponentProps {
	onLocationSelect?: (latlng: { lat: number; lng: number }) => void;
	marker?: { latitude: number; longitude: number } | null;
	heatspots?: { latitude: number; longitude: number; intensity: number }[];
	interactive?: boolean;
	initialZoom?: number;
}

const LocationMarker = ({ onLocationSelect }: { onLocationSelect?: (latlng: { lat: number; lng: number }) => void }) => {
	useMapEvents({
		click(e) {
			onLocationSelect?.(e.latlng);
		},
	});
	return null;
};
const MapComponent: React.FC<MapComponentProps> = ({
	onLocationSelect,
	marker,
	heatspots,
	interactive,
	initialZoom,
}) => {

	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return <div className="h-full w-full bg-slate-800 animate-pulse rounded" />;
	}

    const centerPos: [number, number] = marker ? [marker.latitude, marker.longitude] : (heatspots && heatspots.length > 0 ? [heatspots[0].latitude, heatspots[0].longitude] : [13.736717, 100.523186]);

	return (
		<MapContainer 
			center={centerPos} 
			zoom={initialZoom || 15} 
			className='h-full w-full relative z-0'
			dragging={interactive !== false}
			zoomControl={interactive !== false}
			scrollWheelZoom={interactive !== false}
			doubleClickZoom={interactive !== false}
			touchZoom={interactive !== false}
		>
			<TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
			{marker && <Marker position={[marker.latitude, marker.longitude]} />}
            {heatspots && heatspots.map((hs, i) => {
                let color = '#89CEFF'; // Low
                let radius = 15;
                if (hs.intensity > 40) { color = '#ef4444'; radius = 40; } // Critical
                else if (hs.intensity > 20) { color = '#f97316'; radius = 30; } // Moderate
                else if (hs.intensity > 10) { color = '#eab308'; radius = 20; } // Elevated
                
                return (
                    <CircleMarker 
                        key={i} 
                        center={[hs.latitude, hs.longitude]} 
                        pathOptions={{ color: color, fillColor: color, fillOpacity: 0.5, stroke: false }} 
                        radius={radius}
                    />
                );
            })}
			<LocationMarker onLocationSelect={onLocationSelect} />
		</MapContainer>
	);
};

export default MapComponent;
