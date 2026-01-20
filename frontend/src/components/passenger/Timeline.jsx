import React from 'react';
import { cn } from '@/lib/utils';

const Timeline = ({ events, language = 'en' }) => {
    const translations = {
        en: { scheduled: "Scheduled", delayed: "Delayed", cancelled: "Cancelled", updated: "Updated" },
        hi: { scheduled: "निर्धारित", delayed: "विलंबित", cancelled: "रद्द", updated: "अद्यतन" },
        ta: { scheduled: "திட்டமிடப்பட்டது", delayed: "தாமதமானது", cancelled: "ரத்து செய்யப்பட்டது", updated: "புதுப்பிக்கப்பட்டது" },
        bn: { scheduled: "নির্ধারিত", delayed: "বিলম্বিত", cancelled: "বাতিল", updated: "আপডেট" }
    };

    const t = translations[language] || translations.en;

    return (
        <div className="relative border-l-2 border-dashed border-muted-foreground/30 ml-4 my-6">
            {events.map((event, index) => (
                <div key={index} className="mb-8 ml-6 relative">
                    <span className={cn(
                        "absolute -left-[31px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-background",
                        event.status === 'CRITICAL' ? 'bg-destructive' :
                            event.status === 'DONE' ? 'bg-green-500' : 'bg-muted-foreground'
                    )}>
                    </span>
                    <div className="bg-muted/30 p-4 rounded-lg border border-border">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="text-sm font-bold text-foreground">{event.title}</h3>
                            <span className="text-xs font-mono text-muted-foreground">{event.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Timeline;
