import React, { useState } from 'react';
import { Car, Upload, Loader2, Zap, FileSpreadsheet, ChevronDown } from 'lucide-react';

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

const TrafficModel = () => {
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
      const res = await fetch(`${API_BASE}/api/ml/traffic/predict`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Prediction failed');
      setResults(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const levelColor = (level) => {
    if (level === 'Low') return 'bg-green-50 text-green-600 border-green-200';
    if (level === 'Medium') return 'bg-yellow-50 text-yellow-600 border-yellow-200';
    return 'bg-red-50 text-red-600 border-red-200';
  };

  const faqItems = [
    { q: 'What algorithm does this model use?', a: 'A RandomForest classifier with 400 estimators, max depth 18, and balanced class weights. It was chosen for its robustness to noisy sensor data and ability to handle heterogeneous feature types.' },
    { q: 'What congestion levels does it predict?', a: 'Three classes: Low (free-flowing traffic), Medium (moderate congestion with delays), and High (severe gridlock requiring active management).' },
    { q: 'What input features are required?', a: 'The model uses 16+ features across 4 groups: Traffic State (speed, occupancy, vehicle count), Vehicle Mix (cars, bikes, buses, trucks), Control & Context (traffic lights, weather, accidents), and Stress Signals (horn events/min, CO₂ ppm, sentiment score).' },
    { q: 'What CSV columns are expected?', a: 'Timestamp, Location_ID, Latitude, Longitude, Vehicle_Count, Traffic_Speed_kmh, Road_Occupancy_Pct, Vehicle_Count_Cars/Bikes/Buses/Trucks, Traffic_Light_State, Weather_Condition, Accident_Report, Sentiment_Score, horn_events_per_min, CO2_Emissions_ppm.' },
    { q: 'How does the preprocessing pipeline work?', a: 'Timestamps are converted to cyclic sin/cos features (hour, day-of-week) plus binary weekend/holiday flags. Numeric features get median imputation + StandardScaler. Categorical features get most-frequent imputation + OneHotEncoder.' },
    { q: 'Can I swap the model backend?', a: 'Yes — the model follows a pluggable ModelBackend protocol (fit/predict). The RandomForest can be replaced with a BiLSTM or any sequence model without changing the preprocessing pipeline or API layer.' },
    { q: 'Why use horn events and CO₂ as features?', a: 'These are novel proxy signals for congestion severity. Horn frequency correlates with driver frustration in gridlock, while CO₂ spikes indicate stop-and-go traffic patterns that speed alone might miss.' },
    { q: 'What if the model artifact is missing?', a: 'The endpoint returns a 503 error with instructions to train and save the model first. The artifact should be at backend/artifacts/traffic_congestion_model.joblib.' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center"><Car size={24} /></div>
          <div>
            <h1 className="text-3xl font-extrabold text-dark tracking-tight">Traffic Congestion Model</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">RandomForest Classifier with Pluggable Backend</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed max-w-3xl">
          Multi-class congestion classifier using a RandomForest ensemble. Ingests real-time traffic metrics including
          vehicle counts, speeds, road occupancy, weather, acoustic stress (horn events), and CO₂ levels to predict Low / Medium / High congestion.
        </p>
      </div>

      {/* Upload */}
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
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">Row</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold text-xs">Predicted Congestion</th>
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

export default TrafficModel;
