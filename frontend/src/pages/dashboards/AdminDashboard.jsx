import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Users, AlertTriangle, ShieldCheck, Activity, MapPin } from 'lucide-react';
import { getPublicEnv } from '../../lib/env';
import { useLanguage } from '../../context/LanguageContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const googleMapsApiKey = getPublicEnv('VITE_GOOGLE_CLOUD_API');
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    volunteers: 0,
    events: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState('New York, NY');

  const handleLocateMap = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter(`${position.coords.latitude},${position.coords.longitude}`);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Could not fetch location. Please ensure location services are enabled.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: volCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'volunteer');
        const { count: eventCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true });
        
        setMetrics({
          totalUsers: userCount || 0,
          volunteers: volCount || 0,
          events: eventCount || 0
        });

        // Fetch recent incidents for the activity feed
        const { data: incidents } = await supabase
          .from('incidents')
          .select('id, title, status, urgency, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (incidents) {
          setRecentActivity(incidents.map(inc => ({
            time: new Date(inc.created_at).toLocaleString(),
            type: inc.urgency === 'critical' || inc.urgency === 'high' ? 'emergency' : 'system',
            text: inc.title,
            user: `${t('admin_status')}${inc.status}`
          })));
        }
      } catch (err) {
        console.error("Error syncing DB metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-dark tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-primary w-8 h-8" />
            {t('admin_title')}
          </h1>
          <p className="text-gray-500 mt-2 font-medium">{t('admin_subtitle')}</p>
        </div>
        <div className="px-4 py-2 bg-green-50 text-green-600 font-bold rounded-xl border border-green-200 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse relative">
             <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></span>
          </span> {t('admin_platformActive')}
        </div>
      </header>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-sm">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('admin_totalUsers')}</p>
            <h2 className="text-3xl font-extrabold text-dark">{loading ? '...' : metrics.totalUsers.toLocaleString()}</h2>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center shadow-sm">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('admin_activeVolunteers')}</p>
            <h2 className="text-3xl font-extrabold text-dark">{loading ? '...' : metrics.volunteers.toLocaleString()}</h2>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-sm">
            <AlertTriangle size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('admin_liveEvents')}</p>
            <h2 className="text-3xl font-extrabold text-dark">{loading ? '...' : metrics.events.toLocaleString()}</h2>
          </div>
        </div>
      </div>

      {/* MAP & EVENT LOG SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
             <h3 className="font-bold text-dark flex items-center gap-2">
                <MapPin size={18} className="text-secondary" />
                {t('admin_liveMap')}
             </h3>
             <span className="text-xs bg-dark text-white px-2 py-1 rounded font-bold uppercase tracking-wider">{t('admin_tracking')} {metrics.events} {t('admin_active')}</span>
          </div>
          <div className="flex-1 relative">
            <button
               onClick={handleLocateMap}
               className="absolute z-10 bottom-6 right-6 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg text-dark dark:text-white border border-gray-100 dark:border-gray-700 hover:text-primary dark:hover:text-primary transition-all focus:outline-none hover:scale-110 flex items-center justify-center group"
               title={t('routing_moveToLoc')}
            >
               <MapPin size={22} className="group-hover:animate-bounce" />
            </button>
            <iframe
              title="Admin Live Map Overview"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(mapCenter)}`}
            ></iframe>
          </div>
        </div>

        {/* Live Event Feed */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
             <h3 className="font-bold text-dark">{t('admin_recentFeed')}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {recentActivity.length === 0 && !loading ? (
               <div className="text-center py-16">
                 <p className="text-gray-400 font-medium">{t('admin_noRecentActivity')}</p>
               </div>
             ) : recentActivity.map((log, idx) => (
                <div key={idx} className="flex gap-3 bg-gray-50 border border-gray-100 p-3 rounded-xl border-l-4 border-l-primary hover:bg-gray-100 transition">
                  <div className="mt-1">
                     {log.type === 'emergency' ? <AlertTriangle size={16} className="text-red-500" /> : <Activity size={16} className="text-primary" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-dark">{log.text}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-gray-500">{log.user}</span>
                      <span className="text-[10px] text-gray-400">&bull; {log.time}</span>
                    </div>
                  </div>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
