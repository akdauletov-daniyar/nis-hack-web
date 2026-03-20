import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const EmergencyDashboard = () => {
  const { user } = useAuth();
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [dispatchedAlerts, setDispatchedAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Accident Self-report state
  const [formData, setFormData] = useState({
    category: 'Traffic Accident',
    location: '',
    datetime: new Date().toISOString().slice(0, 16),
    severity: 'Medium',
    impacts: [],
    details: '',
    visualEvidence: null,
    reporterName: '',
    reporterContact: '',
    isAnonymous: false
  });

  const categories = ['Traffic Accident', 'Road Construction', 'Pothole', 'Fallen Tree', 'Flooding', 'Public Event'];
  const impactsList = ['Lanes Blocked', 'Sidewalk Closed', 'Power Outage', 'Heavy Traffic', 'Loud Noise', 'Hazard to Pedestrians'];

  useEffect(() => {
    fetchAlerts();
    const subscription = supabase
      .channel('critical-events-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, () => {
        fetchAlerts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data: alertsData } = await supabase
        .from('emergency_alerts')
        .select('*')
        .in('status', ['active', 'dispatched']);
        
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .in('lifecycle', ['active', 'resolving'])
        .or('impact_level.eq.3,category.eq.emergency');

      const combined = [];
      
      if (alertsData) {
        combined.push(...alertsData.map(a => ({
          ...a,
          sourceType: 'alert',
          displayTitle: a.title,
        })));
      }
      
      if (eventsData) {
        combined.push(...eventsData.map(e => ({
          ...e,
          sourceType: 'event',
          displayTitle: `${e.category === 'emergency' ? '🚨' : '⚠️'} ${e.name}`,
        })));
      }

      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setActiveAlerts(combined.filter(a => a.sourceType === 'alert' ? a.status === 'active' : a.lifecycle === 'active'));
      setDispatchedAlerts(combined.filter(a => a.sourceType === 'alert' ? a.status === 'dispatched' : a.lifecycle === 'resolving'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (id, sourceType) => {
    if (window.confirm("Confirm dispatcher assignment for this emergency?")) {
      try {
        if (sourceType === 'alert') {
          await supabase.from('emergency_alerts').update({ status: 'dispatched' }).eq('id', id);
        } else {
          await supabase.from('events').update({ lifecycle: 'resolving' }).eq('id', id);
        }
        fetchAlerts();
      } catch (err) {
        console.error("Error dispatching:", err);
      }
    }
  };

  const getLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev, 
          location: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
        }));
      }, (error) => {
        alert("Failed to get location from browser.");
      });
    }
  };

  const handleImpactChange = (impact) => {
    setFormData(prev => ({
      ...prev,
      impacts: prev.impacts.includes(impact) 
        ? prev.impacts.filter(i => i !== impact)
        : [...prev.impacts, impact]
    }));
  };

  const handlePostAlert = async (e) => {
    e.preventDefault();
    try {
      // Hidden properties
      const hiddenData = {
        devicePlatform: navigator.userAgent,
        reportStatus: 'Pending Verification',
        upvotes: 0,
        downvotes: 0
      };

      const { data: { session } } = await supabase.auth.getSession();
      
      let lat = 45.0;
      let lng = -12.0;
      if (formData.location.includes(',')) {
        const parts = formData.location.split(',');
        lat = parseFloat(parts[0].trim()) || 45.0;
        lng = parseFloat(parts[1].trim()) || -12.0;
      }

      const res = await fetch('http://127.0.0.1:8000/api/alerts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ 
          title: `[${formData.severity}] ${formData.category} at ${formData.location || 'Unknown'}`, 
          description: formData.details || formData.category, 
          lat, 
          lng,
          metadata: { ...formData, ...hiddenData }
        })
      });
      if (!res.ok) throw new Error("Failed to post");
      
      alert("Report submitted successfully.");
      setFormData({
        category: 'Traffic Accident', location: '', datetime: new Date().toISOString().slice(0, 16),
        severity: 'Medium', impacts: [], details: '', visualEvidence: null,
        reporterName: '', reporterContact: '', isAnonymous: false
      });
    } catch (err) {
      alert("Error pushing alert.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-red-700 tracking-tight">Emergencies</h1>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-red-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
              Active Critical Alerts ({activeAlerts.length})
            </h2>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {activeAlerts.length === 0 ? <p className="text-gray-500 italic">No active emergencies tracked.</p> : activeAlerts.map(a => (
                <div key={`${a.sourceType}-${a.id}`} className="p-5 border border-red-100 bg-red-50/50 rounded-xl flex justify-between items-center group">
                  <div>
                    <h3 className="font-bold text-red-900 text-lg">{a.displayTitle || a.title}</h3>
                    <p className="text-sm text-red-800 mt-1">{a.description}</p>
                    <p className="text-xs text-red-600 font-mono mt-2 flex items-center gap-2">
                       <span>{new Date(a.created_at).toLocaleString()}</span>
                       <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">{a.sourceType}</span>
                    </p>
                  </div>
                  <button onClick={() => handleDispatch(a.id, a.sourceType)} className="px-4 py-2 bg-white text-red-700 border border-red-200 font-medium rounded shadow-sm hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
                    Dispatch
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
              Dispatched / Resolving ({dispatchedAlerts.length})
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {dispatchedAlerts.map(a => (
                <div key={`${a.sourceType}-${a.id}`} className="p-4 border border-gray-200 bg-white rounded-xl flex justify-between items-center opacity-70">
                  <div>
                    <h3 className="font-bold text-gray-800">{a.displayTitle || a.title}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-1">Dispatched teams on site</p>
                  </div>
                </div>
              ))}
              {dispatchedAlerts.length === 0 && <p className="text-gray-400 italic text-sm">No recently dispatched units.</p>}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-900 border-b pb-2">Accident Self-report</h2>
            <form onSubmit={handlePostAlert} className="space-y-5">
              
              {/* Event Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Category *</label>
                <select 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md text-sm focus:ring-red-500 focus:border-red-500 bg-white"
                  required
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Precise Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precise Location *</label>
                <div className="flex gap-2">
                  <input 
                    required 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                    type="text" 
                    className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-red-500 focus:border-red-500" 
                    placeholder="Address, intersection, or GPS pin..." 
                  />
                  <button type="button" onClick={getLocation} className="px-3 bg-gray-100 border border-gray-300 rounded-md text-sm font-semibold hover:bg-gray-200" title="Get GPS Location">📍</button>
                </div>
              </div>

              {/* Date and Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date and Time of Observation *</label>
                <input 
                  required 
                  value={formData.datetime} 
                  onChange={e => setFormData({...formData, datetime: e.target.value})} 
                  type="datetime-local" 
                  className="w-full px-3 py-2 border rounded-md text-sm focus:ring-red-500 focus:border-red-500" 
                />
              </div>

              {/* Severity Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity / Urgency Level *</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {['Low', 'Medium', 'High', 'Critical'].map(level => (
                    <label key={level} className={`cursor-pointer border rounded-md text-center text-xs font-bold py-2 ${formData.severity === level ? (level === 'Critical' || level === 'High' ? 'bg-red-600 text-white border-red-600' : 'bg-primary text-white border-primary') : 'bg-gray-50 text-gray-600'}`}>
                      <input 
                        type="radio" 
                        name="severity" 
                        className="hidden" 
                        value={level} 
                        checked={formData.severity === level} 
                        onChange={e => setFormData({...formData, severity: e.target.value})} 
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </div>

              {/* Impact on Surroundings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Impact on Surroundings</label>
                <div className="grid grid-cols-2 gap-2">
                  {impactsList.map(impact => (
                    <label key={impact} className="flex items-center text-xs text-gray-600 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="mr-2 rounded text-red-600 focus:ring-red-500" 
                        checked={formData.impacts.includes(impact)} 
                        onChange={() => handleImpactChange(impact)}
                      />
                      {impact}
                    </label>
                  ))}
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
                <textarea 
                  value={formData.details} 
                  onChange={e => setFormData({...formData, details: e.target.value})} 
                  rows="3" 
                  className="w-full px-3 py-2 border rounded-md text-sm focus:ring-red-500 focus:border-red-500" 
                  placeholder="Optional context (e.g. leaking fluids, waiting for tow)..."
                ></textarea>
              </div>

              {/* Visual Evidence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visual Evidence</label>
                <input 
                  type="file" 
                  accept="image/*,video/*"
                  onChange={e => setFormData({...formData, visualEvidence: e.target.files[0]})} 
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 border border-gray-200 rounded-md p-1"
                />
              </div>

              {/* Reporter Info */}
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-gray-800">Reporter Information</label>
                  <label className="flex items-center text-xs text-gray-600 font-medium cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mr-1.5 rounded text-red-600 focus:ring-red-500"
                      checked={formData.isAnonymous}
                      onChange={e => setFormData({...formData, isAnonymous: e.target.checked})}
                    />
                    Submit Anonymously
                  </label>
                </div>
                {!formData.isAnonymous && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                    <input 
                      type="text" 
                      placeholder="Your Name" 
                      value={formData.reporterName}
                      onChange={e => setFormData({...formData, reporterName: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-red-500 focus:border-red-500" 
                    />
                    <input 
                      type="text" 
                      placeholder="Email or Phone (optional)" 
                      value={formData.reporterContact}
                      onChange={e => setFormData({...formData, reporterContact: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-red-500 focus:border-red-500" 
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 mt-4 rounded-xl shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] hover:bg-red-700 hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] hover:-translate-y-0.5 transition-all duration-200">
                Submit Report
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
export default EmergencyDashboard;
