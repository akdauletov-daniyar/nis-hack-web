import React, { useState } from 'react';
import { Wind, Cpu, BarChart3, Layers, Zap, Database, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const API_BASE = 'http://localhost:8000';

const AirQualityModel = () => {
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
      const res = await fetch(`${API_BASE}/api/ml/air-quality/predict`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Prediction failed');
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const configParams = [
    { label: 'Window Size', value: '24 timesteps' },
    { label: 'Forecast Horizon', value: '1 step ahead' },
    { label: 'LSTM Hidden Size', value: '64 units' },
    { label: 'LSTM Layers', value: '2' },
    { label: 'LSTM Dropout', value: '0.2' },
    { label: 'Embedding Dim', value: '32' },
    { label: 'Learning Rate', value: '1e-3' },
    { label: 'Batch Size', value: '64' },
    { label: 'LSTM Epochs', value: '25' },
    { label: 'CV Splits', value: '5 (TimeSeriesSplit)' },
  ];

  const targets = [
    { name: t('aqm_c6h6'), type: t('aqm_regression'), color: 'text-blue-500' },
    { name: t('aqm_co'), type: t('aqm_regression'), color: 'text-green-500' },
    { name: t('aqm_category'), type: t('aqm_multiclass'), color: 'text-orange-500' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Wind size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-dark tracking-tight">{t('aqm_title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('aqm_subtitle')}</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed max-w-3xl">
          {t('aqm_desc')}
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Upload size={20} className="text-primary" /> {t('aqm_runInference')}
        </h2>
        <p className="text-xs text-gray-500 mb-4">{t('aqm_uploadCSV')}</p>
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
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">{t('aqm_co')}</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">{t('aqm_c6h6')}</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">{t('aqm_aqi')}</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">{t('aqm_category')}</th>
                </tr>
              </thead>
              <tbody>
                {results.predictions.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="py-2 px-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="py-2 px-2 text-xs font-mono font-bold text-green-600">{row.predicted_co_concentration?.toFixed(2)}</td>
                    <td className="py-2 px-2 text-xs font-mono font-bold text-blue-600">{row.predicted_c6h6_concentration?.toFixed(4)}</td>
                    <td className="py-2 px-2 text-xs font-mono font-bold text-orange-600">{row.predicted_aqi}</td>
                    <td className="py-2 px-2 text-xs font-semibold">{row.predicted_aqi_category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Architecture */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Layers size={20} className="text-primary" /> {t('aqm_architecture')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={16} className="text-purple-500" />
              <h3 className="font-bold text-dark dark:text-white text-sm">{t('aqm_lstm')}</h3>
            </div>
            <p className="text-xs text-gray-500">{t('aqm_lstm_desc')}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-green-500" />
              <h3 className="font-bold text-dark dark:text-white text-sm">{t('aqm_fusion')}</h3>
            </div>
            <p className="text-xs text-gray-500">{t('aqm_fusion_desc')}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className="text-orange-500" />
              <h3 className="font-bold text-dark dark:text-white text-sm">{t('aqm_ensemble')}</h3>
            </div>
            <p className="text-xs text-gray-500">{t('aqm_ensemble_desc')}</p>
          </div>
        </div>
      </div>

      {/* Prediction Targets */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Database size={20} className="text-secondary" /> {t('aqm_targets')}
        </h2>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {targets.map((t) => (
            <div key={t.name} className="flex items-center justify-between py-3">
              <span className="font-semibold text-dark dark:text-white text-sm">{t.name}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 ${t.color}`}>{t.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold text-dark dark:text-white mb-4">{t('aqm_hyperparameters')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {configParams.map((p) => (
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

export default AirQualityModel;
