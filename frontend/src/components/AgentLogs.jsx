import React from 'react';

export default function AgentLogs({ logs }) {
    return (
        <div className="p-4 bg-black/40 rounded-xl border border-surface-border backdrop-blur-sm h-full flex flex-col">
            <h3 className="text-xs font-mono text-gray-500 mb-4 tracking-widest flex items-center gap-2 uppercase">
                <span className="text-accent">●</span> Co-Pilot Activity Stream
            </h3>

            <div className="flex-1 overflow-y-auto font-mono text-xs text-gray-400 space-y-2 pr-2 scrollbar-thin">
                {logs.length === 0 && <div className="text-gray-700 italic">No activity recorded yet...</div>}

                {/* Auto-scroll to bottom usually handled by parent or css, but mapping is fine */}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 p-2 rounded hover:bg-white/5 border-l-2 border-transparent hover:border-accent transition-all animate-fadeIn">
                        <span className="text-accent opacity-70">›</span>
                        <span className="leading-relaxed">{log}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
