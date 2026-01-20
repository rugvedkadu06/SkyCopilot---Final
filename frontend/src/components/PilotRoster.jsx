import React from 'react';

const PilotRoster = ({ pilots }) => {
    return (
        <div className="bg-bg-panel border border-surface-border rounded-xl p-6 h-full flex flex-col min-h-0 overflow-hidden text-gray-800">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-200">
                    Crew Directory
                </h2>
                <div className="text-xs font-mono text-gray-500">LIVE CREW STATUS</div>
            </div>

            {/* Crew Directory Table */}
            <div className="flex-1 overflow-auto min-h-0 scrollbar-thin">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-xs text-gray-500 font-mono tracking-wider border-b border-surface-border sticky top-0 bg-bg-panel z-10">
                            <th className="p-3">PILOT ID</th>
                            <th className="p-3">NAME & RANK</th>
                            <th className="p-3">STATUS</th>
                            <th className="p-3">CERTIFICATIONS</th>
                            <th className="p-3">AGE / EXP</th>
                            <th className="p-3 text-right">FATIGUE RISK</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-gray-300">
                        {pilots.map(p => (
                            <tr key={p._id || p.Pilot_ID} className="border-b border-surface-border/50 hover:bg-surface/20 transition-colors">
                                <td className="p-3 font-mono text-gray-400">{p.Pilot_ID}</td>
                                <td className="p-3">
                                    <div className="font-bold text-gray-200">{p.Pilot_Name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">{p.Rank}</div>
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${p.Pilot_Status === 'AVAILABLE' ? 'bg-status-success/20 text-status-success' :
                                        p.Pilot_Status === 'SICK' ? 'bg-status-danger/20 text-status-danger' :
                                            'bg-accent/20 text-accent'
                                        }`}>
                                        {p.Pilot_Status}
                                    </span>
                                </td>
                                <td className="p-3 font-mono text-xs text-gray-400">
                                    {p.Certification || "N/A"}
                                </td>
                                <td className="p-3 text-gray-400">
                                    {p.Age} yrs <span className="text-gray-600">|</span> {p.Experience_Years} yrs exp
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={p.Fatigue_Risk_Score > 10 ? "text-status-danger" : "text-status-success"}>{p.Fatigue_Risk_Score}%</span>
                                        <div className="w-16 h-1 bg-surface-border rounded-full overflow-hidden">
                                            <div className={`h-full ${p.Fatigue_Risk_Score > 10 ? "bg-status-danger" : "bg-status-success"}`} style={{ width: `${p.Fatigue_Risk_Score}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {pilots.length === 0 && (
                    <div className="text-center py-20 text-gray-500 font-mono">NO PILOT DATA AVAILABLE</div>
                )}
            </div>
        </div>
    );
};

export default PilotRoster;
