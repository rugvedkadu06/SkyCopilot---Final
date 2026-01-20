import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Sub-components (Assuming they are being refactored next, passing props safely)
import Timeline from '../components/passenger/Timeline';
import VoucherCard from '../components/passenger/VoucherCard';
import RebookingOptions from '../components/passenger/RebookingOptions';
import FlightStatusCard from '../components/passenger/FlightStatusCard';
import RightsCard from '../components/passenger/RightsCard';
import FeedbackWidget from '../components/passenger/FeedbackWidget';
import PassengerOptions from '../components/passenger/PassengerOptions';

const API_URL = 'http://localhost:8000';

// Translation Dictionary
const DICT = {
    en: {
        title: "Passenger Dignity & Assistance Portal",
        subtitle: "Industry 5.0 | Transparent • Ethical • Human-Centric",
        status_critical: "SAFETY PAUSE ACTIVE",
        reason_label: "TRANSPARENT CAUSE",
        timeline: "Real-Time Truth Timeline",
        compensation: "Your Guaranteed Rights",
        options: "How can we restore your comfort?",
        login_placeholder: "Enter Flight Number (e.g., FLY1001)",
        search_btn: "ACCESS MY FLIGHT",
        rights_info: "We prioritize your dignity. Based on the delay, these rights are automatically unlocked for you:",
        chat_placeholder: "Ask about safety, care, or your rights...",
        support_btn: "Human-AI Support"
    },
    hi: {
        title: "यात्री सहायता",
        subtitle: "वास्तविक समय अपडेट और समाधान",
        status_critical: "गंभीर देरी",
        reason_label: "देरी का कारण",
        timeline: "लाइव समयरेखा",
        compensation: "आपके अधिकार",
        options: "आप क्या करना चाहेंगे?",
        login_placeholder: "उड़ान संख्या दर्ज करें (उदा. FLY1001)",
        search_btn: "खोजें",
        rights_info: "आपकी देरी के आधार पर, हमने इन अधिकारों को सक्रिय किया है:",
        chat_placeholder: "देरी, भोजन या रिफंड के बारे में पूछें...",
        support_btn: "सहायता चैट"
    },
    ta: {
        title: "பயணிகள் உதவி",
        subtitle: "நிகழ்நேர புதுப்பிப்புகள்",
        status_critical: "தாமதம்",
        reason_label: "காரணம்",
        timeline: "காலவரிசை",
        compensation: "உரிமைகள்",
        options: "விருப்பங்கள்",
        login_placeholder: "விமான எண்",
        search_btn: "தேடு",
        rights_info: "தாமதத்தின் அடிப்படையில் உரிமைகள்:",
        chat_placeholder: "கேள்வி கேட்கவும்...",
        support_btn: "ஆதரவு"
    },
    bn: {
        title: "যাত্রী সহায়তা",
        subtitle: "রিয়েল-টাইম আপডেট",
        status_critical: "বিলম্ব",
        reason_label: "কারণ",
        timeline: "টাইমলাইন",
        compensation: "অধিকার",
        options: "বিকল্প",
        login_placeholder: "ফ্লাইট নম্বর",
        search_btn: "অনুসন্ধান",
        rights_info: "বিলম্বের উপর ভিত্তি করে অধিকার:",
        chat_placeholder: "প্রশ্ন জিজ্ঞাসা করুন...",
        support_btn: "সমর্থন"
    }
};

const PassengerBridge = () => {
    const [lang, setLang] = useState('en');
    const [flightId, setFlightId] = useState('');
    const [flightData, setFlightData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showRebook, setShowRebook] = useState(false);
    const [activeOption, setActiveOption] = useState(null);

    // Chat State
    const [showChat, setShowChat] = useState(false);
    const [chatMsg, setChatMsg] = useState('');
    const [chatHistory, setChatHistory] = useState([{ sender: 'bot', text: 'Hello! I am your SkyCoPilot Assistant. How can I help you regarding your flight today?' }]);

    const t = DICT[lang];

    const handleSearch = async () => {
        if (!flightId) return;
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(`${API_URL}/passenger/flight/${flightId}`);
            setFlightData(res.data);
            setChatHistory([{ sender: 'bot', text: `Hello! I see flight ${res.data.flight_number} is currently ${res.data.status}. How can I assist you?` }]);
        } catch (err) {
            setError('Flight not found. Please check the number.');
            setFlightData(null);
        } finally {
            setLoading(false);
        }
    };

    const sendChat = async () => {
        if (!chatMsg.trim()) return;

        const userMsg = chatMsg;
        setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
        setChatMsg('');

        try {
            const contextStr = flightData
                ? `Flight ${flightData.flight_number} is ${flightData.status} (Delay: ${flightData.delay_minutes}m). Reason: ${flightData.plain_reason_desc}.`
                : "General inquiry.";

            const res = await axios.post(`${API_URL}/passenger/support`, { message: userMsg, context: contextStr });
            setChatHistory(prev => [...prev, { sender: 'bot', text: res.data.response }]);
        } catch (err) {
            setChatHistory(prev => [...prev, { sender: 'bot', text: "Sorry, I'm having trouble connecting." }]);
        }
    };

    const handleOptionSelect = async (optId) => {
        if (optId === 'REBOOK') {
            setShowRebook(true);
            return;
        }

        const email = prompt("Enter your email to receive the voucher/confirmation:", "passenger@example.com");
        if (!email) return;

        try {
            await axios.post(`${API_URL}/passenger/request-option`, {
                flight_id: flightData.flight_id,
                option_id: optId,
                email: email
            });
            alert(`✅ Confirmation sent to ${email}`);
        } catch (err) {
            console.error(err);
            alert("Failed to send email. Please try again.");
        }
    };

    const rebookOptions = [
        { id: 1, time: "02:30 PM", flightNo: "6E-554", carrier: "IndiGo", seats: 12 },
        { id: 2, time: "04:15 PM", flightNo: "AI-887", carrier: "Air India", seats: 5 },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">

            {/* --- TOP BAR --- */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 text-primary rounded-lg flex items-center justify-center font-bold text-2xl">A</div>
                    <div>
                        <h1 className="font-bold text-lg tracking-widest text-primary">SKY<span className="text-foreground">COPILOT</span></h1>
                        <p className="text-xs text-muted-foreground tracking-wider">PASSENGER ASSISTANCE DASHBOARD</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {flightData && (
                        <div className="hidden md:block text-right mr-4 border-r border-border pr-4">
                            <h2 className="font-bold text-sm">{flightData.flight_number}</h2>
                            <div className="text-xs text-muted-foreground font-mono">{flightData.origin} ➔ {flightData.destination}</div>
                        </div>
                    )}
                    <div className="flex gap-1">
                        {['en', 'hi', 'ta', 'bn'].map(l => (
                            <Button
                                key={l}
                                variant={lang === l ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setLang(l)}
                                className="h-8 w-10 text-xs font-bold uppercase"
                            >
                                {l}
                            </Button>
                        ))}
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in zoom-in-95 duration-500">

                {/* LOGIN / SEARCH - Centered if no data */}
                {!flightData && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <Card className="w-full max-w-lg shadow-2xl border-primary/20 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                            <CardHeader className="text-center pb-2">
                                <CardTitle className="text-2xl font-bold mb-2">{t.title}</CardTitle>
                                <p className="text-muted-foreground">{t.subtitle}</p>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div>
                                    <label className="text-xs font-mono text-muted-foreground mb-2 block uppercase tracking-widest">Flight Details</label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="text"
                                            value={flightId}
                                            onChange={(e) => setFlightId(e.target.value)}
                                            placeholder={t.login_placeholder}
                                            className="font-mono text-lg"
                                        />
                                        <Button
                                            onClick={handleSearch}
                                            disabled={loading}
                                            size="lg"
                                            className="font-bold tracking-widest"
                                        >
                                            {loading ? "..." : "➔"}
                                        </Button>
                                    </div>
                                </div>

                                {error && <div className="p-3 bg-destructive/10 border border-destructive/50 text-destructive text-sm rounded font-medium text-center">{error}</div>}

                                <div className="border-t border-border pt-4 text-center">
                                    <p className="text-xs text-muted-foreground mb-2">DEMO FLIGHTS</p>
                                    <div className="flex gap-3 justify-center">
                                        <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setFlightId('FLY1001')}>FLY1001</Badge>
                                        <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setFlightId('FLY1002')}>FLY1002</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* DESKTOP DASHBOARD GRID */}
                {flightData && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                        {/* LEFT COLUMN: Status & Timeline (Wide) */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* Hero Status Card */}
                            <FlightStatusCard data={flightData} t={t} />

                            {/* Timeline Section */}
                            <Card className="shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-lg font-bold uppercase tracking-wider">{t.timeline}</CardTitle>
                                    <Badge variant="outline" className="text-primary border-primary animate-pulse">● LIVE UPDATES</Badge>
                                </CardHeader>
                                <CardContent>
                                    <Timeline events={flightData.timeline} language={lang} />
                                </CardContent>
                            </Card>

                            {/* Compensation & Rights */}
                            {flightData.rights.length > 0 && (
                                <Card className="shadow-lg border-primary/20">
                                    <CardHeader className="border-b border-border pb-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">⚖️</span>
                                            <div>
                                                <CardTitle className="text-lg uppercase tracking-wider">{t.compensation}</CardTitle>
                                                <p className="text-xs text-muted-foreground">{t.rights_info}</p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <RightsCard rights={flightData.rights} t={t} />

                                        {flightData.vouchers.length > 0 && (
                                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {flightData.vouchers.map((v, i) => (
                                                    <VoucherCard key={i} {...v} />
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Actions & Support (Sticky) */}
                        <div className="lg:col-span-4 space-y-6 sticky top-24">

                            {/* Action Menu */}
                            <Card className="shadow-lg">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t.options}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {!showRebook ? (
                                        <div className="flex flex-col gap-3">
                                            <PassengerOptions onSelect={handleOptionSelect} />
                                        </div>
                                    ) : (
                                        <div className="animate-in slide-in-from-right-4">
                                            <Button variant="ghost" size="sm" onClick={() => setShowRebook(false)} className="mb-2 -ml-2 text-muted-foreground">
                                                ← BACK
                                            </Button>
                                            <RebookingOptions options={rebookOptions} onSelect={(opt) => alert(`Mock: Rebooked on ${opt.flightNo}`)} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Embedded Chat Widget */}
                            <Card className="shadow-xl flex flex-col h-[500px] overflow-hidden border-primary/20">
                                <div className="bg-primary/10 p-4 border-b border-border flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                        <h3 className="font-bold text-primary text-sm">SKYCOPILOT AI</h3>
                                    </div>
                                    <span className="text-[10px] uppercase font-mono text-muted-foreground">Online</span>
                                </div>

                                <ScrollArea className="flex-1 p-4 bg-muted/20">
                                    <div className="space-y-4">
                                        {chatHistory.map((c, i) => (
                                            <div key={i} className={`flex ${c.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] text-sm p-3 rounded-lg shadow-sm ${c.sender === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border border-border text-card-foreground rounded-tl-none'}`}>
                                                    {c.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>

                                <div className="p-3 border-t border-border bg-card flex gap-2">
                                    <Input
                                        className="flex-1"
                                        placeholder={t.chat_placeholder}
                                        value={chatMsg}
                                        onChange={e => setChatMsg(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && sendChat()}
                                    />
                                    <Button onClick={sendChat} size="icon">➤</Button>
                                </div>
                            </Card>

                            <FeedbackWidget flightId={flightData.flight_id} />

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PassengerBridge;
