import React, { useState } from 'react';
import { Wind, Upload, Loader2, Zap, FileSpreadsheet, ChevronDown } from 'lucide-react';

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

const AirQualityModel = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/ml/air-quality/predict`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Prediction failed');
      setResults(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const faqItems = [
    { q: 'What architecture does this model use?', a: 'A hybrid ensemble combining an LSTM encoder (PyTorch) for temporal feature extraction with dual XGBoost + CatBoost heads for regression and classification. Predictions from both gradient-boosted heads are averaged for stability.' },
    { q: 'What are the prediction targets?', a: 'The model predicts three targets: CO concentration (regression), C6H6/benzene concentration (regression), and AQI classification (multi-class: Good, Moderate, Unhealthy for Sensitive Groups, Unhealthy, Very Unhealthy, Hazardous).' },
    { q: 'What input columns does the CSV need?', a: 'DATE_OCC, TIME_OCC, Lat, Lon, PT08.S1(CO), Temperature_C, RH% (or RH_%), Wind_Speed, C6H6(GT), AQI. Each row represents one sensor reading.' },
    { q: 'What is the LSTM window size?', a: 'The model uses a 24-timestep sliding window — one full diurnal cycle — to capture temporal pollutant dynamics. The LSTM has 2 layers with 64 hidden units and 0.2 dropout.' },
    { q: 'How is the ensemble combined?', a: 'LSTM embeddings are concatenated with static features (Lat, Lon, Wind Speed), then passed to both XGBoost and CatBoost heads independently. Their outputs are averaged to reduce variance.' },
    { q: 'What cross-validation strategy is used?', a: '5-fold TimeSeriesSplit to respect temporal ordering and prevent future data leakage. Learning rate is 1e-3 with batch size 64 and 25 LSTM epochs.' },
    { q: 'How does AQI classification work?', a: 'The numeric AQI value is mapped to standard EPA categories: ≤50 Good, ≤100 Moderate, ≤150 Unhealthy for Sensitive Groups, ≤200 Unhealthy, ≤300 Very Unhealthy, >300 Hazardous.' },
    { q: 'Can I use this without a trained model?', a: 'No — the endpoint requires a trained model artifact (air_quality_hybrid_model.joblib) in the backend/artifacts/ directory. Train the model first using the training script, then save it.' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center"><Wind size={24} /></div>
          <div>
            <h1 className="text-3xl font-extrabold text-dark tracking-tight">Air Quality Hybrid Model</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">LSTM + XGBoost + CatBoost Ensemble</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed max-w-3xl">
          A hybrid deep-learning ensemble for urban air quality forecasting. An LSTM encoder captures temporal pollutant dynamics,
          then XGBoost and CatBoost heads perform the final regression and classification — averaged for robust predictions.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Upload size={20} className="text-primary" /> Run Inference
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <label className="flex-1 cursor-pointer">
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}>
              <FileSpreadsheet size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-semibold text-dark dark:text-white">{file ? file.name : 'Click to select CSV'}</p>
              <p className="text-xs text-gray-400 mt-1">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'or drag and drop'}</p>
            </div>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <button onClick={handleUpload} disabled={!file || loading}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {loading ? 'Processing...' : 'Predict'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3 font-medium">❌ {error}</p>}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-dark dark:text-white mb-4">Predictions ({results.row_count} rows)</h2>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-900">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">#</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">CO</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">C6H6</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">AQI</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">Category</th>
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

export default AirQualityModel;
