'use client';

import { useState, useEffect, useCallback } from 'react';

// Google Calendar API configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// Hook for Google Calendar integration
export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [error, setError] = useState(null);

  // Initialize Google API
  useEffect(() => {
    const initGoogleApi = async () => {
      try {
        // Check if already connected
        const savedToken = localStorage.getItem('google_calendar_token');
        if (savedToken) {
          setIsConnected(true);
          await loadCalendars(savedToken);
        }
      } catch (err) {
        console.error('Failed to init Google API:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initGoogleApi();
  }, []);

  const loadCalendars = async (token) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load calendars');

      const data = await response.json();
      setCalendars(data.items || []);

      // Set default calendar
      const primary = data.items?.find(c => c.primary);
      const savedCalendar = localStorage.getItem('google_calendar_selected');
      setSelectedCalendar(savedCalendar || primary?.id || data.items?.[0]?.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Open Google OAuth popup
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', `${window.location.origin}/auth/google-callback`);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('prompt', 'consent');

      const popup = window.open(authUrl.toString(), 'google-auth', 'width=500,height=600');

      // Listen for auth callback
      const handleMessage = async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'google-auth-success') {
          const token = event.data.token;
          localStorage.setItem('google_calendar_token', token);
          setIsConnected(true);
          await loadCalendars(token);
          popup?.close();
        } else if (event.data.type === 'google-auth-error') {
          setError(event.data.error);
          popup?.close();
        }

        window.removeEventListener('message', handleMessage);
      };

      window.addEventListener('message', handleMessage);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('google_calendar_token');
    localStorage.removeItem('google_calendar_selected');
    setIsConnected(false);
    setCalendars([]);
    setSelectedCalendar(null);
  }, []);

  const selectCalendar = useCallback((calendarId) => {
    setSelectedCalendar(calendarId);
    localStorage.setItem('google_calendar_selected', calendarId);
  }, []);

  // Create calendar event for focus session
  const createFocusEvent = useCallback(async (task, durationMinutes) => {
    const token = localStorage.getItem('google_calendar_token');
    if (!token || !selectedCalendar) return null;

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const event = {
      summary: `🐸 Focus: ${task.title}`,
      description: `FocusFlow focus session\n\nTask: ${task.title}\nCategory: ${task.category}\nDifficulty: ${'⭐'.repeat(task.difficulty)}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: '2', // Green
      reminders: {
        useDefault: false,
        overrides: [],
      },
    };

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(selectedCalendar)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) throw new Error('Failed to create event');

      return await response.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [selectedCalendar]);

  // Create task as calendar event
  const createTaskEvent = useCallback(async (task) => {
    const token = localStorage.getItem('google_calendar_token');
    if (!token || !selectedCalendar || !task.dueDate) return null;

    const dueDate = new Date(task.dueDate);
    const startTime = new Date(dueDate);
    startTime.setHours(9, 0, 0, 0); // Default to 9 AM

    const endTime = new Date(startTime.getTime() + (task.estimatedMinutes || 30) * 60 * 1000);

    const event = {
      summary: `📋 ${task.title}`,
      description: `FocusFlow task\n\nCategory: ${task.category}\nDifficulty: ${'⭐'.repeat(task.difficulty)}${task.frog ? '\n🐸 This is your Frog!' : ''}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: task.frog ? '5' : '1', // Yellow for frogs, blue for regular
    };

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(selectedCalendar)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) throw new Error('Failed to create event');

      return await response.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [selectedCalendar]);

  // Fetch upcoming events
  const getUpcomingEvents = useCallback(async (maxResults = 10) => {
    const token = localStorage.getItem('google_calendar_token');
    if (!token || !selectedCalendar) return [];

    try {
      const now = new Date().toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(selectedCalendar)}/events?` +
        `timeMin=${now}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      return data.items || [];
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [selectedCalendar]);

  // Find free time slots
  const findFreeSlots = useCallback(async (durationMinutes, daysAhead = 7) => {
    const events = await getUpcomingEvents(50);

    const slots = [];
    const now = new Date();
    const workdayStart = 9; // 9 AM
    const workdayEnd = 18; // 6 PM

    for (let day = 0; day < daysAhead; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setHours(workdayStart, 0, 0, 0);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Get events for this day
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setHours(workdayEnd, 0, 0, 0);

      const dayEvents = events.filter(e => {
        const eventStart = new Date(e.start.dateTime || e.start.date);
        return eventStart >= dayStart && eventStart < dayEnd;
      }).sort((a, b) => {
        const aStart = new Date(a.start.dateTime || a.start.date);
        const bStart = new Date(b.start.dateTime || b.start.date);
        return aStart - bStart;
      });

      // Find gaps
      let currentTime = new Date(dayStart);

      for (const event of dayEvents) {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const gapMinutes = (eventStart - currentTime) / (1000 * 60);

        if (gapMinutes >= durationMinutes) {
          slots.push({
            start: new Date(currentTime),
            end: new Date(eventStart),
            duration: gapMinutes,
          });
        }

        const eventEnd = new Date(event.end.dateTime || event.end.date);
        currentTime = eventEnd > currentTime ? eventEnd : currentTime;
      }

      // Check remaining time after last event
      const remainingMinutes = (dayEnd - currentTime) / (1000 * 60);
      if (remainingMinutes >= durationMinutes) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(dayEnd),
          duration: remainingMinutes,
        });
      }
    }

    return slots;
  }, [getUpcomingEvents]);

  return {
    isConnected,
    isLoading,
    calendars,
    selectedCalendar,
    error,
    connect,
    disconnect,
    selectCalendar,
    createFocusEvent,
    createTaskEvent,
    getUpcomingEvents,
    findFreeSlots,
  };
}

// Google Calendar Settings UI
export function GoogleCalendarSettings({
  isConnected,
  isLoading,
  calendars,
  selectedCalendar,
  error,
  onConnect,
  onDisconnect,
  onSelectCalendar,
}) {
  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 glass-card rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-white font-medium">Google Calendar</p>
            <p className="text-white/60 text-sm">
              {isConnected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : isConnected ? (
          <button
            onClick={onDisconnect}
            className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-white text-sm"
          >
            Connect
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {isConnected && calendars.length > 0 && (
        <>
          {/* Calendar Selection */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Select Calendar</label>
            <select
              value={selectedCalendar || ''}
              onChange={(e) => onSelectCalendar(e.target.value)}
              className="w-full glass-input px-4 py-3 rounded-xl text-white bg-transparent"
            >
              {calendars.map(cal => (
                <option key={cal.id} value={cal.id} className="bg-gray-900">
                  {cal.summary} {cal.primary && '(Primary)'}
                </option>
              ))}
            </select>
          </div>

          {/* Features */}
          <div className="glass-card p-4 rounded-xl">
            <p className="text-white/60 text-sm mb-3">Calendar Features</p>
            <div className="space-y-2 text-sm text-white">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Auto-block time for focus sessions
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Add tasks with due dates to calendar
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Find free time slots for tasks
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Find Free Time Modal
export function FindFreeTimeModal({
  isOpen,
  onClose,
  task,
  findFreeSlots,
  onSelectSlot,
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !task) return;

    const loadSlots = async () => {
      setLoading(true);
      const duration = task.estimatedMinutes || 30;
      const freeSlots = await findFreeSlots(duration);
      setSlots(freeSlots.slice(0, 10)); // Show top 10 slots
      setLoading(false);
    };

    loadSlots();
  }, [isOpen, task, findFreeSlots]);

  if (!isOpen) return null;

  const formatSlot = (slot) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const date = slot.start.toLocaleDateString(undefined, options);
    const startTime = slot.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const endTime = slot.end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

    return { date, startTime, endTime, duration: Math.round(slot.duration) };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 glass-card p-6 rounded-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Find Time for Task</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        {/* Task Info */}
        <div className="glass-card p-4 rounded-xl mb-4">
          <p className="text-white font-medium">{task?.title}</p>
          <p className="text-white/60 text-sm">{task?.estimatedMinutes || 30} min needed</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
            <p className="text-white/60">Finding free slots...</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl">📅</span>
            <p className="text-white/60 mt-2">No free slots found in the next 7 days</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-white/60 text-sm mb-3">Available time slots:</p>
            {slots.map((slot, idx) => {
              const formatted = formatSlot(slot);
              return (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectSlot(slot);
                    onClose();
                  }}
                  className="w-full p-4 glass-card rounded-xl text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">{formatted.date}</p>
                      <p className="text-white/60 text-sm">
                        {formatted.startTime} - {formatted.endTime}
                      </p>
                    </div>
                    <span className="text-green-400 text-sm">{formatted.duration}m free</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default GoogleCalendarSettings;
