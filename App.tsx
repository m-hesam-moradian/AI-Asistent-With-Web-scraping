import React, { useState, useEffect } from 'react';
import { useLiveAPI } from './hooks/useLiveAPI';
import { AudioVisualizer } from './components/AudioVisualizer';
import { BrowserView } from './components/BrowserView';
import { ToolLog } from './components/ToolLog';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const { 
    connected, 
    connect, 
    disconnect, 
    volume, 
    logs, 
    browserState 
  } = useLiveAPI(apiKey);

  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    if (apiKey && hasUserInteracted && !connected) {
       // Auto-connect logic if desired
    }
  }, [apiKey, hasUserInteracted, connected]);

  const handleToggle = () => {
    setHasUserInteracted(true);
    if (connected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden relative selection:bg-blue-500/30">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-screen flex flex-col">
        
        {/* Header */}
        <header className="flex-none flex justify-between items-center mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              <span className="text-lg">AI</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Browser Agent
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">Voice-controlled Automation</p>
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
            connected 
              ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.2)]' 
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {connected ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            ) : 'Offline'}
          </div>
        </header>

        {/* Main Layout */}
        <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 pb-2 sm:pb-6">
          
          {/* Left Column: Visualizer & Controls */}
          <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">
            
            {/* Visualizer Card */}
            <div className="flex-none bg-slate-900/40 border border-white/5 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-between relative overflow-hidden shadow-2xl group transition-all hover:border-white/10">
              
              {/* Inner Glow */}
              <div className={`absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5 transition-opacity duration-700 ${connected ? 'opacity-100' : 'opacity-0'}`} />

              <div className="relative z-10 w-full h-40 sm:h-56">
                <AudioVisualizer isConnected={connected} volume={volume} />
              </div>

              <div className="relative z-10 w-full mt-4 flex flex-col items-center gap-4">
                 <div className="text-center h-12">
                   {connected ? (
                     <div className="animate-in fade-in zoom-in duration-300">
                       <p className="text-lg font-medium text-slate-200">Listening...</p>
                       <p className="text-xs text-slate-500 mt-1">Try "Open my calendar"</p>
                     </div>
                   ) : (
                     <p className="text-slate-500 text-sm">Tap microphone to start</p>
                   )}
                 </div>

                 <button
                  onClick={handleToggle}
                  className={`relative p-5 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 ${
                    connected 
                      ? 'bg-red-500/10 text-red-500 border border-red-500/50' 
                      : 'bg-white text-slate-900 border border-transparent'
                  }`}
                >
                  {connected ? (
                    <StopIcon className="w-8 h-8 relative z-10" />
                  ) : (
                    <MicrophoneIcon className="w-8 h-8 relative z-10" />
                  )}
                  {connected && (
                    <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-20" />
                  )}
                </button>
              </div>
            </div>

            {/* Logs Panel */}
            <div className="flex-1 bg-slate-900/40 border border-white/5 backdrop-blur-md rounded-3xl p-4 overflow-hidden flex flex-col min-h-[150px] shadow-xl">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agent Activity</h3>
              </div>
              <ToolLog logs={logs} />
            </div>
          </div>

          {/* Right Column: Simulated Browser View */}
          <div className="lg:col-span-8 flex flex-col bg-slate-200 rounded-3xl overflow-hidden shadow-2xl border-[6px] border-slate-900 relative">
            
            {/* Fake Browser Toolbar */}
            <div className="bg-white border-b border-slate-300 px-4 py-3 flex items-center gap-4 shadow-sm z-20">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400 shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-green-400 shadow-inner" />
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                  <div className="bg-slate-100 rounded-md p-1 hover:bg-slate-200 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </div>
                  <div className="bg-slate-100 rounded-md p-1 hover:bg-slate-200 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <div className="bg-slate-100 rounded-md p-1 hover:bg-slate-200 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </div>
              </div>
              <div className="flex-1 bg-slate-100 rounded-lg px-4 py-2 text-xs text-slate-600 flex items-center gap-2 font-mono transition-all hover:bg-slate-50 border border-transparent hover:border-slate-200">
                <span className="text-slate-400">🔒</span>
                <span className="truncate">{browserState.url}</span>
              </div>
            </div>

            {/* Browser Content */}
            <div className="flex-1 bg-slate-50 relative overflow-y-auto overflow-x-hidden">
               <div className="h-full w-full">
                 <BrowserView state={browserState} />
               </div>
               
               {/* Loading Overlay */}
               {browserState.isLoading && (
                 <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-30 flex-col gap-4 animate-in fade-in duration-200">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
                    <span className="text-sm font-semibold text-slate-700 bg-white px-3 py-1 rounded-full shadow-sm">Navigating...</span>
                 </div>
               )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;