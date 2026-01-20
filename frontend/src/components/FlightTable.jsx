
import React from 'react';

export default function FlightTable({ flights, onRowClick }) {
    if (!flights || flights.length === 0) {
        return <div className="p-4 text-center text-gray-500 font-mono text-sm">NO DATA AVAILABLE</div>;
    }

    return (
        <div className="overflow-x-auto h-full scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent">
            <table className="min-w-full text-left text-sm font-mono relative">
                <thead className="sticky top-0 z-10 bg-bg-panel/95 backdrop-blur-md text-gray-500 uppercase text-xs tracking-wider border-b border-surface-border shadow-sm">
                    <tr>
                        <th className="px-6 py-4 font-normal">Flight_ID</th>
                        <th className="px-6 py-4 font-normal">Route</th>
                        <th className="px-6 py-4 font-normal">ETD</th>
                        <th className="px-6 py-4 font-normal">Pilot_Command</th>
                        <th className="px-6 py-4 font-normal">Prediction</th>
                        <th className="px-6 py-4 font-normal text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-gray-300">
                    {flights.map((flight) => {
                        const isUnassigned = flight.status === 'UNASSIGNED';
                        const isCritical = flight.status === 'CRITICAL' || flight.predictedFailure;

                        let rowClass = "cursor-pointer transition-colors duration-150 group ";
                        if (isCritical) rowClass += "bg-status-danger/10 hover:bg-status-danger/20";
                        else if (isUnassigned) rowClass += "bg-status-warning/5 hover:bg-status-warning/10";
                        else rowClass += "hover:bg-surface";

                        // Status Color Logic
                        let statusColor = 'border-gray-500 text-gray-400';
                        if (flight.status === 'ON_TIME' || flight.status === 'SCHEDULED') statusColor = 'border-status-success text-status-success bg-status-success/10';
                        if (flight.status === 'DELAYED') statusColor = 'border-status-warning text-status-warning bg-status-warning/10';
                        if (flight.status === 'DELAYED') statusColor = 'border-status-warning text-status-warning bg-status-warning/10';
                        if (flight.status === 'SWAPPED') statusColor = 'border-purple-500 text-purple-400 bg-purple-500/10';
                        if (flight.status === 'CANCELLED' || flight.status === 'CRITICAL') statusColor = 'border-status-danger text-status-danger bg-status-danger/10';

                        const etd = flight.scheduledDeparture ? new Date(flight.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                        const route = `${flight.origin} ➔ ${flight.destination}`;

                        return (
                            <tr
                                key={flight._id}
                                onClick={() => onRowClick && onRowClick(flight)}
                                className={rowClass}
                            >
                                <td className="px-6 py-4 font-bold tracking-tight text-accent">{flight.flightNumber || flight.Flight_ID}</td>
                                <td className="px-6 py-4 opacity-80">{route}</td>
                                <td className="px-6 py-4 opacity-70">{etd}</td>
                                <td className="px-6 py-4">
                                    {flight.assignedPilotId ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-status-success shadow-[0_0_5px_#10b981]"></div>
                                            {flight.Pilot_Name || flight.assignedPilotId}
                                            <span className="text-xs opacity-50 ml-1">({flight.assignedPilotId})</span>
                                        </div>
                                    ) : (
                                        <span className="text-status-warning animate-pulse flex items-center gap-2">
                                            <span>⚠</span> UNASSIGNED
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    {flight.predictedFailure ? (
                                        <span className="text-status-danger font-bold flex items-center gap-1 group-hover:scale-105 transition-transform">
                                            ⚠ FAILURE
                                        </span>
                                    ) : (
                                        <span className="text-gray-600">Stable</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`inline-block px-2 py-1 rounded text-[10px] tracking-widest border ${statusColor}`}>
                                            {flight.status}
                                        </span>
                                        {flight.delayMinutes > 0 && (
                                            <span className="text-[10px] text-status-warning">+{flight.delayMinutes}m</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
