import React from 'react';
import { BrowserState, CalendarEvent, Email } from '../types';
import { CalendarIcon, EnvelopeIcon, HomeIcon, MagnifyingGlassIcon, SignalSlashIcon, SignalIcon } from '@heroicons/react/24/outline';

interface BrowserViewProps {
  state: BrowserState;
}

export const BrowserView: React.FC<BrowserViewProps> = ({ state }) => {
  // If we have a live screenshot from Puppeteer, show it
  if (state.isConnected && state.screenshot) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center relative">
         <div className="absolute top-2 right-2 z-10 bg-green-500/80 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <SignalIcon className="w-3 h-3" />
            LIVE
         </div>
         <img 
            src={`data:image/jpeg;base64,${state.screenshot}`} 
            alt="Browser Stream" 
            className="w-full h-full object-contain"
         />
      </div>
    );
  }

  // If connected but no screenshot yet (loading)
  if (state.isConnected && !state.screenshot) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 gap-4">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
            <p>Waiting for browser stream...</p>
        </div>
      );
  }

  // Fallback: Simulated Pages (when local server is offline)
  return (
    <div className="relative w-full h-full">
        {/* Offline Indicator */}
        {!state.isConnected && (
            <div className="absolute top-0 w-full bg-amber-100 text-amber-800 text-xs py-1 px-4 flex justify-center items-center gap-2 border-b border-amber-200 z-10">
                <SignalSlashIcon className="w-3 h-3" />
                <span>Simulated Mode (Local Browser Offline)</span>
            </div>
        )}
        <div className="pt-6 h-full">
            {state.page === 'calendar' && <CalendarPage events={state.calendarEvents} />}
            {state.page === 'email' && <EmailPage emails={state.emails} />}
            {state.page === 'dashboard' && <DashboardPage />}
        </div>
    </div>
  );
};

const DashboardPage = () => (
  <div className="p-8 sm:p-12 flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50">
    <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-6">
       <HomeIcon className="w-12 h-12 text-blue-500 opacity-80" />
    </div>
    <h2 className="text-2xl font-bold text-slate-700 mb-2">Welcome Back</h2>
    <p className="text-center max-w-xs text-sm">
      I can help you manage your day. Try asking: <br/>
      <span className="inline-block mt-2 font-mono text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">"What's on my calendar?"</span>
    </p>
  </div>
);

const CalendarPage: React.FC<{ events: CalendarEvent[] }> = ({ events }) => (
  <div className="p-4 sm:p-8">
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">My Calendar</h2>
      </div>
      <button className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
        + New Event
      </button>
    </div>
    
    <div className="space-y-6">
      <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 py-2 border-b border-slate-200">
         <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Today</span>
      </div>
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-5 hover:shadow-md hover:border-blue-100 transition-all">
            <div className="text-center min-w-[70px] pt-1">
              <span className="block text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{event.time}</span>
            </div>
            <div className="h-full w-1 bg-slate-100 rounded-full group-hover:bg-blue-400 transition-colors"></div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-lg">{event.title}</h3>
              {event.attendees.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex -space-x-2">
                    {event.attendees.map((attendee, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase" title={attendee}>
                        {attendee[0]}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p>No events scheduled.</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const EmailPage: React.FC<{ emails: Email[] }> = ({ emails }) => (
  <div className="p-4 sm:p-8">
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/30">
          <EnvelopeIcon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Inbox</h2>
      </div>
      <div className="relative hidden sm:block">
        <input 
          type="text" 
          placeholder="Search mail" 
          className="pl-9 pr-4 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" 
        />
        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>
    </div>

    <div className="space-y-3">
      {emails.map((email) => (
        <div key={email.id} className={`group bg-white p-4 rounded-xl shadow-sm border ${email.read ? 'border-slate-100' : 'border-purple-200 bg-purple-50/30'} hover:shadow-md transition-all cursor-pointer relative overflow-hidden`}>
          {!email.read && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
          )}
          <div className="flex justify-between items-start mb-1.5 pl-2">
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${email.read ? 'bg-transparent' : 'bg-purple-500'}`} />
               <h3 className={`font-bold text-sm ${email.read ? 'text-slate-600' : 'text-slate-900'}`}>{email.from}</h3>
            </div>
            <span className="text-xs font-medium text-slate-400">{email.time}</span>
          </div>
          <div className="pl-6">
             <h4 className="text-sm font-semibold text-slate-800 mb-1">{email.subject}</h4>
             <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{email.preview}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);