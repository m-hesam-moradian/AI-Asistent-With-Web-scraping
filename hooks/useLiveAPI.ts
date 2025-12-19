import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createPcmBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { BrowserState, LogEntry, CalendarEvent, Email } from '../types';

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const PUPPETEER_WS_URL = 'ws://localhost:3000'; // Local Puppeteer Server

const SYSTEM_INSTRUCTION = `You are an advanced Voice AI Assistant integrated into a web-automation agent. Your primary goal is to listen to user commands, execute browser-based tasks (like managing calendars or messaging), and respond vocally.

Voice Interaction Rules:
- Be Concise: Since you are speaking, keep responses short and natural. Avoid long lists or complex formatting.
- Confirm Actions: When a user asks to do something (e.g., 'Book a meeting'), confirm you are starting the task.
- Status Updates: If a browser task takes more than 5 seconds, give a brief vocal update (e.g., 'I'm navigating to the calendar now...').
- Handle Interruptions: Be prepared for the user to speak while you are processing.
- Personality: You are professional, efficient, and proactive. If you see a conflict in the calendar, point it out immediately.

You have access to tools that simulate a browser. Use them to help the user.
`;

// Tool Definitions
const TOOLS: FunctionDeclaration[] = [
  {
    name: 'openCalendar',
    description: 'Navigates to the calendar view. Returns the list of events.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'openEmail',
    description: 'Navigates to the email inbox. Returns the list of recent emails.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'checkAvailability',
    description: 'Checks for calendar events on a specific date.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: 'Date to check in YYYY-MM-DD format' }
      },
      required: ['date']
    }
  },
  {
    name: 'bookMeeting',
    description: 'Books a new meeting on the calendar.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Title of the meeting' },
        time: { type: Type.STRING, description: 'Time of the meeting (e.g., 2:00 PM)' },
        attendees: { type: Type.STRING, description: 'Comma separated list of attendee names' }
      },
      required: ['title', 'time']
    }
  },
  {
    name: 'sendEmail',
    description: 'Sends an email to a recipient.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: { type: Type.STRING, description: 'Recipient name or email' },
        subject: { type: Type.STRING, description: 'Subject of the email' },
        message: { type: Type.STRING, description: 'Body content of the email' }
      },
      required: ['to', 'subject', 'message']
    }
  }
];

export const useLiveAPI = (apiKey: string) => {
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Simulated Browser State
  const [browserState, setBrowserState] = useState<BrowserState>({
    isConnected: false,
    url: 'about:blank',
    page: 'dashboard',
    isLoading: false,
    calendarEvents: [],
    emails: []
  });

  // Audio Contexts & Streams
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Puppeteer WebSocket
  const browserWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  
  // Pending Tool Requests (Map ID -> Resolve Function)
  const pendingRequestsRef = useRef<Map<string, (value: any) => void>>(new Map());

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-4), { timestamp: new Date(), message, type }]);
  };

  // Connect to Puppeteer server with Auto-Reconnect
  useEffect(() => {
    const connectToBrowser = () => {
      try {
        const ws = new WebSocket(PUPPETEER_WS_URL);
        
        ws.onopen = () => {
          setBrowserState(prev => ({ ...prev, isConnected: true }));
          addLog('Connected to Browser Engine', 'success');
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };

        ws.onclose = () => {
          setBrowserState(prev => ({ ...prev, isConnected: false }));
          // Retry to reconnect
          reconnectTimeoutRef.current = setTimeout(connectToBrowser, 3000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'screenshot') {
              setBrowserState(prev => ({ ...prev, screenshot: data.data, isLoading: false }));
            } else if (data.type === 'url_change') {
              setBrowserState(prev => ({ ...prev, url: data.url }));
            } else if (data.type === 'log') {
               addLog(`Browser: ${data.message}`, 'info');
            } else if (data.type === 'tool_result' && data.id) {
               // Resolve pending promise for tool execution
               const resolve = pendingRequestsRef.current.get(data.id);
               if (resolve) {
                 resolve(data.result);
                 pendingRequestsRef.current.delete(data.id);
               }
            }
          } catch (e) {
            console.error('Failed to parse browser message', e);
          }
        };

        browserWsRef.current = ws;
      } catch (e) {
        reconnectTimeoutRef.current = setTimeout(connectToBrowser, 3000);
      }
    };

    connectToBrowser();

    return () => {
      browserWsRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  const executeTool = async (name: string, args: any): Promise<any> => {
    addLog(`Executing: ${name}`, 'tool');
    setBrowserState(prev => ({ ...prev, isLoading: true }));

    // --- REAL BROWSER CONNECTION ---
    if (browserWsRef.current && browserWsRef.current.readyState === WebSocket.OPEN) {
      const requestId = Math.random().toString(36).substring(7);
      
      return new Promise((resolve) => {
        // Store resolve function to be called when WS returns 'tool_result'
        pendingRequestsRef.current.set(requestId, resolve);

        // Send command
        browserWsRef.current?.send(JSON.stringify({
          type: 'action',
          id: requestId,
          tool: name,
          args: args
        }));

        // Safety timeout in case backend crashes
        setTimeout(() => {
          if (pendingRequestsRef.current.has(requestId)) {
             pendingRequestsRef.current.delete(requestId);
             resolve({ status: 'error', message: 'Browser timed out' });
             setBrowserState(prev => ({ ...prev, isLoading: false }));
          }
        }, 5000);
      });
    }

    // --- FALLBACK SIMULATION (If no real browser connected) ---
    await new Promise(resolve => setTimeout(resolve, 800)); 

    let result: any = { status: 'success' };

    switch (name) {
      case 'openCalendar':
        setBrowserState(prev => ({ ...prev, page: 'calendar', url: 'https://calendar.agent/view', isLoading: false }));
        result = { events: [{ id: '1', title: 'Team Sync (Simulated)', time: '10:00 AM', attendees: ['Alice', 'Bob'] }] };
        break;
      case 'openEmail':
        setBrowserState(prev => ({ ...prev, page: 'email', url: 'https://mail.agent/inbox', isLoading: false }));
        result = { emails: [{ id: '1', from: 'Boss', subject: 'Simulated Email', preview: 'This is a fake email.', time: '9:00 AM', read: false }] };
        break;
      case 'checkAvailability':
         setBrowserState(prev => ({ ...prev, page: 'calendar', url: 'https://calendar.agent/view', isLoading: false }));
         result = { events: [
            { id: '1', title: 'Team Sync', time: '10:00 AM', attendees: ['Alice', 'Bob'] }
         ]};
         break;
      case 'bookMeeting':
         addLog(`Booked: ${args.title}`, 'success');
         result = { status: 'success', booked: args.title };
         break;
      case 'sendEmail':
         setBrowserState(prev => ({ ...prev, page: 'email', url: 'https://mail.agent/sent', isLoading: false }));
         addLog(`Sent email to ${args.to}`, 'success');
         result = { status: 'success', sentTo: args.to };
         break;
      default:
        setBrowserState(prev => ({ ...prev, isLoading: false }));
        result = { status: 'error', message: 'Tool not found' };
    }

    return result;
  };

  const connect = async () => {
    if (!apiKey) {
      addLog("Missing API Key", "error");
      return;
    }

    try {
      addLog("Requesting microphone...", "info");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true
        } 
      });
      mediaStreamRef.current = stream;

      addLog("Initializing audio...", "info");
      
      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const ai = new GoogleGenAI({ apiKey });
      
      addLog("Connecting to Gemini Live...", "info");

      sessionPromiseRef.current = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: TOOLS }]
        },
        callbacks: {
          onopen: () => {
            setConnected(true);
            addLog("Connected!", "success");
            
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(1, rms * 5)); 

              const pcmBlob = createPcmBlob(inputData);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                const result = await executeTool(fc.name, fc.args);
                sessionPromiseRef.current?.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result }
                    }
                  });
                });
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => {
            setConnected(false);
            addLog("Disconnected", "info");
          },
          onerror: (err) => {
            console.error(err);
            addLog("Connection Error", "error");
          }
        }
      });

    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        addLog("Microphone access denied. Please check permissions.", "error");
      } else {
        addLog("Failed to connect: " + (err.message || "Unknown error"), "error");
      }
      setConnected(false);
    }
  };

  const disconnect = async () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
    }
    
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    
    setConnected(false);
    addLog("Stopped", "info");
  };

  return {
    connected,
    connect,
    disconnect,
    volume,
    logs,
    browserState
  };
};