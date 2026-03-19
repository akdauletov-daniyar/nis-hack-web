import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const EmergencyDashboard = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Post alert mock logic
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchAlerts();
    const subscription = supabase
      .channel('alerts-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, payload => {
        fetchAlerts();
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchAlerts = async () => {
    try {
      // Typically we'd fetch from backend, but direct supabase read is faster for real-time React displays
      const { data, error } = await supabase.from('emergency_alerts').select('*').eq('status', 'active').order('created_at', { ascending: false });
      if (data) setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostAlert = async (e) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('http://127.0.0.1:8000/api/alerts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ title, description, lat: 45.0, lng: -12.0 })
      });
      if (!res.ok) throw new Error("Failed to post");
      setTitle('');
      setDescription('');
    } catch (err) {
      alert("Error pushing alert.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-red-700 tracking-tight">112 Emergency Protocol</h1>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-red-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
              Active Critical Alerts ({alerts.length})
            </h2>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {alerts.length === 0 ? <p className="text-gray-500 italic">No active emergencies tracked.</p> : alerts.map(a => (
                <div key={a.id} className="p-5 border border-red-100 bg-red-50/50 rounded-xl flex justify-between items-center group">
                  <div>
                    <h3 className="font-bold text-red-900 text-lg">{a.title}</h3>
                    <p className="text-sm text-red-800 mt-1">{a.description}</p>
                    <p className="text-xs text-red-600 font-mono mt-2">ID: {a.id} • {new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <button className="px-4 py-2 bg-white text-red-700 border border-red-200 font-medium rounded shadow-sm hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
                    Dispatch
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-900 border-b pb-2">Manual Dispatch Entry</h2>
            <form onSubmit={handlePostAlert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Situation Title</label>
                <input required value={title} onChange={e=>setTitle(e.target.value)} type="text" className="w-full px-3 py-2 border rounded-md text-sm focus:ring-red-500 focus:border-red-500" placeholder="e.g. Traffic Collision" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                <textarea required value={description} onChange={e=>setDescription(e.target.value)} rows="3" className="w-full px-3 py-2 border rounded-md text-sm focus:ring-red-500 focus:border-red-500" placeholder="Describe the emergency..."></textarea>
              </div>
              <button type="submit" className="w-full bg-red-600 text-white font-medium py-2 rounded shadow hover:bg-red-700 transition">Broadcast Alert</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
export default EmergencyDashboard;
