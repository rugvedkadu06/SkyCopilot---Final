import React from 'react';

export default function HealthBanner({ status }) {
    const isCrisis = status === 'INFEASIBLE' || status === 'CRISIS';

    return (
        <div className={`w-full p-6 text-center text-white font-bold text-2xl tracking-widest uppercase transition-colors duration-500 ${isCrisis ? 'bg-red-600 animate-pulse' : 'bg-green-600'}`}>
            {isCrisis ? '⚠️ SYSTEM FAILURE: CRISIS MODE DETECTED ⚠️' : '✅ AERO-RESILIENCE: SYSTEM OPTIMAL'}
        </div>
    );
}
