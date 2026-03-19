import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [isSTTActive, setIsSTTActive] = useState(false);
  
  // Mock Emergency Alerts state
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);

  const toggleTTS = () => {
    setIsTTSActive(prev => !prev);
    // In a real app, this would initialize a screen reader / TTS API
  };

  const toggleSTT = () => {
    setIsSTTActive(prev => !prev);
    // In a real app, this would request microphone permissions and start Web Speech API
  };
  
  const dismissAlert = (id) => {
    setEmergencyAlerts(alerts => alerts.filter(alert => alert.id !== id));
  };

  return (
    <UIContext.Provider value={{ 
      isTTSActive, 
      isSTTActive, 
      toggleTTS, 
      toggleSTT,
      emergencyAlerts,
      dismissAlert
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);
