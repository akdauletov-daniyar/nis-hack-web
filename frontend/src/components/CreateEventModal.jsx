import React, { useState } from 'react';
import { X, Camera, MapPin, Clock, ChevronDown, ChevronUp, Send, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const CATEGORIES = [
  { key: 'infrastructure', emoji: '🚧', label: 'Infrastructure', desc: 'Construction, pipes, roads' },
  { key: 'emergency',      emoji: '⚠️', label: 'Emergency',      desc: 'Accidents, fire, fallen tree' },
  { key: 'urban',          emoji: '🏙️', label: 'Urban',          desc: 'Trash, broken lights' },
  { key: 'events',         emoji: '🎉', label: 'Events',         desc: 'Fair, concert, road closure' },
];

const SMART_TAGS_MAP = {
  infrastructure: ['Road Work', 'Pipe Burst', 'Building Collapse', 'Power Lines', 'Bridge Repair'],
  emergency:      ['Need Ambulance', 'Traffic Jam', 'Fire', 'Flood', 'Gas Leak'],
  urban:          ['No Light', 'Pipe Burst', 'Open Manhole', 'Garbage', 'Broken Signal'],
  events:         ['Road Closure', 'Loud Noise', 'Parking Issue', 'Crowd', 'Street Market'],
};

const IMPACT_LABELS = {
  infrastructure: ['Local issue', 'Affects building', 'Affects district'],
  emergency:      ['Minor accident', 'Obstructs traffic', 'Full closure'],
  urban:          ['Local issue', 'Affects building', 'Affects district'],
  events:         ['Small event', 'Medium event', 'Large event'],
};

const CreateEventModal = ({ location, onClose, onCreated, categoryConfig }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [impactLevel, setImpactLevel] = useState(1);
  const [lifecycle, setLifecycle] = useState('active');
  const [smartTags, setSmartTags] = useState([]);
  const [description, setDescription] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  // AI Refinement state
  const [aiMode, setAiMode] = useState(false);
  const [aiRefining, setAiRefining] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onload = () => setMediaPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (tag) => {
    setSmartTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // ── AI Refinement ─────────────────────────────────────────────────────
  const handleAiRefine = async () => {
    if (!name.trim()) { setError('Please enter an event name for AI to refine'); return; }
    setAiRefining(true);
    setError('');

    try {
      const prompt = `You are an AI assistant for a city incident reporting platform. Based on the event name and description below, determine the best values for the report form fields.

Event Name: "${name}"
Brief Description: "${description}"
Location coordinates: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}

Respond ONLY with a valid JSON object (no markdown, no explanation) with these exact fields:
{
  "category": one of "infrastructure", "emergency", "urban", "events",
  "impact_level": 1 (low), 2 (medium), or 3 (high),
  "lifecycle": one of "planned", "active", "resolving",
  "smart_tags": array of relevant tags from these options based on category:
    - infrastructure: ["Road Work", "Pipe Burst", "Building Collapse", "Power Lines", "Bridge Repair"]
    - emergency: ["Need Ambulance", "Traffic Jam", "Fire", "Flood", "Gas Leak"]
    - urban: ["No Light", "Pipe Burst", "Open Manhole", "Garbage", "Broken Signal"]
    - events: ["Road Closure", "Loud Noise", "Parking Issue", "Crowd", "Street Market"],
  "refined_description": a more detailed, professional description (2-3 sentences) based on the user's input
}`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        throw new Error('AI service unavailable. Please fill in details manually.');
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      // Parse JSON (handle potential markdown wrapping)
      let parsed;
      try {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error('AI returned invalid format. Please fill in details manually.');
      }

      // Apply AI suggestions
      if (parsed.category && ['infrastructure', 'emergency', 'urban', 'events'].includes(parsed.category)) {
        setCategory(parsed.category);
      }
      if (parsed.impact_level && [1, 2, 3].includes(parsed.impact_level)) {
        setImpactLevel(parsed.impact_level);
      }
      if (parsed.lifecycle && ['planned', 'active', 'resolving'].includes(parsed.lifecycle)) {
        setLifecycle(parsed.lifecycle);
      }
      if (Array.isArray(parsed.smart_tags)) {
        setSmartTags(parsed.smart_tags);
      }
      if (parsed.refined_description) {
        setDescription(parsed.refined_description);
      }

      setShowDetails(true);
      setAiApplied(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setAiRefining(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter an event name'); return; }
    if (!category) { setError('Please select a category'); return; }
    setSubmitting(true);
    setError('');

    try {
      let mediaUrl = null;

      // Upload media to Supabase Storage if provided
      if (mediaFile) {
        const ext = mediaFile.name.split('.').pop();
        const fileName = `events/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, mediaFile);

        if (uploadError) {
          console.warn('Media upload failed:', uploadError.message);
        } else {
          const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
          mediaUrl = urlData?.publicUrl || null;
        }
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Please sign in to report an event');
      }

      const body = {
        name: name.trim(),
        latitude: location.lat,
        longitude: location.lng,
        category,
        media_url: mediaUrl,
        impact_level: impactLevel,
        lifecycle,
        smart_tags: smartTags,
        description: description || null,
      };

      const res = await fetch(`${API_BASE_URL}/api/events/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to create event');
      }

      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between z-10 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-extrabold text-dark">{t('modal_reportEvent')}</h2>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <MapPin size={12} /> {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* AI Refinement Toggle */}
            <button
              onClick={() => { setAiMode(!aiMode); setAiApplied(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                aiMode
                  ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300 shadow-md shadow-violet-100'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-violet-300 hover:text-violet-500'
              }`}
            >
              <Sparkles size={14} className={aiMode ? 'text-violet-500' : ''} />
              {t('modal_aiRefine')}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── Event Name (always visible) ── */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{t('modal_eventName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('modal_egRoad')}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-dark outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* ── Description (always visible) ── */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{t('modal_desc')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('modal_briefDesc')}
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-dark outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
            />
          </div>

          {/* ── AI Refine Button (when AI mode is on) ── */}
          {aiMode && (
            <button
              onClick={handleAiRefine}
              disabled={aiRefining || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-violet-200 dark:shadow-violet-900/30 transition-all duration-300"
            >
              {aiRefining ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('modal_refiningAI')}
                </>
              ) : aiApplied ? (
                <>
                  <Sparkles size={16} />
                  {t('modal_refinedAI')}
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {t('modal_autoFillAI')}
                </>
              )}
            </button>
          )}

          {/* ── AI Applied Banner ── */}
          {aiApplied && (
            <div className="flex items-center gap-2 text-xs text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 px-4 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800">
              <Sparkles size={14} />
              {t('modal_aiAppliedMsg')}
            </div>
          )}

          {/* ── LAYER 1: Base (Required) ── */}
          {/* Category Selection */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">{t('modal_category')}</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(categoryConfig).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => { setCategory(key); if (!aiApplied) setSmartTags([]); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                    category === key
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 scale-[1.02]'
                      : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-3xl">{cat.emoji}</span>
                  <span className="text-sm font-bold text-dark">{cat.label}</span>
                  <span className="text-[10px] text-gray-400 text-center leading-tight">{cat.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">{t('modal_photoVideo')}</label>
            {mediaPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <img src={mediaPreview} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
                <Camera size={28} className="text-gray-300 group-hover:text-primary transition-colors" />
                <span className="text-sm font-semibold text-gray-400 group-hover:text-primary transition-colors">{t('modal_tapAddPhoto')}</span>
                <span className="text-[10px] text-gray-300">{t('modal_photoCredibility')}</span>
                <input type="file" accept="image/*,video/*" onChange={handleMediaChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Timestamp (auto) */}
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-xl">
            <Clock size={14} />
            <span>{t('modal_timestamp')}<strong className="text-dark">{new Date().toLocaleString()}</strong></span>
          </div>

          {/* ── LAYER 2: Details (Optional) ── */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-semibold text-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span>{t('modal_addDetails')}</span>
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showDetails && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-2">
              {/* Impact Level */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">{t('modal_impactLevel')}</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(level => (
                    <button
                      key={level}
                      onClick={() => setImpactLevel(level)}
                      className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all border-2 ${
                        impactLevel === level
                          ? level === 1 ? 'bg-green-50 border-green-400 text-green-700'
                            : level === 2 ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                            : 'bg-red-50 border-red-400 text-red-700'
                          : 'border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {level === 1 ? t('impact_low') : level === 2 ? t('impact_medium') : t('impact_high')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lifecycle */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">{t('modal_status')}</label>
                <div className="flex gap-2">
                  {[
                    { value: 'planned', label: `📅 ${t('status_planned')}`, color: 'blue' },
                    { value: 'active', label: `🔴 ${t('status_active')}`, color: 'red' },
                    { value: 'resolving', label: `🔧 ${t('status_resolving')}`, color: 'green' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLifecycle(opt.value)}
                      className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all border-2 ${
                        lifecycle === opt.value
                          ? `bg-${opt.color}-50 border-${opt.color}-400 text-${opt.color}-700`
                          : 'border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-200'
                      }`}
                      style={lifecycle === opt.value ? {
                        backgroundColor: opt.color === 'blue' ? '#eff6ff' : opt.color === 'red' ? '#fef2f2' : '#f0fdf4',
                        borderColor: opt.color === 'blue' ? '#60a5fa' : opt.color === 'red' ? '#f87171' : '#4ade80',
                        color: opt.color === 'blue' ? '#1d4ed8' : opt.color === 'red' ? '#b91c1c' : '#15803d',
                      } : {}}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Smart Tags */}
              {category && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">{t('modal_quickTags')}</label>
                  <div className="flex flex-wrap gap-2">
                    {(SMART_TAGS_MAP[category] || []).map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          smartTags.includes(tag)
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-0 px-6 py-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleSubmit}
            disabled={submitting || !category || !name.trim()}
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary hover:bg-primary-alt disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('modal_submitting')}
              </>
            ) : (
              <>
                <Send size={18} />
                {t('modal_submitReport')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;
