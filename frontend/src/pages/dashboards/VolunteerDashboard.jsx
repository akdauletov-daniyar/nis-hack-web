import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import GamificationWidget from '../../components/GamificationWidget';
import { useLanguage } from '../../context/LanguageContext';

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    fetchTasks();
    fetchPoints();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (!error && data) setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPoints = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('profiles').select('points').eq('id', user.id).maybeSingle();
      if (data) setPoints(data.points || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const level = Math.floor(points / 100) + 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end mb-8 bg-primary/5 p-8 rounded-3xl border border-primary/10">
        <div>
          <h1 className="text-3xl font-extrabold text-dark tracking-tight">{t('vol_title')}</h1>
          <p className="text-primary-alt mt-2 font-semibold">
            {t('vol_pointsLevel').replace('{points}', points).replace('{level}', level)}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 text-sm bg-white px-5 py-2.5 rounded-xl font-bold text-primary shadow-sm border border-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          {t('vol_activeSearching')}
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-dark">
            {loading ? t('vol_scanning') : `${tasks.length} ${t('vol_activeReqs')}`}
          </h2>
          
          {tasks.length === 0 && !loading ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
                <span className="text-4xl">🕊️</span>
              </div>
              <p className="text-gray-500 font-medium">{t('vol_noActiveReqs')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl border border-gray-100 bg-white hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  <div>
                    <h3 className="font-bold text-dark text-lg group-hover:text-primary transition-colors">{task.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{task.description || t('vol_assistanceAsap')}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-bold rounded-md uppercase tracking-widest">{task.status}</span>
                      <span className="text-xs text-gray-400 font-medium">{new Date(task.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <button className="mt-5 sm:mt-0 px-6 py-2.5 bg-dark text-white text-sm font-bold rounded-xl hover:bg-primary shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto">
                    {t('vol_acceptMapRoute')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <GamificationWidget />
        </div>
      </div>
    </div>
  );
};
export default VolunteerDashboard;
