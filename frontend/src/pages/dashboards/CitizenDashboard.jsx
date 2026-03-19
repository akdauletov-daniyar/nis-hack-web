import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRouting = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/routes/accessible-route?start=${encodeURIComponent(start)}&destination=${encodeURIComponent(destination)}`);
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      setRouteData(data);
    } catch (err) {
      alert("Error calculating route.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-dark tracking-tight">Citizen Services</h1>
        <p className="text-gray-500 mt-2 font-medium">Welcome, {user?.email}. How can we assist your mobility today?</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-dark">Accessible Route Planner</h2>
          <form onSubmit={handleRouting} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-dark mb-1 ml-1">Current Location</label>
              <input required type="text" value={start} onChange={e=>setStart(e.target.value)} placeholder="e.g. Central Park" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"/>
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark mb-1 ml-1">Destination</label>
              <input required type="text" value={destination} onChange={e=>setDestination(e.target.value)} placeholder="e.g. Metro Station 4" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"/>
            </div>
            <button disabled={loading} type="submit" className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary-alt shadow-[0_4px_14px_0_rgba(16,163,127,0.39)] hover:shadow-[0_6px_20px_rgba(16,163,127,0.23)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:hover:translate-y-0 text-sm">
              {loading ? 'Calculating via AI...' : 'Find Accessible Route'}
            </button>
          </form>

          {routeData && (
            <div className="mt-8 p-5 bg-primary/5 border border-primary/20 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-alt opacity-10 rounded-full blur-2xl"></div>
              <h3 className="font-bold text-dark mb-2">Route Overview</h3>
              <p className="text-sm text-primary font-semibold mb-2">Distance: {routeData.distance} • Est. Time: {routeData.estimated_time}</p>
              <p className="text-sm text-gray-700 mb-5">{routeData.description}</p>
              <div className="space-y-3 relative z-10">
                {routeData.route.map((node, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="min-w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</div>
                    <p className="text-sm text-dark font-medium pt-1">{node.instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-between group overflow-hidden relative">
           <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-secondary opacity-10 blur-[80px] rounded-full group-hover:opacity-20 transition-opacity duration-700"></div>
          <div>
            <h2 className="text-xl font-bold mb-4 text-dark">Request Physical Assistance</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">If you need immediate help with stairs, boarding transit, or crossing a dangerous intersection, broadcast a request to nearby vetted volunteers.</p>
          </div>
          <div>
            <button className="w-full bg-secondary/10 text-secondary font-bold py-4 rounded-xl border-2 border-secondary/20 hover:bg-secondary hover:text-white hover:shadow-[0_8px_30px_rgb(171,104,255,0.3)] hover:-translate-y-1 transition-all duration-300">
              Broadcast Help Request
            </button>
            <p className="text-xs text-center text-gray-400 mt-4 font-mono">Connecting to Volunteer Network...</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CitizenDashboard;
