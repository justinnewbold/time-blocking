// Shortcuts API - Endpoints for Siri Shortcuts integration
// Provides simple REST endpoints that can be called from iOS Shortcuts

import { NextResponse } from 'next/server';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache'
};

// GET - Retrieve data for shortcuts
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';
  const userId = searchParams.get('userId') || 'default';

  let response = {};

  switch (action) {
    case 'frog':
      response = {
        success: true,
        action: 'get_frog',
        frog: {
          title: null,
          category: null,
          message: 'No frog selected. Open Frog to pick your daily challenge!'
        },
        speak: 'You haven\'t selected a frog yet. Open the Frog app to pick your daily challenge.'
      };
      break;

    case 'stats':
      response = {
        success: true,
        action: 'get_stats',
        stats: {
          tasksRemaining: 0,
          tasksCompleted: 0,
          streak: 0,
          level: 1,
          xp: 0
        },
        speak: 'You have 0 tasks remaining today. Your current streak is 0 days and you\'re at level 1.'
      };
      break;

    case 'quick-wins':
      response = {
        success: true,
        action: 'get_quick_wins',
        tasks: [],
        speak: 'No quick win tasks available right now.'
      };
      break;

    case 'status':
    default:
      response = {
        success: true,
        action: 'status',
        greeting: getGreeting(),
        message: 'Frog is ready! What would you like to do?',
        availableActions: ['frog', 'stats', 'quick-wins', 'add-task', 'complete-frog', 'energy']
      };
  }

  return NextResponse.json(response, { headers: corsHeaders });
}

// POST - Perform actions from shortcuts
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    let response = {};

    switch (action) {
      case 'add-task':
        // Add a new task
        const taskTitle = data?.title || data?.task;
        if (!taskTitle) {
          response = {
            success: false,
            error: 'Task title is required',
            speak: 'Please provide a task name.'
          };
        } else {
          response = {
            success: true,
            action: 'task_added',
            task: {
              title: taskTitle,
              category: data?.category || 'personal',
              difficulty: data?.difficulty || 2
            },
            speak: `Added "${taskTitle}" to your task list.`
          };
        }
        break;

      case 'complete-frog':
        // Mark daily frog as complete
        response = {
          success: true,
          action: 'frog_completed',
          xpEarned: 40,
          message: 'Great job eating your frog!',
          speak: 'Congratulations! You ate your frog and earned 40 XP!'
        };
        break;

      case 'complete-task':
        // Mark a specific task as complete
        const taskId = data?.taskId || data?.id;
        response = {
          success: true,
          action: 'task_completed',
          taskId,
          xpEarned: 20,
          speak: 'Task completed! You earned 20 XP.'
        };
        break;

      case 'energy':
        // Log energy level
        const energyLevel = parseInt(data?.level || data?.energy);
        if (energyLevel < 1 || energyLevel > 4) {
          response = {
            success: false,
            error: 'Energy level must be between 1 and 4',
            speak: 'Please provide an energy level between 1 and 4.'
          };
        } else {
          const energyLabels = ['Zombie Mode', 'Low Battery', 'Cruising', 'Locked In'];
          response = {
            success: true,
            action: 'energy_logged',
            energyLevel,
            label: energyLabels[energyLevel - 1],
            suggestion: getEnergySuggestion(energyLevel),
            speak: `Energy set to ${energyLabels[energyLevel - 1]}. ${getEnergySuggestion(energyLevel)}`
          };
        }
        break;

      case 'start-focus':
        // Start a focus session
        const duration = parseInt(data?.duration || data?.minutes || 25);
        response = {
          success: true,
          action: 'focus_started',
          duration,
          message: `Starting ${duration} minute focus session`,
          openUrl: `https://frog.newbold.cloud?action=focus&duration=${duration}`,
          speak: `Starting a ${duration} minute focus session. Open Frog to begin.`
        };
        break;

      default:
        response = {
          success: false,
          error: 'Unknown action',
          availableActions: ['add-task', 'complete-frog', 'complete-task', 'energy', 'start-focus'],
          speak: 'I didn\'t understand that action. Try adding a task or checking your stats.'
        };
    }

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Invalid request',
      speak: 'Sorry, I couldn\'t process that request.'
    }, { headers: corsHeaders, status: 400 });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Helper functions
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night? 🦉';
  if (hour < 12) return 'Good morning! ☀️';
  if (hour < 17) return 'Good afternoon! 🌤️';
  if (hour < 21) return 'Good evening! 🌙';
  return 'Good night! 💤';
}

function getEnergySuggestion(level) {
  const suggestions = {
    1: 'Take it easy. Focus on survival tasks only.',
    2: 'Try some quick wins to build momentum.',
    3: 'Good energy for tackling regular tasks.',
    4: 'Perfect time to eat your frog!'
  };
  return suggestions[level] || 'Check your energy and get started!';
}
