import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CrewCard from '@/components/CrewCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const CrewManagement = ({ pilots = [], onRefresh }) => {
    const [selectedPilot, setSelectedPilot] = useState(null);
    const [modifyMinutes, setModifyMinutes] = useState(60);
    const [costData, setCostData] = useState(null);
    const [localPilots, setLocalPilots] = useState([]);

    // Determine effective data source
    const effectivePilots = pilots.length > 0 ? pilots : localPilots;

    useEffect(() => {
        if (pilots.length === 0) fetchData();
    }, [pilots]);

    const fetchData = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/data?page=1&limit=50');
            if (res.data.pilot_readiness) setLocalPilots(res.data.pilot_readiness);
        } catch (err) {
            console.error("Failed to fetch crew data", err);
        }
    };

    const handleRefresh = onRefresh || fetchData;

    const handleAllocateRest = async (pilotId) => {
        if (!confirm("Grant 24h Rest? This will reset all fatigue stats.")) return;
        try {
            await axios.post('http://127.0.0.1:8000/crew/update_rest', { pilot_id: pilotId });
            handleRefresh();
            setSelectedPilot(null);
        } catch (err) {
            alert("Failed to allocate rest");
        }
    };

    const calculateCost = async () => {
        if (!selectedPilot) return;
        try {
            const res = await axios.post('http://127.0.0.1:8000/crew/calculate_cost', {
                pilot_id: selectedPilot._id,
                additional_minutes: parseInt(modifyMinutes)
            });
            setCostData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // Close modal reset
    const handleClose = () => {
        setSelectedPilot(null);
        setCostData(null);
        setModifyMinutes(60);
    };

    return (
        <div className="h-full p-6 overflow-y-auto">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Crew Roster</h2>
                    <p className="text-muted-foreground text-sm">Manage pilot fatigue and schedules.</p>
                </div>
                <div className="flex gap-2 text-xs font-mono text-muted-foreground bg-secondary/20 p-2 rounded border border-border">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> AVAILABLE ({effectivePilots.filter(p => p.fatigue_score <= 0.7 && p.status !== 'SICK').length})</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive"></div> FATIGUED ({effectivePilots.filter(p => p.fatigue_score > 0.7 && p.status !== 'SICK').length})</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div> SICK ({effectivePilots.filter(p => p.status === 'SICK').length})</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                {effectivePilots.map(pilot => (
                    <CrewCard key={pilot._id} pilot={pilot} onClick={setSelectedPilot} />
                ))}
            </div>

            {/* DETAILS MODAL */}
            <Dialog open={!!selectedPilot} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="max-w-2xl bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl">
                            <Users className="w-6 h-6 text-primary" />
                            {selectedPilot?.name}
                            <span className="text-sm font-normal text-muted-foreground font-mono ml-auto border border-border px-2 py-1 rounded">
                                ID: {selectedPilot?._id}
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            Base: {selectedPilot?.base} • Qual: {selectedPilot?.aircraftTypeQualified?.join(", ")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* LEFT: STATUS */}
                        <div className="space-y-4">
                            <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                                <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><ActivityIcon status={selectedPilot} /> Fatigue Status</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Score</span>
                                        <span className={`font-mono font-bold ${(selectedPilot?.fatigue_score || 0) > 0.7 ? 'text-destructive' : 'text-green-500'}`}>
                                            {((selectedPilot?.fatigue_score || 0) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                                        <div
                                            className={`h-full ${(selectedPilot?.fatigue_score || 0) > 0.7 ? 'bg-destructive' : 'bg-green-500'}`}
                                            style={{ width: `${(selectedPilot?.fatigue_score || 0) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-2">
                                        Duty Remaining: <span className="text-foreground font-mono">{selectedPilot?.remainingDutyMinutes}m</span>
                                    </p>
                                </div>
                            </div>

                            <Button variant="destructive" className="w-full" onClick={() => handleAllocateRest(selectedPilot._id)}>
                                Grant Mandatory Rest (24h)
                            </Button>
                        </div>

                        {/* RIGHT: CALCULATOR */}
                        <div className="space-y-4 border-l border-border pl-6">
                            <h4 className="text-sm font-bold">Cost Impact Calculator</h4>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={modifyMinutes}
                                    onChange={(e) => setModifyMinutes(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <Button onClick={calculateCost}>Calc</Button>
                            </div>

                            {costData && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-secondary/20 p-3 rounded text-sm space-y-1">
                                        <div className="flex justify-between font-bold">
                                            <span>Total Cost</span>
                                            <span className="text-accent">₹{costData.cost.toLocaleString()}</span>
                                        </div>
                                        {costData.is_overtime && <div className="text-xs text-orange-500">⚠️ Overtime Applied</div>}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="text-xs font-bold text-muted-foreground">Compliance Checks</div>
                                        <ComplianceRow label="Rest" value={costData.compliance.rest_48h} />
                                        <ComplianceRow label="Night" value={costData.compliance.night_flights} warning={costData.compliance.night_flights.includes('CAUTION')} />
                                        <ComplianceRow label="Duty" value={costData.compliance.recent_duty} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const ComplianceRow = ({ label, value, warning }) => (
    <div className="flex justify-between text-[10px] items-center border-b border-border/50 pb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono ${warning ? 'text-orange-500' : 'text-green-500'}`}>{value}</span>
    </div>
);

const ActivityIcon = ({ status }) => {
    if (status?.status === 'SICK') return <AlertCircle className="w-4 h-4 text-destructive" />;
    if ((status?.fatigue_score || 0) > 0.7) return <AlertTriangle className="w-4 h-4 text-destructive" />;
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
}

export default CrewManagement;
