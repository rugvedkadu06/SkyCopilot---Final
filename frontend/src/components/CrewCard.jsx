import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, AlertTriangle } from 'lucide-react';

const CrewCard = ({ pilot, onClick }) => {
    // Determine status badge
    let statusVariant = "default"; // green/default
    let statusText = "AVAILABLE";

    if (pilot.fatigue_score > 0.7) {
        statusVariant = "destructive";
        statusText = "FATIGUED";
    } else if (pilot.status === 'SICK') {
        statusVariant = "destructive";
        statusText = "SICK";
    } else if (pilot.currentDutyMinutes > 200) {
        statusVariant = "secondary"; // yellow/warning-ish usually
        statusText = "ON DUTY";
    }

    const weeklyHours = (pilot.weekly_flight_minutes / 60).toFixed(1);
    const isOvertime = pilot.weekly_flight_minutes > 2400; // >40h

    return (
        <Card
            className="group cursor-pointer hover:bg-card/80 transition-all hover:border-primary/50 border-border bg-card"
            onClick={() => onClick(pilot)}
        >
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                            {pilot.name || pilot._id}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground font-mono mt-1">BASE: {pilot.base}</div>
                    </div>
                    <Badge variant={statusVariant} className={statusVariant === 'destructive' ? 'animate-pulse' : ''}>
                        {statusText}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {/* Fatigue Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] uppercase text-muted-foreground font-bold">
                            <span>Fatigue Risk</span>
                            <span className={pilot.fatigue_score > 0.7 ? "text-destructive" : "text-green-500"}>
                                {(pilot.fatigue_score * 100).toFixed(0)}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className={`h-full ${pilot.fatigue_score > 0.7 ? 'bg-destructive' : 'bg-green-500'}`}
                                style={{ width: `${pilot.fatigue_score * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-secondary/30 p-2 rounded flex items-center gap-2">
                            <Clock className="w-3 h-3 text-primary" />
                            <div>
                                <div className="font-bold text-foreground">{pilot.currentDutyMinutes}m</div>
                                <div className="text-[9px] text-muted-foreground leading-none">DUTY TODAY</div>
                            </div>
                        </div>
                        <div className="bg-secondary/30 p-2 rounded flex items-center gap-2">
                            <Users className="w-3 h-3 text-primary" />
                            <div>
                                <div className={`font-bold ${isOvertime ? 'text-orange-500' : 'text-foreground'}`}>
                                    {weeklyHours}h
                                </div>
                                <div className="text-[9px] text-muted-foreground leading-none">WEEKLY</div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default CrewCard;
