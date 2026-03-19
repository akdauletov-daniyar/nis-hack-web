import React, { useState } from 'react';
import { Car, TreeDeciduous, Gauge, AlertTriangle, Layers, Upload, Loader2, Zap, FileSpreadsheet } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const TrafficModel = () => {
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
    { level: 'Low', color: 'bg-green-50 text-green-600 border-green-100', desc: 'Free-flowing traffic' },
    { level: 'Medium', color: 'bg-yellow-50 text-yellow-600 border-yellow-100', desc: 'Moderate congestion' },
    { level: 'High', color: 'bg-red-50 text-red-600 border-red-100', desc: 'Severe congestion / gridlock' },
  ];

  const featureGroups = [
    { group: 'Traffic State', features: ['Traffic_Speed_kmh', 'Road_Occupancy_Pct', 'Vehicle_Count'], color: 'text-blue-500' },
    { group: 'Vehicle Mix', features: ['Vehicle_Count_Cars', 'Bikes', 'Buses', 'Trucks'], color: 'text-purple-500' },
    { group: 'Control & Context', features: ['Traffic_Light_State', 'Weather_Condition', 'Accident_Report'], color: 'text-orange-500' },
    { group: 'Stress Signals', features: ['horn_events_per_min', 'CO2_Emissions_ppm', 'Sentiment_Score'], color: 'text-red-500' },
  ];

  const rfParams = [
    { label: 'Estimators', value: '400' },
    { label: 'Max Depth', value: '18' },
    { label: 'Min Samples Leaf', value: '1' },
    { label: 'Class Weight', value: 'Balanced' },
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
            <h1 className="text-3xl font-extrabold text-dark tracking-tight">Traffic Congestion Model</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">RandomForest Classifier with Pluggable Backend</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed max-w-3xl">
          Multi-class congestion classifier using a RandomForest ensemble. Ingests real-time traffic metrics including 
          vehicle counts, speeds, road occupancy, weather, acoustic stress (horn events), and CO2 levels to predict Low / Medium / High congestion.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Upload size={20} className="text-primary" /> Run Inference
        </h2>
        <p className="text-xs text-gray-500 mb-4">Upload a CSV with columns: Timestamp, Location_ID, Latitude, Longitude, Vehicle_Count, Traffic_Speed_kmh, Road_Occupancy_Pct, Vehicle_Count_Cars/Bikes/Buses/Trucks, Traffic_Light_State, Weather_Condition, Accident_Report, Sentiment_Score, horn_events_per_min, CO2_Emissions_ppm</p>
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <label className="flex-1 cursor-pointer">
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}>
              <FileSpreadsheet size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-semibold text-dark dark:text-white">{file ? file.name : 'Click to select CSV'}</p>
              <p className="text-xs text-gray-400 mt-1">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'or drag and drop'}</p>
            </div>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {loading ? 'Processing...' : 'Predict'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3 font-medium">❌ {error}</p>}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-dark dark:text-white mb-4">
            Predictions ({results.row_count} rows)
          </h2>
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

      {/* Congestion Classes */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Gauge size={20} className="text-primary" /> Congestion Levels
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
          <Layers size={20} className="text-secondary" /> Input Feature Groups
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
          <TreeDeciduous size={20} className="text-green-500" /> RandomForest Backend
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
          <AlertTriangle size={20} className="text-yellow-500" /> Pluggable Design
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          The model backend follows a simple <code className="text-primary font-mono text-xs">ModelBackend</code> protocol 
          (<code className="text-primary font-mono text-xs">fit</code> / <code className="text-primary font-mono text-xs">predict</code>). 
          The RandomForest can be swapped with a BiLSTM or any sequence model without touching the preprocessing pipeline or API layer.
        </p>
      </div>
    </div>
  );
};

export default TrafficModel;
