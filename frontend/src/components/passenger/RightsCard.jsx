import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InfoIcon } from 'lucide-react';

const RightsCard = ({ rights, t }) => {
    return (
        <div className="space-y-3">
            {rights.map((right, index) => (
                <Card key={index} className="overflow-hidden transition-all hover:bg-muted/30">
                    <CardContent className="p-4 flex gap-4 items-start">
                        <div className="text-2xl bg-muted rounded-lg p-2 h-12 w-12 flex items-center justify-center border border-border">
                            {right.icon}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-foreground text-base mb-1">{right.title}</h4>
                            <Badge variant="outline" className="text-warning border-yellow-600/50 bg-yellow-500/10 mb-2">
                                {right.reason}
                            </Badge>

                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                                <div>
                                    <span className="block text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Entitlement</span>
                                    {right.allowance}
                                </div>
                                <div>
                                    <span className="block text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Timing</span>
                                    {right.timing}
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground flex items-center gap-1">
                                <InfoIcon className="w-3 h-3 text-primary" /> {right.claim_process}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default RightsCard;
