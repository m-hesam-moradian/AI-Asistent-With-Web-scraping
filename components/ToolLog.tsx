import React from 'react';
import { LogEntry } from '../types';

interface ToolLogProps {
  logs: LogEntry[];
}

export const ToolLog: React.FC<ToolLogProps> = ({ logs }) => {
  return (
    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
      {logs.length === 0 && (
        <div className="text-slate-600 text-xs italic">Waiting for connection...</div>
      )}
      {logs.map((log, i) => (
        <div key={i} className="flex items-start gap-2 text-xs font-mono">
          <span className="text-slate-600 min-w-[50px]">
            {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
          </span>
          <span className={`flex-1 break-words ${
            log.type === 'tool' ? 'text-blue-400' :
            log.type === 'success' ? 'text-green-400' :
            log.type === 'error' ? 'text-red-400' :
            'text-slate-400'
          }`}>
            {log.type === 'tool' && '> '}
            {log.message}
          </span>
        </div>
      ))}
    </div>
  );
};