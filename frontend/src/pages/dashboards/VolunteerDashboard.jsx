import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const VolunteerDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end mb-8 bg-gradient-to-r from-primary/10 to-transparent p-8 rounded-3xl border border-primary/10">
        <div>
          <h1 className="text-3xl font-extrabold text-dark tracking-tight">Volunteer Hub</h1>
          <p className="text-primary-alt mt-2 font-semibold">Your Impact: 450 Points (Level 2)</p>
        </div>
        <div className="mt-4 sm:mt-0 text-sm bg-white px-5 py-2.5 rounded-xl font-bold text-primary shadow-sm border border-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Active & Searching
        </div>
      </header>
      
      <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-dark">
          {loading ? 'Scanning...' : `${tasks.length} Active Requests Nearby`}
        </h2>
        
        {tasks.length === 0 && !loading ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
              <span className="text-4xl">🕊️</span>
            </div>
            <p className="text-gray-500 font-medium">No active assistance requests in your area.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <div key={task.id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl border border-gray-100 bg-white hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                <div>
                  <h3 className="font-bold text-dark text-lg group-hover:text-primary transition-colors">{task.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{task.description || 'Assistance needed ASAP.'}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-bold rounded-md uppercase tracking-widest">{task.status}</span>
                    <span className="text-xs text-gray-400 font-medium">{new Date(task.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button className="mt-5 sm:mt-0 px-6 py-2.5 bg-dark text-white text-sm font-bold rounded-xl hover:bg-primary shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto">
                  Accept & Map Route
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default VolunteerDashboard;
