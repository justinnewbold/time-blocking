// Widget API - Returns today's frog and task summary
// Can be used by iOS Shortcuts, widgets, or other integrations

import { NextResponse } from 'next/server';

export async function GET(request) {
  // Get user ID from query params or use default
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default';
  
  // In a real app, you'd fetch from your database
  // For now, return a structure that can be used by widgets
  const widgetData = {
    timestamp: new Date().toISOString(),
    userId,
    today: {
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      }),
      greeting: getGreeting(),
    },
    frog: {
      hasDaily: false,
      title: null,
      category: null,
      emoji: '🐸',
      message: "No frog selected yet. Open Frog to eat your frog!",
    },
    stats: {
      tasksRemaining: 0,
      tasksCompleted: 0,
      currentStreak: 0,
      level: 1,
      xp: 0,
    },
    quickActions: [
      { label: 'Open Frog', url: 'https://frog.newbold.cloud' },
      { label: 'Add Task', url: 'https://frog.newbold.cloud?action=add' },
      { label: 'View Calendar', url: 'https://frog.newbold.cloud/calendar' },
    ],
  };
  
  // Return with CORS headers for cross-origin access
  return NextResponse.json(widgetData, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning!';
  if (hour < 17) return 'Good afternoon!';
  if (hour < 21) return 'Good evening!';
  return 'Good night!';
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
