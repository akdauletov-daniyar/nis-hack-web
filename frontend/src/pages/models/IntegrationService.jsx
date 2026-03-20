import React, { useState } from 'react';
import { Plug, Server, Clock, ArrowRight, Code, Loader2, Zap } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const IntegrationService = () => {
  const [formData, setFormData] = useState({
    DATE_OCC: '2024-01-15', TIME_OCC: '14:30', Lat: '34.0522', Lon: '-118.2437',
    'PT08.S1(CO)': '1200', Temperature_C: '22.5', 'RH_%': '55', Wind_Speed: '3.2',
    'C6H6(GT)': '8.5', AQI: '75',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      const headers = Object.keys(formData).join(',');
      const values = Object.values(formData).join(',');
      const blob = new Blob([`${headers}\n${values}`], { type: 'text/csv' });
      const file = new File([blob], 'sensor_event.csv', { type: 'text/csv' });
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/api/ml/air-quality/predict`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Prediction failed');
      setResult(data.predictions?.[0] || data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const fields = Object.keys(formData);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center"><Plug size={24} /></div>
          <div>
            <h1 className="text-3xl font-extrabold text-dark tracking-tight">Integration Service</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Real-Time Air Quality Inference Wrapper</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed max-w-3xl">
          A production-ready service wrapper around the Air Quality Hybrid Model. Maintains a rolling history buffer,
          auto-pads short sequences for single-event inference, and returns JSON-serializable prediction results.
        </p>
      </div>

      {/* Sensor Event Form */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Zap size={20} className="text-primary" /> Simulate Sensor Event
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            {fields.map((key) => (
              <div key={key}>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1 truncate" title={key}>{key}</label>
                <input value={formData[key]} onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-dark dark:text-white focus:ring-2 focus:ring-primary outline-none font-mono" />
              </div>
            ))}
          </div>
          <button type="submit" disabled={loading}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-alt transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {loading ? 'Processing...' : 'Predict'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3 font-medium">❌ {error}</p>}
      </div>

      {/* Prediction Result */}
      {result && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-dark dark:text-white mb-4">Prediction Result</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-xl p-4 border border-green-100 text-center">
              <p className="text-xs text-gray-500">CO</p>
              <p className="text-lg font-extrabold text-green-600">{result.predicted_co_concentration?.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-center">
              <p className="text-xs text-gray-500">C6H6</p>
              <p className="text-lg font-extrabold text-blue-600">{result.predicted_c6h6_concentration?.toFixed(4)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 text-center">
              <p className="text-xs text-gray-500">AQI</p>
              <p className="text-lg font-extrabold text-orange-600">{result.predicted_aqi}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 text-center">
              <p className="text-xs text-gray-500">Category</p>
              <p className="text-lg font-extrabold text-purple-600">{result.predicted_aqi_category}</p>
            </div>
          </div>
        </div>
      )}

      {/* Request Flow */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Server size={20} className="text-primary" /> Request Flow
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          {['Sensor Event', 'History Buffer', 'Sequence Padding', 'Model Inference', 'JSON Response'].map((step, idx) => (
            <React.Fragment key={step}>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-center min-w-[130px]">
                <p className="text-sm font-bold text-dark dark:text-white">{step}</p>
              </div>
              {idx < 4 && <ArrowRight size={16} className="text-gray-400 hidden sm:block" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Buffer Info */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Clock size={20} className="text-secondary" /> Rolling History Buffer
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-dark dark:text-white text-sm mb-1">Buffer Strategy</h3>
            <p className="text-xs text-gray-500">Fixed-size deque (window_size + horizon). New events append, oldest evicted when full.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-dark dark:text-white text-sm mb-1">Auto-Padding</h3>
            <p className="text-xs text-gray-500">Short buffers pad by duplicating the earliest row to reach minimum sequence length.</p>
          </div>
        </div>
      </div>

      {/* Response Schema */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Code size={20} className="text-green-500" /> Response Schema
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left py-2 text-gray-500 font-semibold text-xs">Field</th>
              <th className="text-left py-2 text-gray-500 font-semibold text-xs">Type</th>
              <th className="text-left py-2 text-gray-500 font-semibold text-xs">Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              { field: 'predicted_co_concentration', type: 'float', desc: 'CO level' },
              { field: 'predicted_c6h6_concentration', type: 'float', desc: 'C6H6 level' },
              { field: 'predicted_aqi', type: 'int', desc: 'Air Quality Index' },
              { field: 'predicted_aqi_category', type: 'string', desc: 'AQI category' },
            ].map((f) => (
              <tr key={f.field} className="border-b border-gray-50 dark:border-gray-800">
                <td className="py-2 font-mono text-xs font-bold text-primary">{f.field}</td>
                <td className="py-2 text-xs text-gray-500">{f.type}</td>
                <td className="py-2 text-xs text-gray-600 dark:text-gray-400">{f.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IntegrationService;
