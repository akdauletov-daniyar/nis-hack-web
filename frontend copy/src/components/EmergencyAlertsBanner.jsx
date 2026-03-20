import React from 'react';
import { useUI } from '../context/UIContext';
import { AlertOctagon, X } from 'lucide-react';

const EmergencyAlertsBanner = () => {
  const { emergencyAlerts, dismissAlert } = useUI();

  if (!emergencyAlerts || emergencyAlerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {emergencyAlerts.map(alert => (
        <div 
          key={alert.id}
          className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-4 relative animate-in fade-in slide-in-from-top-4"
        >
          <div className="bg-red-100 p-2 rounded-full text-red-600 flex-shrink-0 animate-pulse">
            <AlertOctagon size={20} />
          </div>
          <div className="flex-1 pt-0.5">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-red-800 uppercase tracking-wider text-xs">Emergency Alert</h4>
              <span className="text-[10px] text-red-500 font-semibold bg-red-100 px-2 py-0.5 rounded-full">{alert.time}</span>
            </div>
            <p className="text-red-900 text-sm font-medium">{alert.message}</p>
          </div>
          <button 
            onClick={() => dismissAlert(alert.id)}
            className="text-red-400 hover:text-red-700 hover:bg-red-100 p-1 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default EmergencyAlertsBanner;
