import React, { useEffect, useState } from 'react';
import { Trophy, Star, Medal, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const GamificationWidget = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [points, setPoints] = useState(0);
  const [helpCount, setHelpCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase.from('profiles').select('points').eq('id', user.id).maybeSingle();
        if (profile) setPoints(profile.points || 0);

        const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('volunteer_id', user.id).eq('status', 'completed');
        setHelpCount(count || 0);
      } catch (err) {
        console.error("Error fetching gamification stats:", err);
      }
    };
    fetchStats();
  }, [user]);

  const level = Math.floor(points / 100) + 1;

  return (
    <div className="bg-dark rounded-2xl shadow-lg border border-gray-700 p-6 text-white text-center relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,96,41,0.5)] mb-3">
          <Trophy size={32} className="text-white drop-shadow-md" />
        </div>
        
        <h3 className="text-xl font-bold tracking-tight">{t('gamification_levelX').replace('{level}', level)}</h3>
        
        <div className="flex items-center gap-2 mt-4 bg-white/10 px-4 py-2 rounded-full border border-white/5">
          <Zap size={16} className="text-yellow-400" />
          <span className="font-extrabold text-lg">{points.toLocaleString()}</span>
          <span className="text-xs text-gray-300 uppercase tracking-widest font-semibold ml-1">{t('gamification_pts')}</span>
        </div>
      </div>

      <div className="relative z-10 mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <Star size={20} className="text-secondary mx-auto mb-2" />
          <div className="text-sm font-bold">{helpCount}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t('gamification_helps')}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <Medal size={20} className="text-primary mx-auto mb-2" />
          <div className="text-sm font-bold">{t('gamification_lv')}{level}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t('gamification_rank')}</div>
        </div>
      </div>
    </div>
  );
};

export default GamificationWidget;
