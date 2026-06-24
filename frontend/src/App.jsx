import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Shield, Activity, Terminal, RefreshCw, Lock,
  Play, Download, ChevronRight, Cpu, Sun, Moon,
  LayoutDashboard, Code2, ThumbsDown, Zap
} from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { jsPDF } from 'jspdf';

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_BACKEND_URL = IS_LOCAL ? 'http://127.0.0.1:8000' : '';

const API_URL       = `${BASE_BACKEND_URL}/api/v1/events/live`;
const RESET_URL     = `${BASE_BACKEND_URL}/api/v1/events/reset`;
const SIMULATE_URL  = `${BASE_BACKEND_URL}/api/v1/events/simulate`;
const COPILOT_URL   = `${BASE_BACKEND_URL}/api/v1/copilot`;
const FP_BASE_URL   = `${BASE_BACKEND_URL}/api/v1/events`;

// ── Defined OUTSIDE component — always in scope ──
const cleanText = (str) => {
  if (!str) return '';
  return str.replace(/\*\*/g, '').replace(/\*/g, '').trim();
};

// System color map — now includes Treasury and Loans
const SYSTEM_COLORS = {
  CORE_BANKING: 'text-blue-500',
  CRM:          'text-violet-500',
  TREASURY:     'text-amber-500',
  LOANS:        'text-emerald-500',
  EMAIL:        'text-rose-500',
};

export default function App() {
  const [events, setEvents]                 = useState([]);
  const [selectedLog, setSelectedLog]       = useState(null);
  const [systemHealth, setSystemHealth]     = useState(100);
  const [isResetting, setIsResetting]       = useState(false);
  const [isSimulating, setIsSimulating]     = useState(false);
  const [neutralizedThreats, setNeutralizedThreats] = useState(new Set());
  const [falsePositives, setFalsePositives] = useState(new Set()); // ── NEW ──

  const [viewMode, setViewMode]             = useState('soc');
  const [isDarkMode, setIsDarkMode]         = useState(false);
  const [copilotInput, setCopilotInput]     = useState('');
  const [copilotResponse, setCopilotResponse] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);

  const [graphData, setGraphData]           = useState({ nodes: [], links: [] });
  const graphRef = useRef();

  // --- Theme Variables ---
  const tBg     = isDarkMode ? 'bg-slate-900'  : 'bg-slate-50';
  const tText   = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const tPanel  = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm';
  const tCard   = isDarkMode ? 'bg-slate-800/50 border-slate-700 hover:border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-blue-400';
  const tSubtext = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const tInput  = isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-black';

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? '#0f172a' : '#f8fafc';
    document.body.style.overflow = 'hidden';
  }, [isDarkMode]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (data.data) {
          setEvents(data.data);
          const latestAnomaly = data.data.find(
            (e) => e.ai_analysis?.is_anomaly
              && !neutralizedThreats.has(e.event_id)
              && !falsePositives.has(e.event_id)   // ── skip FP-marked events ──
          );
          if (latestAnomaly && (!selectedLog || selectedLog.event_id !== latestAnomaly.event_id)) {
            setSelectedLog(latestAnomaly);
            setSystemHealth(Math.max(0, 100 - latestAnomaly.ai_analysis.risk_score));
          } else if (!latestAnomaly) {
            setSystemHealth(100);
          }
        }
      } catch (error) {
        console.error('API Offline');
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedLog, neutralizedThreats, falsePositives]);

  useEffect(() => {
    if (selectedLog) {
      const isThreat = selectedLog.ai_analysis?.is_anomaly;
      const isHoney  = selectedLog.account_accessed === 'ACC_9999_GOD_MODE';
      setGraphData({
        nodes: [
          { id: 'user', name: selectedLog.user_id,          color: isThreat ? '#ef4444' : '#3b82f6', val: 5 },
          { id: 'ip',   name: selectedLog.ip_address,        color: isDarkMode ? '#94a3b8' : '#64748b', val: 3 },
          { id: 'node', name: selectedLog.account_accessed,  color: isHoney   ? '#f59e0b' : '#10b981', val: 5 },
        ],
        links: [
          { source: 'ip',   target: 'user', color: isDarkMode ? '#475569' : '#cbd5e1' },
          { source: 'user', target: 'node', color: isThreat   ? '#fca5a5' : '#6ee7b7' },
        ],
      });
    }
  }, [selectedLog, isDarkMode]);

  const handleSystemReset = async () => {
    if (window.confirm('Clear all data and reset sandbox?')) {
      setIsResetting(true);
      await fetch(RESET_URL, { method: 'DELETE' });
      setEvents([]);
      setSelectedLog(null);
      setNeutralizedThreats(new Set());
      setFalsePositives(new Set());
      setSystemHealth(100);
      setCopilotResponse('');
      setIsResetting(false);
    }
  };

  const handleLaunchSimulation = async () => {
    setIsSimulating(true);
    await fetch(SIMULATE_URL, { method: 'POST' });
    setTimeout(() => setIsSimulating(false), 40000);
  };

  const handleCopilotQuery = async () => {
    if (!copilotInput || !selectedLog) return;
    setIsCopilotLoading(true);
    try {
      const res = await fetch(COPILOT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: copilotInput, context: selectedLog }),
      });
      const data = await res.json();
      setCopilotResponse(data.reply);
    } catch (e) {
      setCopilotResponse('Connection failed.');
    }
    setIsCopilotLoading(false);
  };

  const handleKillSwitch = () => {
    if (selectedLog) {
      setNeutralizedThreats((prev) => new Set(prev).add(selectedLog.event_id));
      setSystemHealth(100);
    }
  };

  // ── Mark as False Positive — persists to backend for calibration corpus ──
  const handleMarkFalsePositive = async () => {
    if (!selectedLog) return;
    try {
      await fetch(`${FP_BASE_URL}/${selectedLog.event_id}/false-positive`, { method: 'POST' });
    } catch (e) {
      console.warn('FP API unreachable, marking locally only.');
    }
    setFalsePositives((prev) => new Set(prev).add(selectedLog.event_id));
    setSystemHealth(100);
    setSelectedLog(null);
  };

  const generateFIUReport = () => {
    if (!selectedLog) return;
    const doc = new jsPDF();
    const sanitize = (str) => {
      if (!str) return 'N/A';
      return str.replace(/[^\x20-\x7E]/g, '').replace(/\*/g, '').trim();
    };
    const narrative = sanitize(selectedLog.ai_analysis?.narrative || selectedLog.event_description);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(220, 38, 38);
    doc.text('SUSPICIOUS ACTIVITY REPORT (FIU-STR)', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`REPORT ID: STR-${selectedLog.event_id}`, 14, 30);
    doc.text(`TIMESTAMP: ${new Date().toISOString()}`, 14, 35);
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 40, 196, 40);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const row = (label, value, y) => {
      doc.setFont('helvetica', 'bold');  doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal'); doc.text(sanitize(value), 55, y);
    };
    row('SUBJECT:', selectedLog.user_id, 50);
    row('DEPARTMENT:', selectedLog.department, 60);
    row('SYSTEM:', `${selectedLog.system || 'N/A'} | ${selectedLog.ip_address} | ${selectedLog.geo_location}`, 70);
    row('ACTION:', selectedLog.action, 80);
    row('TARGET NODE:', selectedLog.account_accessed, 90);

    doc.setDrawColor(220, 38, 38);
    doc.setFillColor(254, 242, 242);
    doc.rect(14, 100, 182, 22, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`ML RISK SCORE: ${selectedLog.ai_analysis?.risk_score || 0} / 100`, 20, 109);
    doc.text(`SOAR PROTOCOL: ${sanitize(selectedLog.ai_analysis?.soar_action)}`, 20, 116);
    doc.setTextColor(15, 23, 42);
    doc.text('AI FORENSIC ANALYSIS:', 14, 135);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(narrative, 182);
    doc.text(splitText, 14, 145);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('CONFIDENTIAL — FOR INTERNAL FIU INVESTIGATION ONLY', 14, 280);
    doc.save(`FIU_Report_${selectedLog.user_id}.pdf`);
  };

  const renderSOARBadge = (soarAction) => {
    const map = {
      LOG_ONLY:                     { color: 'bg-slate-200 text-slate-700', text: 'Monitored' },
      FORCE_MFA_CHALLENGE:          { color: 'bg-amber-100 text-amber-700 border border-amber-300', text: 'MFA Sent' },
      REVOKE_WRITE_ACCESS:          { color: 'bg-rose-100 text-rose-700 border border-rose-300', text: 'Write Revoked' },
      TERMINATE_SESSION_AND_FREEZE: { color: 'bg-red-500 text-white shadow-sm', text: 'Session Killed' },
    };
    const cfg = map[soarAction] || map['LOG_ONLY'];
    return (
      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide flex-shrink-0 ${cfg.color}`}>
        {cfg.text}
      </span>
    );
  };

  // ── Active threat count excludes FP-marked events ──
  const activeBreaches = events.filter(
    (e) => e.ai_analysis?.is_anomaly
      && !neutralizedThreats.has(e.event_id)
      && !falsePositives.has(e.event_id)
  ).length;

  return (
    <div className={`h-screen w-full overflow-hidden font-sans transition-colors duration-300 ${tBg} ${tText}`}>
      <div className="max-w-[1500px] mx-auto p-4 md:p-6 h-full flex flex-col">

        {/* ── HEADER ── */}
        <header className={`flex-none flex justify-between items-center mb-6 p-4 rounded-2xl border transition-colors ${tPanel}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${systemHealth < 50 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {systemHealth < 50 ? <ShieldAlert className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Threat-Lens</h1>
              <p className={`text-[11px] font-medium uppercase tracking-wider ${tSubtext}`}>Unified Defense Matrix</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setViewMode('soc')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'soc' ? 'bg-blue-600 text-white shadow-md' : `hover:bg-slate-200/50 ${tSubtext}`}`}>
              <Code2 className="w-4 h-4" /> SOC View
            </button>
            <button onClick={() => setViewMode('exec')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'exec' ? 'bg-emerald-600 text-white shadow-md' : `hover:bg-slate-200/50 ${tSubtext}`}`}>
              <LayoutDashboard className="w-4 h-4" /> Exec View
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-lg border transition-all ${tCard}`}>
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <button onClick={handleSystemReset} disabled={isResetting} className={`p-2 rounded-lg border transition-all ${tCard}`}>
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
            <button onClick={handleLaunchSimulation} disabled={isSimulating}
              className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg transition-all shadow-md disabled:opacity-50">
              <Play className={`w-4 h-4 ${isSimulating ? 'animate-pulse' : ''}`} />
              {isSimulating ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>
        </header>

        {/* ── EXEC VIEW ── */}
        {viewMode === 'exec' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-grow flex items-center justify-center">
            <div className={`p-10 rounded-2xl border text-center w-full max-w-4xl ${tPanel}`}>
              <h2 className={`text-xl font-semibold uppercase tracking-wider mb-6 ${tSubtext}`}>System Integrity</h2>
              <div className={`text-7xl font-black mb-10 ${systemHealth < 50 ? 'text-red-500' : 'text-emerald-500'}`}>
                {systemHealth}%
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Events Processed',  value: events.length,                                                 color: 'text-blue-500' },
                  { label: 'Active Breaches',    value: activeBreaches,                                                color: 'text-red-500' },
                  { label: 'Traps Triggered',    value: events.filter((e) => e.account_accessed === 'ACC_9999_GOD_MODE').length, color: 'text-amber-500' },
                  { label: 'False Positives',    value: falsePositives.size,                                           color: 'text-violet-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`p-6 rounded-xl border ${tCard}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider ${tSubtext}`}>{label}</p>
                    <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              {/* System Coverage Indicators */}
              <div className={`mt-6 p-4 rounded-xl border ${tCard}`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${tSubtext}`}>Monitored Systems</p>
                <div className="flex justify-center gap-6">
                  {['CORE_BANKING', 'CRM', 'TREASURY', 'LOANS', 'EMAIL'].map((sys) => (
                    <div key={sys} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className={`text-xs font-semibold ${SYSTEM_COLORS[sys] || tSubtext}`}>{sys}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        ) : (
          /* ── SOC VIEW ── */
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow overflow-hidden min-h-0">

            {/* LEFT — Live Event Stream */}
            <div className={`col-span-1 lg:col-span-6 flex flex-col h-full rounded-2xl border overflow-hidden ${tPanel}`}>
              <div className={`flex-none p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${tSubtext}`}>
                  <Activity className="w-4 h-4 text-blue-500" /> Live Event Stream
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${activeBreaches > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-600'}`}>
                    {activeBreaches} ACTIVE {activeBreaches === 1 ? 'BREACH' : 'BREACHES'}
                  </span>
                </h2>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
                <AnimatePresence>
                  {events.map((event) => {
                    const isThreat     = event.ai_analysis?.is_anomaly;
                    const isNeutralized = neutralizedThreats.has(event.event_id);
                    const isFP         = falsePositives.has(event.event_id);   // ── NEW ──
                    const riskScore    = event.ai_analysis?.risk_score || 0;
                    const isSelected   = selectedLog?.event_id === event.event_id;
                    const isHoney      = event.account_accessed === 'ACC_9999_GOD_MODE';
                    const sysColor     = SYSTEM_COLORS[event.system] || tSubtext;

                    return (
                      <motion.div key={event.event_id} exit={{ opacity: 0, scale: 0.95 }} layout
                        onClick={() => setSelectedLog(event)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all
                          ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'shadow-sm'}
                          ${isNeutralized || isFP ? 'opacity-40' : ''}
                          ${tCard}
                          ${isThreat && !isNeutralized && !isFP
                            ? isDarkMode ? 'border-red-900 bg-red-950/20' : 'border-red-200 bg-red-50'
                            : ''}`}>

                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`text-sm font-bold truncate ${isThreat && !isNeutralized && !isFP ? 'text-red-500' : 'text-blue-500'}`}>
                              {event.user_id}
                            </span>
                            <ChevronRight className={`w-4 h-4 flex-shrink-0 ${tSubtext}`} />
                            <span className={`text-sm font-medium truncate ${tText}`}>{event.action}</span>
                          </div>
                          <div className={`text-lg font-black flex-shrink-0 ml-2 ${isNeutralized || isFP ? 'text-slate-400 line-through' : isThreat ? 'text-red-500' : tSubtext}`}>
                            {riskScore}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 flex-wrap items-center">
                            {renderSOARBadge(event.ai_analysis?.soar_action)}
                            {isHoney && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-100 text-amber-700 border border-amber-300 uppercase flex-shrink-0">
                                Trap Tripped
                              </span>
                            )}
                            {/* ── False Positive Badge ── */}
                            {isFP && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-violet-100 text-violet-700 border border-violet-300 uppercase flex-shrink-0">
                                False Positive
                              </span>
                            )}
                          </div>
                          <span className={`text-xs font-semibold uppercase truncate ml-2 ${sysColor}`}>
                            {event.system} | {event.geo_location}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT — Forensic Analysis */}
            <div className={`col-span-1 lg:col-span-6 h-full flex flex-col rounded-2xl border overflow-hidden ${tPanel}`}>
              {selectedLog ? (
                <>
                  <div className={`flex-none p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${tSubtext}`}>
                      <Terminal className="w-4 h-4 text-blue-500" /> Forensic Analysis
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${SYSTEM_COLORS[selectedLog.system] || tSubtext} bg-slate-100`}>
                        {selectedLog.system}
                      </span>
                    </h2>
                    <button onClick={generateFIUReport}
                      className="flex items-center gap-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md transition-colors shadow-sm">
                      <Download className="w-3 h-3" /> Export SAR
                    </button>
                  </div>

                  <div className="flex flex-col flex-grow p-4 gap-4 overflow-hidden min-h-0">

                    {/* Force Graph */}
                    <div className={`flex-none rounded-xl border relative h-[180px] overflow-hidden ${isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                      <ForceGraph2D
                        width={600} height={180} graphData={graphData}
                        nodeLabel="name" nodeColor="color" linkColor="color"
                        nodeRelSize={5} linkWidth={2} d3VelocityDecay={0.2} ref={graphRef}
                      />
                    </div>

                    {/* XAI Narrative */}
                    <div className={`flex-grow overflow-y-auto p-4 rounded-xl border text-sm leading-relaxed font-medium shadow-inner ${tCard}`}>
                      {cleanText(selectedLog.ai_analysis?.narrative || selectedLog.event_description)}
                    </div>

                    {/* Groq Copilot */}
                    <div className={`flex-none rounded-xl border flex flex-col p-4 shadow-sm ${tCard}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${tSubtext}`}>
                          Llama 3 Copilot
                        </span>
                      </div>
                      <div className={`mb-3 text-sm overflow-y-auto max-h-28 leading-relaxed ${tSubtext}`}>
                        {cleanText(copilotResponse) || 'Ask Copilot for remediation steps or log analysis...'}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={copilotInput} onChange={(e) => setCopilotInput(e.target.value)}
                          placeholder="What should I do next?" onKeyDown={(e) => e.key === 'Enter' && handleCopilotQuery()}
                          className={`flex-grow text-sm rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 ${tInput}`} />
                        <button onClick={handleCopilotQuery} disabled={isCopilotLoading}
                          className="bg-blue-600 text-white px-5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                          {isCopilotLoading ? '...' : 'Ask'}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {selectedLog.ai_analysis?.is_anomaly
                      && !neutralizedThreats.has(selectedLog.event_id)
                      && !falsePositives.has(selectedLog.event_id) && (
                      <div className="flex-none flex gap-3">
                        {/* ── Mark as False Positive ── */}
                        <button onClick={handleMarkFalsePositive}
                          className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md flex items-center justify-center gap-2 text-sm font-bold transition-all">
                          <ThumbsDown className="w-4 h-4" /> Mark False Positive
                        </button>
                        {/* ── Kill Switch ── */}
                        <button onClick={handleKillSwitch}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md flex items-center justify-center gap-2 text-sm font-bold transition-all">
                          <Lock className="w-4 h-4" /> Quarantine Account
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                  <Cpu className={`w-12 h-12 mb-4 ${tSubtext}`} />
                  <p className={`text-sm font-bold uppercase tracking-wider ${tSubtext}`}>Select a Log to Analyze</p>
                  <p className={`text-xs mt-2 ${tSubtext}`}>Threat narratives, forensic graphs, and Copilot appear here</p>
                </div>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}