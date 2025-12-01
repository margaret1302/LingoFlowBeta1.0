import React, { useState, useEffect, useRef } from 'react';
import { Term } from '../types';
import { X, RotateCw, Volume2 } from './Icons';

interface RapidFireProps {
  terms: Term[];
  onExit: () => void;
}

export const RapidFire: React.FC<RapidFireProps> = ({ terms, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [countdown, setCountdown] = useState(3); // Start countdown
  const [progress, setProgress] = useState(100);
  
  const INTERVAL_MS = 5000; // 5 seconds per word
  const timerRef = useRef<number>();
  const progressRef = useRef<number>();
  
  const currentTerm = terms[currentIndex];

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Initial countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsPlaying(true);
    }
  }, [countdown]);

  // Drill logic
  useEffect(() => {
    if (!isPlaying || !currentTerm) return;

    // Reset state for new card
    setRevealed(false);
    setProgress(100);
    
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / INTERVAL_MS) * 100);
      setProgress(remaining);

      if (remaining > 0) {
        progressRef.current = requestAnimationFrame(animate);
      } else {
        // Time's up
        setRevealed(true);
        speak(currentTerm.chinese);
        
        // Wait a bit then move to next
        timerRef.current = window.setTimeout(() => {
          if (currentIndex < terms.length - 1) {
            setCurrentIndex(prev => prev + 1);
          } else {
            setIsPlaying(false); // End of drill
          }
        }, 1500); // 1.5s delay to see the answer
      }
    };

    progressRef.current = requestAnimationFrame(animate);

    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, currentTerm, terms.length]);

  if (countdown > 0) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-light mb-8">Get Ready</h2>
        <div className="text-9xl font-bold text-orange-500 animate-pulse">{countdown}</div>
      </div>
    );
  }

  if (!isPlaying && currentIndex >= terms.length - 1 && revealed) {
     return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center text-white p-8">
        <h2 className="text-4xl font-bold text-green-400 mb-4">Session Complete!</h2>
        <p className="text-xl text-gray-300 mb-8">You drilled {terms.length} terms.</p>
        <div className="flex gap-4">
           <button onClick={() => { setCurrentIndex(0); setCountdown(3); }} className="px-8 py-3 bg-orange-500 rounded-full font-bold hover:bg-orange-600 transition">Again</button>
           <button onClick={onExit} className="px-8 py-3 border border-gray-600 rounded-full font-bold hover:bg-gray-800 transition">Exit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-6">
        <div className="text-gray-400 font-mono text-sm">
          TERM {currentIndex + 1} / {terms.length}
        </div>
        <button onClick={onExit} className="text-white hover:text-orange-500 transition">
          <X className="w-8 h-8" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {/* The Word */}
        <h1 className="text-5xl md:text-7xl font-bold text-white text-center mb-12 tracking-tight">
          {currentTerm.english}
        </h1>

        {/* The Answer (Fade In) */}
        <div className={`transition-opacity duration-300 flex items-center gap-3 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-3xl md:text-5xl font-medium text-orange-400">
            {currentTerm.chinese}
          </p>
          <Volume2 className="w-6 h-6 text-orange-400" />
        </div>
        
        {/* Progress Bar Container */}
        <div className="absolute top-1/2 left-8 right-8 md:left-24 md:right-24 h-1 bg-gray-800 rounded-full overflow-hidden transform -translate-y-1/2 -z-10 opacity-30"></div>
        
        {/* Active Progress Bar */}
        <div className="absolute bottom-20 left-12 right-12 md:left-1/4 md:right-1/4 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
        </div>
        
         <div className="absolute bottom-12 text-gray-500 text-xs uppercase tracking-widest">
            Sight Translation Mode
        </div>
      </div>
    </div>
  );
};
