import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight } from './Icons';
import { streamChatMessage } from '../services/geminiService';
import { ChatMessage } from '../types';

export const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hi! I\'m your booth partner. I can explain complex concepts and suggest collocations. \n\nTry asking: "What is the difference between AC and DC charging?"', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const stream = streamChatMessage(history, userMsg.text);
      
      let botResponse = '';
      const botMsgId = (Date.now() + 1).toString();
      
      // Add empty bot message placeholder
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '', timestamp: Date.now() }]);

      for await (const chunk of stream) {
        botResponse += chunk;
        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: botResponse } : m));
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I lost connection. Please try again.", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></span>
          Context Assistant
        </h3>
        <p className="text-xs text-gray-400 mt-1">AI Booth Partner (Gemini 2.5)</p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-orange-500 text-white rounded-br-sm shadow-md' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-1.5 rounded-bl-sm">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></div>
             </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="relative shadow-sm rounded-2xl">
          <textarea 
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask definitions or context..."
            className="w-full bg-gray-100 text-sm rounded-2xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all resize-none text-gray-800 placeholder-gray-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 bottom-2 bg-orange-500 text-white rounded-xl px-3 hover:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};