import React, { useState } from 'react';
import { Accessibility, MapPin, Loader2, Route, ChevronDown } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const FAQItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between py-5 text-left gap-4">
        <span className="text-sm font-semibold text-dark dark:text-white">{question}</span>
        <ChevronDown size={18} className={`text-gray-400 flex-shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed -mt-2">{answer}</p>}
    </div>
  );
};

const GeoAIAccessibility = () => {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!start || !destination) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/ml/geoai/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, destination }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Routing failed');
      setResult(data.route);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const faqItems = [
    { q: 'How does the routing algorithm work?', a: 'It builds an accessibility-weighted graph from node data, applies GNN-inspired message passing (3 rounds, 35% blend) to smooth scores, then runs Dijkstra with edge cost = distance × accessibility_penalty × slope_penalty.' },
    { q: 'What accessibility features are scored?', a: 'Four features: wheelchair access (40% weight), tactile paving (25%), kerb/ramp availability (25%), and audio traffic signals (10%). Each node gets a composite accessibility score.' },
    { q: 'What is GNN-inspired message passing?', a: 'Accessibility scores are smoothed over the graph topology through iterative neighborhood blending. Each node\'s score is updated by averaging with its connected neighbors, propagating good/bad accessibility information across the graph.' },
    { q: 'What inputs does it expect?', a: 'A JSON body with "start" and "destination" fields (node IDs like "node_24277"), plus optional "nodes" and "edges" arrays to override the default graph data.' },
    { q: 'What does it return?', a: 'A route object with: total distance, estimated time, accessibility score (%), confidence, a recommendation text, any warnings about barriers, and step-by-step navigation instructions.' },
    { q: 'Why not use Google Maps API for routing?', a: 'Google Maps has no accessibility routing — it optimizes for distance or time, not wheelchair traversability. Our model uses custom graph features (tactile paving, kerb profiles, ramp availability) unavailable in any commercial API.' },
    { q: 'What is the slope penalty?', a: 'Routes with gradients exceeding 5% receive a cost penalty proportional to the steepness. This avoids sending wheelchair users up steep inclines even when the distance is shorter.' },
    { q: 'What is the base traversal speed?', a: '64 meters per minute, approximating average wheelchair speed on flat, accessible surfaces. Actual time estimates factor in slope and surface quality penalties.' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center"><Accessibility size={24} /></div>
          <div>
            <h1 className="text-3xl font-extrabold text-dark tracking-tight">GeoAI Accessibility Router</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Wheelchair-First GNN-Style Navigation</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed max-w-3xl">
          A graph-based routing engine that builds an accessibility-aware graph from node data (tactile paving, wheelchair access,
          kerb/ramp profiles), applies GNN-inspired message passing to smooth scores, then runs Dijkstra with accessibility penalties.
        </p>
      </div>

      {/* Route Form */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <MapPin size={20} className="text-primary" /> Plan Route
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Start (geoid or address)</label>
              <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="e.g. node_24277"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-dark dark:text-white focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Destination (geoid or address)</label>
              <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. node_24300"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-dark dark:text-white focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <button type="submit" disabled={!start || !destination || loading}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Route size={16} />}
            {loading ? 'Computing...' : 'Find Route'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3 font-medium">❌ {error}</p>}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-dark dark:text-white mb-4">Route Result</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Distance', value: result.distance },
              { label: 'Time', value: result.estimated_time },
              { label: 'Accessibility', value: `${result.accessibility_score}%`, highlight: true },
              { label: 'Confidence', value: `${(result.confidence * 100).toFixed(0)}%` },
            ].map((m) => (
              <div key={m.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
                <p className="text-xs text-gray-500">{m.label}</p>
                <p className={`text-sm font-bold mt-1 ${m.highlight ? 'text-primary' : 'text-dark dark:text-white'}`}>{m.value}</p>
              </div>
            ))}
          </div>
          {result.recommendation && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-primary">{result.recommendation}</p>
            </div>
          )}
          {result.warnings?.length > 0 && (
            <ul className="space-y-1 mb-4">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-xs text-yellow-600 bg-yellow-50 rounded-lg px-3 py-1.5 border border-yellow-100">{w}</li>
              ))}
            </ul>
          )}
          {result.route?.length > 0 && (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {result.route.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-400 font-mono w-6 flex-shrink-0">{i + 1}.</span>
                  <span className="text-gray-600 dark:text-gray-400">{step.instruction}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-2xl font-extrabold text-dark dark:text-white mb-2">Frequently Asked Questions</h2>
        <p className="text-gray-500 text-sm mb-6">Everything you need to know about this model.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          {faqItems.map((item, i) => <FAQItem key={i} question={item.q} answer={item.a} />)}
        </div>
      </div>
    </div>
  );
};

export default GeoAIAccessibility;
