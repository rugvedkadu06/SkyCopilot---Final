import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import {
    Activity, TrendingUp, TrendingDown, Users, AlertTriangle, CloudRain, DollarSign, Zap, Download, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const API_URL = 'http://localhost:8000';

const AnalyticsDashboard = () => {
    const [overview, setOverview] = useState(null);
    const [fatigueTrends, setFatigueTrends] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    const handleDownloadReport = async () => {
        setDownloading(true);
        try {
            const response = await axios.get(`${API_URL}/analytics/ai_report`);
            const markdown = response.data.report_markdown;

            if (!markdown) {
                alert("Report generation failed or returned empty.");
                setDownloading(false);
                return;
            }

            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Executive_Briefing_${new Date().toISOString().split('T')[0]}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed", error);
            alert("Failed to download report. Check API connection.");
        }
        setDownloading(false);
    };

    const fetchAnalytics = async () => {
        try {
            const [ovRes, ftRes, pdRes] = await Promise.all([
                axios.get(`${API_URL}/analytics/overview`),
                axios.get(`${API_URL}/analytics/fatigue_trends`),
                axios.get(`${API_URL}/analytics/predictions`)
            ]);

            setOverview(ovRes.data);
            setFatigueTrends(ftRes.data);
            setPredictions(pdRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Analytics Fetch Error", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 5000); // Live updates
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Analytics Engine...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Analytics Command Center</h2>
                    <p className="text-muted-foreground">Real-time operational intelligence and predictive modeling.</p>
                </div>
                <Button
                    onClick={handleDownloadReport}
                    disabled={downloading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    {downloading ? (
                        <Activity className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="mr-2 h-4 w-4" />
                    )}
                    {downloading ? 'Generating Analysis...' : 'Download Executive Briefing'}
                </Button>
            </div>

            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-card to-secondary/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                            On-Time Performance <Activity className="w-4 h-4 text-primary" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{overview?.otp}%</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-red-400" /> -2.1% vs last week
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                            Est. Savings (Daily) <DollarSign className="w-4 h-4 text-green-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-500">${overview?.financials?.projected_savings?.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Efficiency Score: <span className="font-mono text-primary">{overview?.financials?.efficiency_score}/100</span>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                            High Risk Crew <Users className="w-4 h-4 text-orange-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-500">{overview?.high_risk_crew}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Pilots with fatigue {'>'} 0.7
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                            Predicted Disruptions <CloudRain className="w-4 h-4 text-blue-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-500">{predictions.filter(p => p.probability > 50).length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Events with {'>'} 50% probability
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">

                {/* LEFT: FATIGUE CHART */}
                <div className="lg:col-span-4">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Crew Fatigue Projections (7 Days)</CardTitle>
                            <CardDescription>AI-modeled fatigue accumulation for high-risk pilots.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                        <XAxis dataKey="day" allowDuplicatedCategory={false} />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                                        />
                                        <Legend />
                                        {fatigueTrends.map((pilot, index) => (
                                            <Line
                                                key={pilot.name}
                                                data={pilot.data}
                                                type="monotone"
                                                dataKey="score"
                                                name={pilot.name}
                                                stroke={`hsl(${index * 60}, 70%, 50%)`}
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: PREDICTIVE RADAR */}
                <div className="lg:col-span-3">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>Global Disruption Radar</CardTitle>
                            <CardDescription>Top predicted risks by location.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto pr-2">
                            <div className="space-y-3">
                                {predictions.map((pred, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-secondary/50 transition-colors">
                                        <div className={`p-2 rounded-md ${pred.impact === 'HIGH' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                            {pred.impact === 'HIGH' ? <AlertTriangle className="w-5 h-5" /> : <CloudRain className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-sm">{pred.location} - {pred.type}</h4>
                                                <Badge variant={pred.probability > 80 ? "destructive" : "outline"}>{pred.probability}% Prob.</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 mb-2">
                                                {pred.details}
                                            </p>
                                            <div className="text-xs font-mono bg-background p-1.5 rounded border border-border/50 text-primary">
                                                Rec. Action: {pred.recommendation}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* SUSTAINABILITY ROW */}
            <Card className="bg-gradient-to-r from-emerald-950/20 to-teal-950/20 border-emerald-500/20">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-emerald-500 mb-1">Industry 5.0 Sustainability Impact</h3>
                        <p className="text-muted-foreground text-sm">Real-time CO2 savings driven by AI optimization and flight straightening.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-emerald-400">1,245 kg</div>
                        <div className="text-xs text-emerald-600 font-bold uppercase tracking-widest">CO2 Saved Today</div>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
};

export default AnalyticsDashboard;
