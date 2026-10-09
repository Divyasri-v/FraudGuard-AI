import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Bot, Send, Sparkles, AlertTriangle, ShieldCheck, HelpCircle,
  Loader2, Copy, Check, ArrowRight, CornerDownLeft, RefreshCw, X, FileText
} from 'lucide-react';
import { assistantAPI } from '../services/api';
import { NeuralAIVisual, FraudShieldVisual, ClaimDocumentVisual } from '../components/common/ProjectVisuals';

const PROMPT_SUGGESTIONS = [
  'Why was this claim flagged?',
  'Explain the triggered rules',
  'Summarize this investigation',
  'What evidence should I review?',
  'Explain duplicate billing',
  'How does the 70/30 hybrid scoring work?'
];

const Assistant = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeClaimId = searchParams.get('claim_id') || '';

  const [inputQuery, setInputQuery] = useState('');
  const [activeClaim, setActiveClaim] = useState(activeClaimId);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `### Welcome to the FraudGuard AI Investigation Assistant
I am your **AI-Powered SIU Adjudication Specialist**, grounded in **Gemini 2.5 Flash** and the **FraudGuard RAG Knowledge Base**.

You can ask me to:
- **Deconstruct any synthetic claim** (e.g. *"Why was CLM00001 flagged?"*)
- **Explain clinical and billing rules** (e.g. *"What constitutes unbundling?"*)
- **Audit evidence checklists** and determine missing documentation.
- **Provide grounded investigator recommendations** for human analyst review.

*Strict Boundary: All telemetry is strictly synthetic demo data. Findings represent assistive decision-support, not legal determinations.*`,
      sources: ['FraudGuard Knowledge Base', 'SIU Clinical Guidelines'],
      model: 'Gemini 2.5 Flash • Grounded RAG',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeClaimId) {
      setActiveClaim(activeClaimId);
      handleSend(`Why was claim ${activeClaimId} flagged?`, activeClaimId);
    }
  }, [activeClaimId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryToSend = inputQuery, claimContext = activeClaim) => {
    const text = queryToSend.trim();
    if (!text) return;

    const userMsg = {
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await assistantAPI.query(text, claimContext || undefined);
      const assistantMsg = {
        role: 'assistant',
        text: res.data.answer,
        sources: res.data.sources || [],
        evidence: res.data.evidence_data || {},
        model: res.data.model || 'Gemini 2.5 Flash • Grounded RAG',
        is_llm: res.data.is_llm_powered,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: '⚠️ **AI Assistant Encountered an Issue**: Unable to complete query resolution. Please verify that the backend API is online and the claim ID is valid.',
          sources: ['System Diagnostic'],
          model: 'Error Fallback',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2500);
  };

  const handleClearContext = () => {
    setActiveClaim('');
    searchParams.delete('claim_id');
    setSearchParams(searchParams);
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8.5rem)] flex flex-col space-y-3">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.18)] transition-all duration-280">
        <div className="flex items-center space-x-3.5">
          <div className="p-1 rounded-xl bg-slate-900 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.35)] flex-shrink-0">
            <NeuralAIVisual size={40} pulse={true} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                AI Investigation Assistant
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Gemini 2.5 Flash • Grounded RAG
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Deterministic fraud knowledge grounding, evidence synthesis &amp; investigator decision support
            </p>
          </div>
        </div>

        {/* Claim Context Pill */}
        {activeClaim && (
          <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs shadow-2xs">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-600 font-medium">Active Context:</span>
            <Link to={`/claims/${activeClaim}`} className="font-mono font-bold text-blue-700 hover:underline">
              {activeClaim}
            </Link>
            <button
              onClick={handleClearContext}
              title="Remove claim context"
              className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Suggested Questions Pills with RGB Neon Glow Hover */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex-shrink-0">
          Suggested:
        </span>
        {PROMPT_SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              const fullQuery = activeClaim && q.includes('this claim') ? q.replace('this claim', `claim ${activeClaim}`) : q;
              setInputQuery(fullQuery);
              handleSend(fullQuery);
            }}
            className="flex-shrink-0 bg-white border border-slate-200/90 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 shadow-2xs hover:scale-[1.02] hover:-translate-y-0.5 hover:border-cyan-400 hover:text-cyan-700 hover:shadow-[0_0_14px_rgba(6,182,212,0.25)] cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-inner">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-2xl p-4 sm:p-5 text-xs leading-relaxed shadow-xs transition-all ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs space-y-3'
              }`}
            >
              {/* Assistant Header Info */}
              {m.role === 'assistant' && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px]">
                  <div className="flex items-center space-x-1.5 text-indigo-700 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{m.model || 'FraudGuard AI Assistant'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-400">
                    <span>{m.timestamp}</span>
                    <button
                      onClick={() => handleCopy(m.text, idx)}
                      title="Copy response"
                      className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    >
                      {copiedIdx === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div className="whitespace-pre-line font-sans space-y-2">
                {m.text}
              </div>

              {/* Evidence Snapshot Card */}
              {m.evidence && Object.keys(m.evidence).length > 0 && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Synthetic Telemetry Snapshot</span>
                    <Link
                      to={`/claims/${m.evidence.claim_id}`}
                      className="text-blue-600 hover:underline flex items-center space-x-0.5 text-[10px] font-semibold"
                    >
                      <span>View Claim Record</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-600">
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400">Claim ID</div>
                      <div className="font-mono font-bold text-blue-700">{m.evidence.claim_id}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400">Hybrid Risk Score</div>
                      <div className="font-bold text-slate-900">{m.evidence.hybrid_score}/100 ({m.evidence.risk_level})</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400">Claimed Amount</div>
                      <div className="font-mono font-bold text-slate-900">{m.evidence.claimed_amount}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400">Expected Tariff</div>
                      <div className="font-mono text-slate-700">{m.evidence.expected_amount}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sources & Citations Section */}
              {m.sources && m.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-400">Grounded Sources:</span>
                  {m.sources.map((s, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-center space-x-3 shadow-xs">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span>Synthesizing RAG knowledge base &amp; claim telemetry via Gemini 2.5 Flash...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={
            activeClaim
              ? `Ask about ${activeClaim} (e.g. 'Why was this flagged?', 'Explain triggered rules')...`
              : "Ask about a claim (e.g. 'Why was CLM00001 flagged?') or fraud rule (e.g. 'Explain upcoding')..."
          }
          className="w-full pl-4 pr-14 py-3 bg-white text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 transition-colors shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default Assistant;
