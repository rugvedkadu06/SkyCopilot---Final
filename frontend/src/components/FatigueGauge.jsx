
import React from 'react';

const FatigueGauge = ({ value, label, subLabel }) => {
    // value might be 0.0 - 1.0 (backend) or 0-100
    // Normalize to 0-100
    let normalizedValue = value;
    if (value <= 1.0) normalizedValue = value * 100;

    normalizedValue = Math.round(normalizedValue);

    const size = 120;
    const strokeWidth = 8;
    const center = size / 2;
    const radius = size / 2 - strokeWidth * 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalizedValue / 100) * circumference;

    let colorClass = 'text-status-success stroke-status-success';
    let glowClass = 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'; // Green glow

    if (normalizedValue > 60) {
        colorClass = 'text-status-warning stroke-status-warning';
        glowClass = 'drop-shadow-[0_0_8px_rgba(247,197,173,0.5)]'; // Amber glow
    }
    if (normalizedValue > 80) {
        colorClass = 'text-status-danger stroke-status-danger';
        glowClass = 'drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'; // Red glow
    }

    return (
        <div className="flex flex-col items-center bg-bg-panel/50 p-4 rounded-xl border border-surface-border">
            <div className="relative flex items-center justify-center">
                {/* Gauge */}
                <svg width={size} height={size} className="transform -rotate-90">
                    {/* Track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-surface-border"
                    />
                    {/* Indicator */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="transparent"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className={`${colorClass} ${glowClass} transition-all duration-1000 ease-out`}
                    />
                </svg>

                {/* Center Text */}
                <div className="absolute flex flex-col items-center">
                    <span className={`text-2xl font-bold ${colorClass.split(' ')[0]}`}>
                        {normalizedValue}%
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">RISK</span>
                </div>
            </div>

            {/* Label */}
            <div className="mt-3 text-center">
                <div className="text-xs font-bold text-gray-200 truncate max-w-[120px]" title={label}>{label}</div>
                <div className="text-[10px] text-accent font-mono">{subLabel}</div>
            </div>
        </div>
    );
};

export default FatigueGauge;
