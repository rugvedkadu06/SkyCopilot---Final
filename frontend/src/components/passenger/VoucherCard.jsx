import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const VoucherCard = ({ type, amount, currency, code, expiry }) => {
    const isFood = type === 'FOOD';
    const variant = isFood ? 'orange' : 'purple';
    const icon = isFood ? '🍔' : '🏨';

    // Helper for specific colors since shadcn defaults are limited for this use case
    const colorClasses = isFood
        ? 'bg-orange-500/10 border-orange-500/30 text-orange-500'
        : 'bg-purple-500/10 border-purple-500/30 text-purple-500';

    return (
        <Card className={`border ${colorClasses}`}>
            <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{icon}</span>
                        <div>
                            <div className={`text-xs font-bold tracking-widest ${isFood ? 'text-orange-500' : 'text-purple-500'}`}>{type} VOUCHER</div>
                            <div className="text-foreground font-bold text-lg">{currency} {amount}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">EXPIRY</div>
                        <div className="text-xs text-foreground font-mono">{expiry}</div>
                    </div>
                </div>

                <div className="bg-background/80 rounded border border-border/50 p-3 flex justify-between items-center cursor-pointer hover:bg-background transition-colors group">
                    <div className="font-mono text-sm tracking-widest text-foreground group-hover:text-primary transition-colors">{code}</div>
                    <div className="text-xs text-muted-foreground">TAP TO COPY</div>
                </div>

                <div className="text-[10px] text-muted-foreground leading-tight">
                    Valid at all partner outlets in the terminal. Show QR code (simulated) at counter.
                </div>
            </CardContent>
        </Card>
    );
};

export default VoucherCard;
