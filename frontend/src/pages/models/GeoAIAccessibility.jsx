import React, { useState } from 'react';
import { Accessibility, Network, Route, ShieldCheck, Scale, Loader2, MapPin } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const API_BASE = 'http://localhost:8000';

const GeoAIAccessibility = () => {
  const { t } = useLanguage();
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!start || !destination) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/ml/geoai/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, destination }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Routing failed');
      setResult(data.route);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const weights = [
    { feature: t('geoai_feat1'), weight: 0.40, icon: '♿', color: 'text-blue-500 bg-blue-50 border-blue-100' },
    { feature: t('geoai_feat2'), weight: 0.25, icon: '🦯', color: 'text-purple-500 bg-purple-50 border-purple-100' },
    { feature: t('geoai_feat3'), weight: 0.25, icon: '🛤️', color: 'text-green-500 bg-green-50 border-green-100' },
    { feature: t('geoai_feat4'), weight: 0.10, icon: '🔊', color: 'text-orange-500 bg-orange-50 border-orange-100' },
  ];

  const modelParams = [
    { label: t('geoai_param1'), value: '3' },
    { label: t('geoai_param2'), value: '0.35' },
    { label: t('geoai_param3'), value: '64 m/min' },
    { label: t('geoai_param4'), value: '5%' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Accessibility size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-dark tracking-tight">{t('geoai_title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('geoai_subtitle')}</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed max-w-3xl">
          {t('geoai_desc')}
        </p>
      </div>

      {/* Route Form */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <MapPin size={20} className="text-primary" /> {t('geoai_planRoute')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">{t('geoai_start')}</label>
              <input
                value={start}
                onChange={(e) => setStart(e.target.value)}
                placeholder="e.g. node_24277"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-dark dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">{t('geoai_dest')}</label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. node_24300"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-dark dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!start || !destination || loading}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Route size={16} />}
            {loading ? t('geoai_computing') : t('geoai_findRoute')}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3 font-medium">❌ {error}</p>}
      </div>

      {/* Route Result */}
      {result && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-dark dark:text-white mb-4">{t('geoai_routeResult')}</h2>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500">{t('geoai_distance')}</p>
              <p className="text-sm font-bold text-dark dark:text-white">{result.distance}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500">{t('geoai_time')}</p>
              <p className="text-sm font-bold text-dark dark:text-white">{result.estimated_time}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500">{t('geoai_accessibility')}</p>
              <p className="text-sm font-bold text-primary">{result.accessibility_score}%</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500">{t('geoai_confidence')}</p>
              <p className="text-sm font-bold text-dark dark:text-white">{(result.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
            <p className="text-sm font-bold text-primary">{result.recommendation}</p>
          </div>

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">⚠️ {t('geoai_warnings')} ({result.warnings.length})</p>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-yellow-600 bg-yellow-50 rounded-lg px-3 py-1.5 border border-yellow-100">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Steps */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">{t('geoai_routeSteps')} ({result.route?.length})</p>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {result.route?.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-400 font-mono w-6 flex-shrink-0">{i + 1}.</span>
                  <span className="text-gray-600 dark:text-gray-400">{step.instruction}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Network size={20} className="text-primary" /> {t('geoai_howItWorks')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-dark dark:text-white text-sm mb-1">{t('geoai_step1')}</h3>
            <p className="text-xs text-gray-500">{t('geoai_step1Desc')}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-dark dark:text-white text-sm mb-1">{t('geoai_step2')}</h3>
            <p className="text-xs text-gray-500">{t('geoai_step2Desc')}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-dark dark:text-white text-sm mb-1">{t('geoai_step3')}</h3>
            <p className="text-xs text-gray-500">{t('geoai_step3Desc')}</p>
          </div>
        </div>
      </div>

      {/* Feature Weights */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Scale size={20} className="text-secondary" /> {t('geoai_featureWeights')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {weights.map((w) => (
            <div key={w.feature} className={`rounded-xl p-4 border ${w.color} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{w.icon}</span>
                <span className="font-bold text-sm">{w.feature}</span>
              </div>
              <span className="text-lg font-extrabold">{(w.weight * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <ShieldCheck size={20} className="text-primary" /> {t('geoai_params')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {modelParams.map((p) => (
            <div key={p.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500 font-medium">{p.label}</p>
              <p className="text-sm font-bold text-dark dark:text-white mt-1">{p.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GeoAIAccessibility;
