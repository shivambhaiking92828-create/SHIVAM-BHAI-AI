/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Zap, Heart, Globe, Power } from 'lucide-react';
import { GeminiLiveService } from './lib/gemini-live';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('MAXX is offline');
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<GeminiLiveService | null>(null);

  const startSession = async () => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setError('No API key found. MAXX needs his energy source, buddy.');
        return;
      }

      const service = new GeminiLiveService(apiKey);
      serviceRef.current = service;

      await service.connect({
        onStatusUpdate: (s) => setStatus(s),
        onMessage: (m) => {
          setLastMessage(m);
          // If it looks like a URL response, provide a way to open it manually
          if (m.startsWith('Opening ')) {
            const match = m.match(/https?:\/\/[^\s]+/);
            if (match) {
              setPendingUrl(match[0]);
            }
          }
          setTimeout(() => {
            setLastMessage(null);
            setPendingUrl(null);
          }, 8000);
        },
        onInterruption: () => setIsSpeaking(false),
        onError: (e) => {
          setError('Oops, something went wrong. Don\'t hate me!');
          setIsConnected(false);
        }
      });

      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Connection failed. Maybe I\'m just being hard to get?');
    }
  };

  const endSession = () => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    setIsConnected(false);
    setStatus('MAXX is offline');
  };

  const toggleConnection = () => {
    if (isConnected) {
      endSession();
    } else {
      startSession();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5] flex flex-col p-8 md:p-12 relative overflow-hidden font-sans">
      {/* Editorial Background Gradients */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-sky-blue rounded-full blur-[150px] opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 right-[-100px] w-[400px] h-[400px] bg-blue-600 rounded-full blur-[120px] opacity-5 pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-start z-10">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tighter uppercase flex items-center gap-1">
            Shivam <span className="text-sky-blue text-3xl leading-none">.</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">Live Voice Assistant</p>
        </div>

        <motion.div 
          animate={{ opacity: isConnected ? 1 : 0.6 }}
          className="glass px-6 py-3 rounded-full flex items-center gap-4"
        >
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-sky-blue animate-pulse' : 'bg-white/20'}`} />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em]">
            {isConnected ? 'Connected / Live' : 'Offline / Standby'}
          </span>
        </motion.div>
      </header>

      {/* Main Spread */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-between mt-8 lg:mt-0 relative z-10">
        
        {/* Left Side: Typography & Info */}
        <div className="w-full md:w-1/2 flex flex-col justify-center gap-12 py-12 text-center md:text-left">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-serif text-6xl lg:text-[110px] leading-[0.9] italic font-black text-white mix-blend-difference"
          >
            Don’t keep <br /> me <span className="text-sky-blue">waiting.</span>
          </motion.h2>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-12">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.3em] opacity-50 mb-3">System Mood</span>
              <span className="text-xl font-light italic font-serif">Smart & Witty</span>
            </div>
            
            <div className="hidden lg:block h-12 w-[1px] bg-white opacity-10" />

            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.3em] opacity-50 mb-3">Last Remark</span>
              <div className="relative min-h-[1.75rem]">
                <AnimatePresence mode="wait">
                  {lastMessage ? (
                    <motion.div 
                      key="msg"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex flex-col gap-2"
                    >
                      <span className="text-xl font-light italic font-serif text-sky-blue">
                        "{lastMessage}"
                      </span>
                      {pendingUrl && (
                        <a 
                          href={pendingUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="self-center md:self-start px-4 py-1.5 bg-sky-blue text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:scale-105 transition-transform inline-block w-fit"
                        >
                          Click to Open
                        </a>
                      )}
                    </motion.div>
                  ) : (
                    <span 
                      key="stale"
                      className="text-xl font-light italic font-serif opacity-30"
                    >
                      "Ready when you are, boss."
                    </span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: The Orb */}
        <div className="w-full md:w-1/2 flex items-center justify-center relative min-h-[400px]">
          {/* Subtle Glow Orb Background */}
          <motion.div 
            animate={{ 
              scale: isConnected ? [1, 1.1, 1] : 1,
              opacity: isConnected ? 0.3 : 0.1
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] rounded-full blur-[80px] bg-sky-blue" 
          />

          {/* Interactive UI Orb */}
          <div 
            className="w-56 h-56 lg:w-64 lg:h-64 glass rounded-full flex items-center justify-center relative z-10 cursor-pointer shadow-2xl transition-transform hover:scale-105 active:scale-95"
            onClick={toggleConnection}
          >
            {/* Spinning Outer Ring */}
            <motion.div 
              animate={{ rotate: isConnected ? 360 : 0 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-white/10 rounded-full flex items-center justify-center"
            >
              <div className="w-2 h-2 rounded-full bg-white absolute top-0" />
            </motion.div>

            {/* Inner Glow/Icon */}
            <div className="w-36 h-36 lg:w-40 lg:h-40 border-2 border-blue-500/30 rounded-full flex items-center justify-center overflow-hidden">
               <motion.div 
                 animate={{ 
                    opacity: isConnected ? [0.6, 0.9, 0.6] : 0.3,
                    scale: isConnected ? [1, 1.05, 1] : 1
                 }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="w-full h-full bg-gradient-to-tr from-sky-blue to-blue-600 flex items-center justify-center"
               >
                 <AnimatePresence mode="wait">
                    {isConnected ? (
                      <motion.div
                        key="on"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                      >
                         <Mic className="w-12 h-12 text-white" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="off"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                      >
                         <MicOff className="w-12 h-12 text-white/50" />
                      </motion.div>
                    )}
                 </AnimatePresence>
               </motion.div>
            </div>
          </div>
          
          {/* Status Indicator Bar */}
          <div className="absolute bottom-4 flex items-end gap-1.5 h-24 pointer-events-none">
            {[8, 16, 24, 12, 6].map((h, i) => (
              <motion.div 
                key={i}
                animate={{ 
                  height: isConnected ? [`${h/2}px`, `${h*1.5}px`, `${h/2}px`] : `${h}px`,
                  opacity: isConnected ? [0.2, 0.8, 0.2] : 0.2
                }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                className={`w-1 rounded-full ${i === 2 ? 'bg-sky-blue' : 'bg-white'}`}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer Metrics */}
      <footer className="mt-auto flex flex-col lg:flex-row justify-between items-center lg:items-end border-t border-white/5 pt-8 gap-8 z-10">
        <div className="grid grid-cols-3 gap-8 lg:gap-16 w-full lg:w-auto">
          <div>
            <h4 className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-3">Service</h4>
            <p className="text-xs font-semibold">{status === 'MAXX is offline' ? '-' : status}</p>
          </div>
          <div>
            <h4 className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-3">Connection</h4>
            <p className="text-xs font-semibold">16kHz PCM / Low Latency</p>
          </div>
          <div>
            <h4 className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-3">Battery</h4>
            <p className="text-xs font-semibold text-green-400">Optimized</p>
          </div>
        </div>

        <div className="flex gap-4 w-full lg:w-auto items-center">
          <button 
             onClick={toggleConnection}
             className={`flex-1 lg:flex-none px-10 py-4 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all shadow-2xl ${
               isConnected 
                 ? 'glass border border-white/10 hover:bg-white hover:text-black' 
                 : 'bg-sky-blue text-white shadow-sky-blue/20 hover:scale-105 active:scale-95'
             }`}
          >
            {isConnected ? 'Disconnect' : 'Wake MAXX'}
          </button>
        </div>
      </footer>

      {/* Error Overlay */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur"
          >
            <div className="glass p-12 rounded-3xl max-w-sm text-center">
              <h3 className="font-serif italic text-2xl mb-4 text-sky-blue">Awkward...</h3>
              <p className="text-sm opacity-70 mb-8">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="w-full py-4 bg-sky-blue rounded-full text-xs font-bold uppercase tracking-widest"
              >
                Let me try again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
