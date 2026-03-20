import React from 'react';
import { useAuth } from '../../context/AuthContext';
import MapRoutingWidget from '../../components/MapRoutingWidget';

const CitizenDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-dark tracking-tight">Citizen Services</h1>
        <p className="text-gray-500 mt-2 font-medium">Welcome, {user?.email}. How can we assist your mobility today?</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <MapRoutingWidget />
        </div>

        <div className="space-y-8">
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
    </div>
  );
};
export default CitizenDashboard;
