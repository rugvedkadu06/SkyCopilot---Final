import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const FlightStatusCard = ({ data, t }) => {
    const isCritical = data.status === 'CRITICAL' || data.status === 'DELAYED' || data.status === 'CANCELLED';
    const variant = isCritical ? 'destructive' : 'default'; // default is usually primary/greenish depending on theme, or 'secondary'

    // Status text mapping
    const statusText = {
        'ON_TIME': 'ON TIME',
        'DELAYED': 'DELAYED',
        'CRITICAL': 'SERIOUS DELAY',
        'CANCELLED': 'CANCELLED',
        'SCHEDULED': 'SCHEDULED'
    };

    return (
        <Card className={`overflow-hidden border-l-4 ${isCritical ? 'border-l-destructive' : 'border-l-primary'}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Badge variant={variant} className="gap-1 pl-1 pr-2">
                            {isCritical ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            {statusText[data.status] || data.status}
                        </Badge>
                        {isCritical && <span className="flex h-2 w-2 rounded-full bg-destructive animate-ping" />}
                    </div>
                    {data.delay_minutes > 0 && (
                        <Badge variant="outline" className="text-orange-500 border-orange-500 font-mono">
                            +{data.delay_minutes} MIN
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.reason_label || "Reason"}</div>
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                        <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                            {data.plain_reason_title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {data.plain_reason_desc}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FlightStatusCard;
