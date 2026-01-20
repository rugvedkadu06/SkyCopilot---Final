import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const RebookingOptions = ({ options, onSelect }) => {
    return (
        <div className="space-y-3">
            {options.map((opt) => (
                <Button
                    key={opt.id}
                    variant="outline"
                    onClick={() => onSelect(opt)}
                    className="w-full h-auto flex-col items-start gap-1 p-4 border-border hover:border-primary hover:bg-muted/50"
                >
                    <div className="flex justify-between items-center w-full mb-1">
                        <span className="font-bold text-foreground text-sm">{opt.time}</span>
                        <span className="text-xs font-mono text-primary">{opt.flightNo}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between w-full">
                        <span>{opt.carrier}</span>
                        <span>{opt.seats} seats left</span>
                    </div>
                </Button>
            ))}
        </div>
    );
};

export default RebookingOptions;
