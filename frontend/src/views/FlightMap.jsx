import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Plane, AlertTriangle } from 'lucide-react';

// Fix for default marker icon missing in CRA/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Airport Coordinates (Mock Data)
const AIRPORTS = {
    "DEL": [28.5562, 77.1000],
    "BOM": [19.0902, 72.8628],
    "BLR": [13.1986, 77.7066],
    "MAA": [12.9941, 80.1709],
    "CCU": [22.6548, 88.4467],
    "DXB": [25.2532, 55.3657],
    "JFK": [40.6413, -73.7781],
    "LHR": [51.4700, -0.4543],
    "SIN": [1.3644, 103.9915],
    "FRA": [50.0379, 8.5622],
    "HND": [35.5494, 139.7798]
};

// Custom Plane Icon
const planeIcon = new L.DivIcon({
    className: 'custom-plane-icon',
    html: '<div style="background:transparent; color: #2563eb;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plane"><path d="M2 12h20"/><path d="M13 2l9 10-9 10"/><path d="M7 6l4 6-4 6"/></svg></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const FlightMap = ({ flights, onFlightClick }) => {
    // Center roughly on India/Middle East for best initial view
    const position = [25.0, 75.0];

    return (
        <div className="h-[calc(100vh-140px)] w-full rounded-xl overflow-hidden border border-border shadow-xl">
            <MapContainer center={position} zoom={4} style={{ height: '100%', width: '100%' }}>
                {/* Dark Mode-ish Tiles */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Plot Airports */}
                {Object.entries(AIRPORTS).map(([code, coords]) => (
                    <Marker key={code} position={coords}>
                        <Popup>
                            <strong>{code}</strong><br />Hub Airport
                        </Popup>
                        <Tooltip direction="bottom" offset={[0, 10]} opacity={1} permanent className='bg-background text-foreground border-border'>
                            {code}
                        </Tooltip>
                    </Marker>
                ))}

                {/* Plot Flights */}
                {flights.map(flight => {
                    const start = AIRPORTS[flight.origin];
                    const end = AIRPORTS[flight.destination];

                    if (!start || !end) return null;

                    const isIssue = flight.status === 'DELAYED' || flight.status === 'CRITICAL' || flight.status === 'CANCELLED';
                    const color = isIssue ? '#ef4444' : '#22c55e'; // Red if issue, Green if good

                    // Calculate midpoint for "Plane" position (static for now)
                    const midLat = (start[0] + end[0]) / 2;
                    const midLng = (start[1] + end[1]) / 2;

                    return (
                        <React.Fragment key={flight._id}>
                            {/* Flight Path */}
                            <Polyline
                                positions={[start, end]}
                                pathOptions={{
                                    color: color,
                                    weight: isIssue ? 3 : 2,
                                    opacity: 0.6,
                                    dashArray: isIssue ? '5, 10' : null
                                }}
                                eventHandlers={{
                                    click: () => onFlightClick(flight)
                                }}
                            />

                            {/* Plane Marker at Midpoint */}
                            <Marker
                                position={[midLat, midLng]}
                                icon={planeIcon}
                                eventHandlers={{
                                    click: () => onFlightClick(flight)
                                }}
                            >
                                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                                    <div className="font-bold">{flight.flightNumber}</div>
                                    <div className="text-xs">{flight.status}</div>
                                </Tooltip>
                            </Marker>
                        </React.Fragment>
                    );
                })}

            </MapContainer>
        </div>
    );
};

export default FlightMap;
