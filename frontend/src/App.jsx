import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Plane,
  AlertTriangle,
  Users,
  CheckCircle,
  Wind,
  Cpu,
  Radio,
  Clock,
  RotateCw,
  Zap,
  Leaf,
  Info,
  Activity,
  Mic,
  MicOff
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import FatigueGauge from './components/FatigueGauge';
import FlightTable from './components/FlightTable';
import AgentLogs from './components/AgentLogs';
import FlightDetailModal from './components/FlightDetailModal';
import PassengerBridge from './views/PassengerBridge';
import CrewManagement from './views/CrewManagement';

import AnalyticsDashboard from './views/AnalyticsDashboard';
import FlightMap from './views/FlightMap';

const API_URL = 'http://localhost:8000';

// --- HELPER COMPONENTS ---

const StatusIndicator = ({ status, text }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${status === 'CRITICAL' ? 'bg-destructive animate-pulse' : 'bg-green-500'}`} />
    <span className="text-xs font-medium text-muted-foreground">{text}</span>
  </div>
);

const KPICard = ({ title, value, icon: Icon, trend, colorString }) => (
  <Card className="bg-card border-border">
    <CardContent className="p-6 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
      </div>
      <div className={`p-3 rounded-full bg-opacity-10 ${colorString}`}>
        <Icon className={`w-6 h-6 ${colorString.replace('bg-', 'text-')}`} />
      </div>
    </CardContent>
  </Card>
);

const UnifiedDashboard = () => {
  const [pilots, setPilots] = useState([]);
  const [flights, setFlights] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('VALID');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState('AUTO');
  const [options, setOptions] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  // Sim State
  const [simType, setSimType] = useState('WEATHER');
  const [simSubType, setSimSubType] = useState('Fog');
  const [targetFlight, setTargetFlight] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  // Manual Delay
  const [showDelayInput, setShowDelayInput] = useState(false);
  const [manualDelayMinutes, setManualDelayMinutes] = useState(60);

  const [pendingOption, setPendingOption] = useState(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [voiceFilter, setVoiceFilter] = useState(null); // 'DELAYED', 'CRITICAL', 'ALL' or null
  const [sortType, setSortType] = useState('FLIGHT_NUM'); // 'TIME', 'STATUS', 'FLIGHT_NUM'
  const recognitionRef = React.useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);

    recognition.onend = () => {
      // Auto-restart if it was supposed to be running (Always On mode)
      if (recognitionRef.current && isListening) {
        try { recognition.start(); } catch (e) { setIsListening(false); }
      } else {
        setIsListening(false);
      }
    };

    recognition.onresult = async (event) => {
      const latestIndex = event.results.length - 1;
      const transcript = event.results[latestIndex][0].transcript.trim();
      console.log("Voice Command:", transcript);

      try {
        const res = await axios.post(`${API_URL}/command`, { command: transcript });
        const { action, payload, message } = res.data;

        if (action === 'FILTER') setVoiceFilter(payload);
        else if (action === 'RESET') setVoiceFilter(null);
      } catch (err) { console.error("Command failed", err); }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    }
  }, []); // Init once

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false); // Manually stopped
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) { console.error(e); }
    }
  };

  const fetchData = async () => {
    try {
      const dataRes = await axios.get(`${API_URL}/data?page=${page}&limit=20`);
      setPilots(dataRes.data.pilot_readiness || []);
      setFlights(dataRes.data.flights || []);
      setLogs(dataRes.data.agent_logs || []);

      const statusRes = await axios.get(`${API_URL}/status`);
      setStatus(statusRes.data.status);
    } catch (error) {
      console.error("API Error", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 5000);
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [page]);

  useEffect(() => {
    if (status !== 'VALID') handleHeal();
  }, [status, mode]);

  const handleHeal = async () => {
    const res = await axios.post(`${API_URL}/heal`, { mode });
    if (res.data.status === 'OPTIONS_GENERATED') {
      setOptions(res.data.options);
      setRecommendation(res.data);
      setShowDelayInput(false);
    } else {
      if (mode !== 'MANUAL') {
        setOptions([]);
        setRecommendation(null);
      }
    }
    fetchData();
  };

  const resolveCrisis = async (option) => {
    const optToUse = option || (recommendation ? recommendation.recommended_strategy : null);
    if (!optToUse) return;

    if (optToUse.action_type === 'DELAY_MANUAL') {
      setPendingOption(optToUse);
      setShowDelayInput(true);
      return;
    }
    await axios.post(`${API_URL}/resolve`, { option: optToUse });
    setOptions([]);
    setRecommendation(null);
    fetchData();
  };

  const confirmManualDelay = async () => {
    if (!pendingOption) return;
    const finalOption = {
      ...pendingOption,
      action_type: 'DELAY_APPLY',
      payload: { ...pendingOption.payload, minutes: parseInt(manualDelayMinutes) }
    };
    await axios.post(`${API_URL}/resolve`, { option: finalOption });
    setOptions([]);
    setRecommendation(null);
    setShowDelayInput(false);
    fetchData();
  };

  const runSim = async () => {
    await axios.post(`${API_URL}/simulate`, {
      type: simType,
      subType: simSubType,
      flight_id: targetFlight || null,
      airport: "DEL",
      severity: "HIGH"
    });
  };



  const handleReset = async () => {
    await axios.get(`${API_URL}/seed`);
    fetchData();
  };

  const isCrisis = status !== 'VALID';
  // Apply logic: if voiceFilter is set, use it.
  const displayedFlights = flights.filter(f => {
    if (voiceFilter === 'DELAYED') return f.status === 'DELAYED' || f.status === 'CRITICAL';
    if (voiceFilter === 'CRITICAL') return f.status === 'CRITICAL';
    if (voiceFilter === 'CANCELLED') return f.status === 'CANCELLED';
    if (voiceFilter === 'SWAPPED') return f.status === 'SWAPPED';
    if (voiceFilter === 'ON_TIME') return f.status === 'ON_TIME';
    return true;
  }).sort((a, b) => {
    if (sortType === 'STATUS') {
      const priority = { 'CRITICAL': 0, 'DELAYED': 1, 'WARNING': 2, 'ON_TIME': 3, 'CANCELLED': 4 };
      return (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
    }
    if (sortType === 'FLIGHT_NUM') {
      const numA = a.flightNumber.replace(/\D/g, '');
      const numB = b.flightNumber.replace(/\D/g, '');
      return numA - numB;
    }
    // Default: 'TIME' (using scheduledDeparture or just index implicit)
    // Assuming date objects or strings. API returns ISO strings usually.
    return new Date(a.scheduledDeparture) - new Date(b.scheduledDeparture);
  });

  const activeDisruptions = flights.filter(f => f.status === 'DELAYED' || f.status === 'CANCELLED').length + (isCrisis ? 1 : 0);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center animate-out fade-out duration-1000 delay-[2000ms] fill-mode-forwards pointer-events-none">
          <h1 className="text-4xl font-bold animate-pulse text-primary">SKY<span className="text-foreground">COPILOT</span></h1>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold tracking-tighter">
              SKY<span className="text-primary">COPILOT</span>
            </h1>
            <nav className="hidden md:flex gap-4">
              <Button variant={activeTab === 'DASHBOARD' ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab('DASHBOARD')}>DASHBOARD</Button>
              <Button variant={activeTab === 'CREW' ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab('CREW')}>CREW</Button>
              <Button variant={activeTab === 'ANALYTICS' ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab('ANALYTICS')}>ANALYTICS</Button>
              <Button variant={activeTab === 'MAP' ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab('MAP')}>MAP</Button>
              <Button variant={activeTab === 'SIMULATION' ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab('SIMULATION')}>SIMULATION</Button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/passenger">
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                Passenger Bridge <Users className="w-4 h-4" />
              </Button>
            </Link>




            <Button variant="outline" size="icon" onClick={fetchData} title="Refresh Data">
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReset}>RESET DB</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">

        {activeTab === 'DASHBOARD' && (
          <>
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Active Flights"
                value={flights.length}
                icon={Plane}
                colorString="bg-blue-500 text-blue-500"
              />
              <KPICard
                title="Active Disruptions"
                value={activeDisruptions}
                icon={AlertTriangle}
                colorString={activeDisruptions > 0 ? "bg-red-500 text-red-500" : "bg-gray-500 text-gray-500"}
              />
              <KPICard
                title="Crew Fatigue Alerts"
                value={pilots.filter(p => p.fatigue_score > 0.7).length}
                icon={Users}
                colorString="bg-orange-500 text-orange-500"
              />
              <KPICard
                title="Human Decisions Today"
                value={logs.filter(l => l.includes("MANUAL:") || l.includes("CO-PILOT:")).length}
                icon={CheckCircle}
                colorString="bg-green-500 text-green-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)]">

              {/* Left Column: Flight Status Board */}
              <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
                <Card className="h-full flex flex-col bg-card/50 border-border">
                  <CardHeader className="pb-2 space-y-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plane className="w-4 h-4 text-primary" /> Flight Status Board
                      {isCrisis && <Badge variant="destructive" className="ml-auto animate-pulse">LIVE INCIDENT</Badge>}
                    </CardTitle>
                    <div className="flex gap-2">
                      <select
                        className="bg-background border border-border rounded text-xs p-1 flex-1"
                        value={voiceFilter || ''}
                        onChange={(e) => setVoiceFilter(e.target.value || null)}
                      >
                        <option value="">Filter: All</option>
                        <option value="DELAYED">Delayed</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="ON_TIME">On Time</option>
                      </select>
                      <select
                        className="bg-background border border-border rounded text-xs p-1 flex-1"
                        value={sortType}
                        onChange={(e) => setSortType(e.target.value)}
                      >
                        <option value="TIME">Sort: Time</option>
                        <option value="STATUS">Sort: Priority</option>
                        <option value="FLIGHT_NUM">Sort: Flight #</option>
                      </select>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden p-0">
                    <div className="h-full overflow-y-auto pr-1">
                      {voiceFilter && (
                        <div className="p-2 bg-primary/10 text-xs font-bold text-primary flex justify-between items-center mb-2 rounded">
                          <span>🔍 Active Filter: {voiceFilter}</span>
                          <button onClick={() => setVoiceFilter(null)} className="hover:underline">Clear</button>
                        </div>
                      )}
                      <FlightTable flights={displayedFlights} onRowClick={setSelectedFlight} simpleView={false} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Center Column: AI Recommendations (or default state) */}
              <div className="lg:col-span-8 flex flex-col gap-4">

                {/* Disruption Center Header / Context */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground pb-2 border-b border-border/50">
                  <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Disruption Center</div>
                  <div className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Crew Fatigue</div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 ml-auto">
                    <Zap className="w-3 h-3" /> AI Recommendations {recommendation ? '1' : '0'}
                  </Badge>
                </div>

                {/* Main AI Recommendation Card */}
                <Card className={`flex-1 border-t-4 transition-all ${isCrisis ? 'border-t-destructive shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-t-primary'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isCrisis ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        {isCrisis ? "AI Recommendations Generated" : "System Status: Nominal"}
                        <CardDescription className="mt-1">
                          {isCrisis ?
                            "Analysis complete. 3 options generated for active disruption." :
                            "Monitoring flight operations for anomalies."}
                        </CardDescription>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {isCrisis && recommendation ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        {/* Recommended Strategy Highlight */}
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 relative overflow-hidden">
                          <div className="absolute top-4 right-4 text-4xl font-black text-primary/10 select-none">RECOMMENDED</div>
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <Badge variant="default" className="mb-2">Top Recommendation</Badge>
                                <h3 className="text-xl font-bold">{recommendation.recommended_strategy.title}</h3>
                                <p className="text-muted-foreground">{recommendation.recommended_strategy.description}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-3xl font-bold text-primary">87</span>
                                <div className="text-xs text-muted-foreground">Overall Score</div>
                              </div>
                            </div>

                            {/* Metric Bars */}
                            <div className="grid grid-cols-5 gap-4 mb-6">
                              {['Safety', 'Fatigue', 'Passenger', 'Cost', 'Eco'].map((label, i) => (
                                <div key={label} className="text-center">
                                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mb-1">
                                    <div className="h-full bg-primary" style={{ width: `${[95, 92, 75, 60, 85][i]}%` }}></div>
                                  </div>
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground">{label}</div>
                                </div>
                              ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-border">
                              <div className="flex-1 text-xs text-muted-foreground flex items-center">
                                human_decision_req :: Review and approve
                              </div>
                              <Button variant="destructive" onClick={() => resolveCrisis({ action_type: 'DELAY_MANUAL', payload: { flight_id: recommendation.recommended_strategy.payload.flight_id } })}>Reject</Button>
                              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => resolveCrisis(recommendation.recommended_strategy)}>Approve Recommendation</Button>
                            </div>
                          </div>
                        </div>

                        {/* Alternative Options */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Alternative Strategies</h4>
                          {options.filter(o => o.id !== recommendation.recommended_strategy.id).map(opt => (
                            <div key={opt.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors cursor-pointer" onClick={() => resolveCrisis(opt)}>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center text-muted-foreground font-bold">{options.indexOf(opt) + 1}</div>
                                <div>
                                  <div className="font-semibold text-sm">{opt.title}</div>
                                  <div className="text-xs text-muted-foreground">{opt.description.substring(0, 60)}...</div>
                                  {opt.co2_impact && (
                                    <div className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${opt.co2_impact.score === 'HIGH' ? 'bg-red-100 text-red-700' :
                                      opt.co2_impact.score === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                      }`}>
                                      <Leaf className="w-3 h-3 mr-1" /> {opt.co2_impact.value}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-lg font-bold text-muted-foreground">61</span>
                                <div className="h-1 w-16 bg-secondary rounded-full overflow-hidden">
                                  <div className="h-full bg-muted-foreground" style={{ width: '61%' }}></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                        <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                          <Activity className="w-8 h-8 opacity-50" />
                        </div>
                        <p>Usage metrics normal. No interventions required.</p>
                        <div className="flex gap-2 mt-4 text-xs font-mono">
                          <span>CPU: 12%</span>
                          <span className="text-border">|</span>
                          <span>MEM: 4.2GB</span>
                          <span className="text-border">|</span>
                          <span>LATENCY: 45ms</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>

              {/* REMOVED RIGHT COLUMN - Industry 5.0 Principles as per user request */}

            </div >
          </>
        )}

        {/* --- OTHER TABS --- */}
        {activeTab === 'ANALYTICS' && <AnalyticsDashboard />}
        {activeTab === 'CREW' && <CrewManagement pilots={pilots} onRefresh={fetchData} />}

        {
          activeTab === 'SIMULATION' && (
            <div className="max-w-3xl mx-auto py-12">
              <Card>
                <CardHeader><CardTitle className="text-2xl text-center">Simulation Injection</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    {['WEATHER', 'TECHNICAL', 'ATC', 'CREW'].map(t => (
                      <Button key={t} variant={simType === t ? 'default' : 'outline'} className="h-20 flex flex-col gap-2" onClick={() => setSimType(t)}>
                        {t === 'WEATHER' && <Wind />}
                        {t === 'TECHNICAL' && <Cpu />}
                        {t === 'ATC' && <Radio />}
                        {t === 'CREW' && <Users />}
                        {t}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Scenario</label>
                    <select className="w-full p-2 rounded-md bg-background border border-border" value={simSubType} onChange={e => setSimSubType(e.target.value)}>
                      {simType === 'WEATHER' && <option value="Fog">Heavy Fog</option>}
                      {simType === 'TECHNICAL' && <option value="Technical">Hydraulic Failure</option>}
                      <option value="Generic">Generic Delay</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Flight</label>
                    <select
                      className="w-full p-2 rounded-md bg-background border border-border"
                      value={targetFlight}
                      onChange={e => setTargetFlight(e.target.value)}
                    >
                      <option value="">ALL FLIGHTS @ ORIGIN</option>
                      {flights.map(f => (
                        <option key={f._id} value={f._id}>{f.flightNumber} ({f.origin} -&gt; {f.destination})</option>
                      ))}
                    </select>
                  </div>

                  <Button size="lg" className="w-full text-lg" variant="destructive" onClick={runSim}>
                    INJECT FAULT
                  </Button>
                </CardContent>
              </Card>
            </div>
          )
        }

        {/* --- MAP TAB --- */}
        {
          activeTab === 'MAP' && (
            <FlightMap flights={flights} onFlightClick={setSelectedFlight} />
          )
        }


      </main >

      {/* Modals & Overlays */}
      < FlightDetailModal flight={selectedFlight} pilots={pilots} onClose={() => setSelectedFlight(null)} />

      {
        showDelayInput && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <Card className="w-full max-w-md border-orange-500">
              <CardHeader>
                <CardTitle className="text-orange-500">Manual Delay Override</CardTitle>
                <CardDescription>Enter the manual delay duration in minutes.</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  className="w-full p-3 bg-secondary rounded border border-border text-2xl font-mono text-center"
                  value={manualDelayMinutes}
                  onChange={e => setManualDelayMinutes(e.target.value)}
                  autoFocus
                />
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowDelayInput(false)}>Cancel</Button>
                <Button variant="default" className="bg-orange-500 hover:bg-orange-600" onClick={confirmManualDelay}>Confirm Delay</Button>
              </CardFooter>
            </Card>
          </div>
        )
      }
    </div >
  );
}

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<UnifiedDashboard />} />
      <Route path="/passenger" element={<PassengerBridge />} />
      <Route path="/crew" element={<CrewManagement />} />
    </Routes>
  </BrowserRouter>
);

export default App;
