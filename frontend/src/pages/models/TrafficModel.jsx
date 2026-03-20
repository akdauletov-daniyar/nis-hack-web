import React, { useState } from 'react';
import { Car, TreeDeciduous, Gauge, AlertTriangle, Layers, Upload, Loader2, Zap, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const API_BASE = 'http://localhost:8000';

const TrafficModel = () => {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/ml/traffic/predict`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Prediction failed');
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const levelColor = (level) => {
    if (level === 'Low') return 'bg-green-50 text-green-600 border-green-200';
    if (level === 'Medium') return 'bg-yellow-50 text-yellow-600 border-yellow-200';
    return 'bg-red-50 text-red-600 border-red-200';
  };

  const congestionLevels = [
    { level: 'Low', color: 'bg-green-50 text-green-600 border-green-100', desc: t('traf_descFree') },
    { level: 'Medium', color: 'bg-yellow-50 text-yellow-600 border-yellow-100', desc: t('traf_descMod') },
    { level: 'High', color: 'bg-red-50 text-red-600 border-red-100', desc: t('traf_descSev') },
  ];

  const featureGroups = [
    { group: t('traf_grp1'), features: ['Traffic_Speed_kmh', 'Road_Occupancy_Pct', 'Vehicle_Count'], color: 'text-blue-500' },
    { group: t('traf_grp2'), features: ['Vehicle_Count_Cars', 'Bikes', 'Buses', 'Trucks'], color: 'text-purple-500' },
    { group: t('traf_grp3'), features: ['Traffic_Light_State', 'Weather_Condition', 'Accident_Report'], color: 'text-orange-500' },
    { group: t('traf_grp4'), features: ['horn_events_per_min', 'CO2_Emissions_ppm', 'Sentiment_Score'], color: 'text-red-500' },
  ];

  const rfParams = [
    { label: t('traf_p1'), value: '400' },
    { label: t('traf_p2'), value: '18' },
    { label: t('traf_p3'), value: '1' },
    { label: t('traf_p4'), value: 'Balanced' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <Car size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-dark tracking-tight">{t('traf_title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('traf_subtitle')}</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed max-w-3xl">
          {t('traf_desc')}
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Upload size={20} className="text-primary" /> {t('aqm_runInference')}
        </h2>
        <p className="text-xs text-gray-500 mb-4">{t('dp_uploadDesc')}</p>
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <label className="flex-1 cursor-pointer">
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}>
              <FileSpreadsheet size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-semibold text-dark dark:text-white">{file ? file.name : t('aqm_clickToSelect')}</p>
              <p className="text-xs text-gray-400 mt-1">{file ? `${(file.size / 1024).toFixed(1)} KB` : t('aqm_dragDrop')}</p>
            </div>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {loading ? t('aqm_processing') : t('aqm_predict')}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3 font-medium">❌ {error}</p>}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-dark dark:text-white mb-4">
            {t('aqm_predictions')} ({results.row_count} rows)
          </h2>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-900">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">{t('aqm_row')}</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">{t('traf_predCongestion')}</th>
                </tr>
              </thead>
              <tbody>
                {results.predictions.map((row) => (
                  <tr key={row.row} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="py-2 px-2 text-xs text-gray-400">{row.row + 1}</td>
                    <td className="py-2 px-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${levelColor(row.predicted_congestion_level)}`}>
                        {row.predicted_congestion_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Congestion Classes */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Gauge size={20} className="text-primary" /> {t('traf_congLevels')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {congestionLevels.map((c) => (
            <div key={c.level} className={`rounded-xl p-4 border ${c.color} text-center`}>
              <p className="text-lg font-extrabold">{c.level}</p>
              <p className="text-xs mt-1">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Groups */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Layers size={20} className="text-secondary" /> {t('traf_inputFeat')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {featureGroups.map((g) => (
            <div key={g.group} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className={`font-bold text-sm mb-2 ${g.color}`}>{g.group}</h3>
              <div className="flex flex-wrap gap-1">
                {g.features.map((f) => (
                  <span key={f} className="text-xs font-mono font-semibold bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backend Architecture */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <TreeDeciduous size={20} className="text-green-500" /> {t('traf_rfBackend')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {rfParams.map((p) => (
            <div key={p.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500 font-medium">{p.label}</p>
              <p className="text-sm font-bold text-dark dark:text-white mt-1">{p.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pluggable Note */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-3">
          <AlertTriangle size={20} className="text-yellow-500" /> {t('traf_plugDesign')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {t('traf_plugDesc')}
        </p>
      </div>
    </div>
  );
};

export default TrafficModel;
