import express from 'express';
import { WebSocketServer } from 'ws';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// Initialize Express
const app = express();
const server = app.listen(PORT, () => {
  console.log(`\x1b[32m
🚀 SERVER STARTED!
--------------------------------------------------
📡 Listening on: http://localhost:${PORT}
💻 Puppeteer:    Ready to launch browser
--------------------------------------------------
Waiting for frontend connection...
\x1b[0m`);
});

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// HTML Templates for Puppeteer Rendering
const getBaseHtml = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-gray-50 h-screen w-screen overflow-hidden flex flex-col">
  ${content}
</body>
</html>
`;

const TEMPLATES = {
  dashboard: () => getBaseHtml(`
    <div class="flex-1 flex flex-col items-center justify-center p-10 text-center">
      <div class="w-32 h-32 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8">
         <svg class="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
      </div>
      <h1 class="text-4xl font-bold text-gray-800 mb-4">Dashboard</h1>
      <p class="text-xl text-gray-500 max-w-md">I am ready to help. Ask me to open your calendar or check your emails.</p>
    </div>
  `),
  
  calendar: (events = []) => getBaseHtml(`
    <div class="bg-white border-b px-8 py-6 flex justify-between items-center shadow-sm z-10">
      <h1 class="text-3xl font-bold text-gray-800">January 2025</h1>
      <button class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium shadow-md shadow-blue-200">New Event</button>
    </div>
    <div class="flex-1 overflow-y-auto p-8">
      <div class="space-y-4 max-w-3xl mx-auto">
        <h2 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Today</h2>
        ${events.length === 0 ? `<div class="p-8 text-center text-gray-400 italic">No events scheduled today.</div>` : ''}
        ${events.map(evt => `
          <div class="flex items-start gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 ring-1 ring-gray-900/5">
            <div class="flex flex-col items-center min-w-[80px]">
              <span class="text-sm font-bold text-blue-600">${evt.time}</span>
              <div class="h-full w-0.5 bg-gray-100 mt-2"></div>
            </div>
            <div class="flex-1">
               <h3 class="text-xl font-bold text-gray-800">${evt.title}</h3>
               <div class="flex items-center gap-2 mt-3">
                 ${evt.attendees.map(a => `<span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md font-medium">${a}</span>`).join('')}
               </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `),

  email: (emails = []) => getBaseHtml(`
    <div class="bg-white border-b px-8 py-6 flex justify-between items-center shadow-sm z-10">
      <h1 class="text-3xl font-bold text-gray-800">Inbox</h1>
      <div class="relative">
        <input type="text" placeholder="Search..." class="bg-gray-100 px-4 py-2 rounded-lg text-sm w-64">
      </div>
    </div>
    <div class="flex-1 overflow-y-auto">
      ${emails.map(email => `
        <div class="flex items-center gap-4 px-8 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!email.read ? 'bg-blue-50/50' : ''}">
           <div class="w-10 h-10 rounded-full ${!email.read ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'} flex items-center justify-center font-bold text-sm">
             ${email.from[0]}
           </div>
           <div class="flex-1 min-w-0">
              <div class="flex justify-between mb-1">
                <span class="font-bold text-gray-900 ${!email.read ? 'text-black' : ''}">${email.from}</span>
                <span class="text-xs text-gray-400">${email.time}</span>
              </div>
              <h4 class="text-sm font-semibold text-gray-800 truncate">${email.subject}</h4>
              <p class="text-sm text-gray-500 truncate">${email.preview}</p>
           </div>
        </div>
      `).join('')}
    </div>
  `)
};

// Initial Data
let currentEvents = [
  { id: '1', title: 'Team Sync', time: '10:00 AM', attendees: ['Alice', 'Bob'] },
  { id: '2', title: 'Lunch with Sarah', time: '12:30 PM', attendees: ['Sarah'] }
];

let currentEmails = [
   { id: '1', from: 'Boss', subject: 'Project Update', preview: 'Can we sync later today?', time: '9:05 AM', read: false },
   { id: '2', from: 'Newsletter', subject: 'Weekly Digest', preview: 'Top stories in tech this week...', time: '8:00 AM', read: true },
];

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', 
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
    
    // Start at dashboard
    await page.setContent(TEMPLATES.dashboard());

    wss.on('connection', async (ws) => {
      console.log('✅ Frontend connected to Browser Engine');

      // Send initial screenshot immediately
      await sendScreenshot(page, ws);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          console.log('Action received:', data);

          if (data.type === 'action') {
            let toolResult = { status: 'success' };
            const requestId = data.id; // Correlation ID

            // Handle Navigation & Actions
            if (data.tool === 'openCalendar' || data.tool === 'checkAvailability') {
              await page.setContent(TEMPLATES.calendar(currentEvents));
              ws.send(JSON.stringify({ type: 'url_change', url: 'https://calendar.agent/view' }));
              // Return actual events data so AI can read it
              toolResult = { events: currentEvents };
            
            } else if (data.tool === 'openEmail') {
              await page.setContent(TEMPLATES.email(currentEmails));
              ws.send(JSON.stringify({ type: 'url_change', url: 'https://mail.agent/inbox' }));
              toolResult = { emails: currentEmails };
            
            } else if (data.tool === 'bookMeeting') {
              const newEvent = {
                id: Date.now().toString(),
                title: data.args.title || 'New Meeting',
                time: data.args.time || 'Next Hour',
                attendees: data.args.attendees ? data.args.attendees.split(',') : ['You']
              };
              currentEvents.push(newEvent);
              await page.setContent(TEMPLATES.calendar(currentEvents));
              toolResult = { status: 'success', bookedEvent: newEvent };
              ws.send(JSON.stringify({ type: 'log', message: `Booked meeting: ${newEvent.title}` }));
            
            } else if (data.tool === 'sendEmail') {
              toolResult = { status: 'success', sentTo: data.args.to };
              ws.send(JSON.stringify({ type: 'log', message: `Email sent to ${data.args.to}` }));
            }

            // Send the result back to frontend so it can respond to Gemini
            if (requestId) {
              ws.send(JSON.stringify({
                type: 'tool_result',
                id: requestId,
                result: toolResult
              }));
            }

            // Send updated screenshot
            await new Promise(r => setTimeout(r, 100)); // Small layout buffer
            await sendScreenshot(page, ws);
          }
        } catch (e) {
          console.error('Error handling message:', e);
        }
      });

      ws.on('close', () => console.log('❌ Frontend disconnected'));
    });
  } catch (error) {
    console.error("FATAL ERROR: Could not launch Puppeteer.", error);
  }
})();

async function sendScreenshot(page, ws) {
  if (ws.readyState === ws.OPEN) {
    try {
      const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 80 });
      ws.send(JSON.stringify({ type: 'screenshot', data: screenshot }));
    } catch (e) {
      console.error("Screenshot failed:", e);
    }
  }
}