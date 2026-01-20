import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const PassengerOptions = ({ onSelect }) => {
    const options = [
        {
            id: 'WAIT',
            icon: '☕',
            title: "Wait comfortably",
            subtitle: "View lounge & rest areas"
        },
        {
            id: 'REBOOK',
            icon: '🔁',
            title: "Rebook Flight",
            subtitle: "Check next available connections"
        },
        {
            id: 'REFUND',
            icon: '💸',
            title: "Cancel & Refund",
            subtitle: "Process full refund to original source"
        },
        {
            id: 'HOTEL',
            icon: '🛏️',
            title: "Overnight Stay",
            subtitle: "Request hotel voucher entitlement"
        }
    ];

    return (
        <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => (
                <Card
                    key={opt.id}
                    onClick={() => onSelect(opt.id)}
                    className="cursor-pointer hover:bg-muted/50 transition-all hover:scale-[1.02] hover:shadow-md border-primary/10 group"
                >
                    <CardContent className="p-4">
                        <div className="text-2xl mb-2 group-hover:scale-110 transition-transform origin-left">{opt.icon}</div>
                        <div className="font-bold text-foreground text-xs mb-0.5">{opt.title}</div>
                        <div className="text-[10px] text-muted-foreground">{opt.subtitle}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default PassengerOptions;
