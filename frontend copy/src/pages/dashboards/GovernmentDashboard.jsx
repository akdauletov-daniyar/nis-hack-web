import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const GovernmentDashboard = () => {
  const [zone, setZone] = useState('Downtown Core');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeCount, setRouteCount] = useState(0);
  const [volunteerCount, setVolunteerCount] = useState(0);

  useEffect(() => {
    const fetchCityMetrics = async () => {
      try {
        const { count: routes } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('accessibility_related', true);
        const { count: vols } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'volunteer');
        setRouteCount(routes || 0);
        setVolunteerCount(vols || 0);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCityMetrics();
  }, []);

  const pullAnalytics = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/routes/predict-traffic?city_zone=${encodeURIComponent(zone)}`);
      const data = await res.json();
      setPrediction(data);
    } catch {
      alert("Error fetching insights.");
    } finally {
      setLoading(false);
    }
  };

  const maxRoutes = Math.max(routeCount, 1);
  const routePct = Math.min(Math.round((routeCount / maxRoutes) * 100), 100);
  const volCapPct = volunteerCount > 0 ? Math.min(volunteerCount * 10, 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="mb-8 p-8 bg-dark rounded-3xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">City Intelligence Hub</h1>
          <p className="text-gray-400 font-medium">AI-Driven Infrastructure & Mobility Analytics</p>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-dark flex items-center gap-2">
            <span className="w-2 h-6 bg-secondary rounded block"></span>
            Traffic Optimization Agent
          </h2>
          <form onSubmit={pullAnalytics} className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <input value={zone} onChange={e=>setZone(e.target.value)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition" placeholder="Enter City Zone..."/>
              <button disabled={loading} type="submit" className="px-6 py-3 bg-secondary text-white font-bold rounded-xl hover:opacity-90 transition shadow-lg shadow-secondary/30 hover:-translate-y-0.5">
                {loading ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </div>
          </form>

          {prediction && (
            <div className="p-6 border border-gray-100 bg-gray-50 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-dark text-lg">{prediction.zone}</h3>
                <span className="px-3 py-1 bg-white border border-gray-200 text-dark font-mono text-xs font-bold rounded-lg shadow-sm">Conf: {prediction.confidence * 100}%</span>
              </div>
              <p className="text-gray-700 mb-4">{prediction.prediction}</p>
              <div className="bg-white p-4 rounded-xl border-l-4 border-secondary shadow-sm text-sm text-gray-800">
                <span className="font-bold text-secondary block mb-1">AI Recommendation:</span>
                {prediction.recommendation}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
          <h2 className="text-xl font-bold mb-6 text-dark flex items-center gap-2">
             <span className="w-2 h-6 bg-primary rounded block"></span>
             Live City Metrics
          </h2>
          <div className="space-y-8 mt-6">
            <div>
              <div className="flex justify-between text-sm mb-2 font-bold"><span className="text-gray-600">Accessible Routes Reported</span> <span className="text-dark">{routeCount.toLocaleString()}</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-primary h-2 rounded-full transition-all duration-500" style={{width: `${routePct}%`}}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2 font-bold"><span className="text-gray-600">Volunteer Network Size</span> <span className="text-dark">{volunteerCount}</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-primary-alt h-2 rounded-full transition-all duration-500" style={{width: `${volCapPct}%`}}></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default GovernmentDashboard;
