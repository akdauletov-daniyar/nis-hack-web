import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useUI } from '../context/UIContext';

const AccessibilityControls = () => {
  const { isTTSActive, toggleTTS, isSTTActive, toggleSTT } = useUI();

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
      <button
        onClick={toggleTTS}
        title="Toggle Text-to-Speech"
        className={`p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 flex items-center justify-center ${
          isTTSActive ? 'bg-primary text-white' : 'bg-white text-dark shadow-gray-200'
        }`}
      >
        {isTTSActive ? <Volume2 size={24} /> : <VolumeX size={24} />}
      </button>

      <button
        onClick={toggleSTT}
        title="Toggle Speech-to-Text"
        className={`p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 flex items-center justify-center ${
          isSTTActive ? 'bg-red-500 text-white' : 'bg-white text-dark shadow-gray-200'
        }`}
      >
        {isSTTActive ? <Mic size={24} /> : <MicOff size={24} />}
      </button>
    </div>
  );
};

export default AccessibilityControls;
