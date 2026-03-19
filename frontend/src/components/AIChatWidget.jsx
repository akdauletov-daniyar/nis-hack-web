import React, { useState } from 'react';
import { Bot, Send, User } from 'lucide-react';

const AIChatWidget = () => {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    // Add user message
    const newChat = [...chat, { sender: 'user', text: message }];
    setChat(newChat);
    setMessage('');
    
    // Placeholder: integrate with real AI backend at POST /api/chat
    setTimeout(() => {
      setChat(prev => [...prev, { sender: 'bot', text: 'AI service is not yet connected. Please check back later.' }]);
    }, 500);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
      <div className="p-4 border-b border-gray-100 bg-primary text-white rounded-t-2xl flex items-center gap-3">
        <Bot size={20} />
        <div>
          <h3 className="font-bold text-sm">AI Assistant</h3>
          <p className="text-[10px] text-white/80 font-medium tracking-wide border border-white/20 inline-block px-1.5 py-0.5 rounded shadow-sm opacity-90">Powered by OpenAI</p>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
        {chat.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.sender === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-primary/20 text-primary'
            }`}>
              {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${
              msg.sender === 'user' 
                ? 'bg-dark text-white rounded-tr-sm' 
                : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-100">
        <div className="relative">
          <input
            type="text"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-4 pr-12 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
            placeholder="Type your request..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 top-1.5 p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatWidget;
