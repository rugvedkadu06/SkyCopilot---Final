import React from 'react';

export default function FlightDetailModal({ flight, onClose }) {
    if (!flight) return null;

    // Pilot is now embedded in flight object
    const hasPilot = flight.Name && flight.Name !== "UNASSIGNED";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-bg-panel border border-surface-border rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-surface-border bg-gradient-to-r from-surface to-transparent">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-accent">✈</span>
                        {flight.Flight_ID}
                    </h2>
                    <div className="text-xs font-mono text-gray-500 mt-1 uppercase tracking-widest">Flight Manifest & Crew</div>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">✕</button>
                </div>
                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Route Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/30 p-3 rounded border border-surface-border">
                            <div className="text-[10px] text-gray-500 uppercase font-mono">Route</div>
                            <div className="text-sm font-bold text-white">{flight.Route}</div>
                        </div>
                        <div className="bg-black/30 p-3 rounded border border-surface-border">
                            <div className="text-[10px] text-gray-500 uppercase font-mono">Times</div>
                            <div className="text-xs text-gray-400">
                                DEP: {new Date(flight.Departure_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs text-gray-400">
                                ARR: {new Date(flight.Arrival_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                    {/* Crew Info */}
                    <div>
                        <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2 border-b border-surface-border pb-1">Cockpit Crew</div>
                        {hasPilot ? (
                            <div className="flex flex-col gap-3 bg-surface p-4 rounded border border-surface-border">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${flight.Fatigue_Score > 80 ? 'border-status-danger text-status-danger' : 'border-accent text-accent'}`}>
                                        {flight.Fatigue_Score}%
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{flight.Name}</div>
                                        <div className="text-xs text-gray-400 font-mono">{flight.Rank} | {flight.Pilot_ID}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-white/5">
                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase">Cert</div>
                                        <div className="text-xs text-gray-300">{flight.Certification}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase">Exp</div>
                                        <div className="text-xs text-gray-300">{flight.Experience_Years} Yrs</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase">Rest</div>
                                        <div className="text-xs text-gray-300">{flight.Rest_Hours} hrs</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase">Last Flt</div>
                                        <div className="text-xs text-gray-300 truncate">
                                            {flight.Last_Flight_Time ? new Date(flight.Last_Flight_Time).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-status-danger/10 border border-status-danger/30 text-status-danger rounded text-center animate-pulse font-mono">
                                ⚠ NO PILOT ASSIGNED
                            </div>
                        )}
                    </div>
                    {/* Status */}
                    <div className="flex justify-between items-center bg-black/50 p-3 rounded">
                        <span className="text-sm text-gray-400">System Status</span>
                        <span className={`px-3 py-1 rounded text-xs font-bold border ${!hasPilot ? 'border-status-danger text-status-danger' : 'border-status-success text-status-success'}`}>
                            {flight.Sys_Status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
