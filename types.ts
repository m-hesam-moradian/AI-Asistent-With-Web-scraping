export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  attendees: string[];
}

export interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  time: string;
  read: boolean;
}

export type PageType = 'dashboard' | 'calendar' | 'email' | 'search';

export interface BrowserState {
  url: string;
  page: PageType;
  isLoading: boolean;
  calendarEvents: CalendarEvent[];
  emails: Email[];
  searchQuery?: string;
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'tool' | 'error' | 'success';
}

export interface AgentState {
  connected: boolean;
  volume: number;
}
