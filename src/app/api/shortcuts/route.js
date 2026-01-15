// Shortcuts API - Endpoints for Siri Shortcuts integration
// Provides simple REST endpoints that can be called from iOS Shortcuts

import { NextResponse } from 'next/server';
import { getTasks, getUserProgress, createTask, updateTask, completeTask, upsertUserProgress } from '@/lib/supabase';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache'
};

// Get app URL from environment or construct from request
function getAppUrl(request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

// GET - Retrieve data for shortcuts
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';
  const userId = searchParams.get('userId');
  const appUrl = getAppUrl(request);

  // Require userId for data actions
  if (!userId && action !== 'status') {
    return NextResponse.json({
      success: false,
      error: 'userId parameter is required',
      speak: 'Please provide a user ID to access your data.'
    }, { headers: corsHeaders, status: 400 });
  }

  let response = {};

  try {
    switch (action) {
      case 'frog': {
        const tasks = await getTasks(userId);
        const frogTask = tasks.find(t => !t.completed && t.is_frog);
        if (frogTask) {
          response = {
            success: true,
            action: 'get_frog',
            frog: {
              id: frogTask.id,
              title: frogTask.title,
              category: frogTask.category,
              difficulty: frogTask.difficulty,
            },
            speak: `Your frog today is: ${frogTask.title}`
          };
        } else {
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
        }
        break;
      }

      case 'stats': {
        const [tasks, progress] = await Promise.all([
          getTasks(userId),
          getUserProgress(userId),
        ]);
        const incompleteTasks = tasks.filter(t => !t.completed);
        const completedTasks = tasks.filter(t => t.completed);

        response = {
          success: true,
          action: 'get_stats',
          stats: {
            tasksRemaining: incompleteTasks.length,
            tasksCompleted: completedTasks.length,
            streak: progress?.current_streak || 0,
            level: progress?.level || 1,
            xp: progress?.total_xp || 0
          },
          speak: `You have ${incompleteTasks.length} tasks remaining today. Your current streak is ${progress?.current_streak || 0} days and you're at level ${progress?.level || 1}.`
        };
        break;
      }

      case 'quick-wins': {
        const tasks = await getTasks(userId);
        const quickWins = tasks
          .filter(t => !t.completed && t.difficulty <= 2)
          .slice(0, 5)
          .map(t => ({
            id: t.id,
            title: t.title,
            difficulty: t.difficulty,
          }));

        response = {
          success: true,
          action: 'get_quick_wins',
          tasks: quickWins,
          speak: quickWins.length > 0
            ? `Here are ${quickWins.length} quick win tasks: ${quickWins.map(t => t.title).join(', ')}`
            : 'No quick win tasks available right now.'
        };
        break;
      }

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
  } catch (error) {
    console.error('Shortcuts API GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch data',
      speak: 'Sorry, I couldn\'t retrieve your data.'
    }, { headers: corsHeaders, status: 500 });
  }
}

// POST - Perform actions from shortcuts
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data, userId } = body;
    const appUrl = getAppUrl(request);

    // Require userId for most actions
    if (!userId && action !== 'status') {
      return NextResponse.json({
        success: false,
        error: 'userId is required',
        speak: 'Please provide a user ID.'
      }, { headers: corsHeaders, status: 400 });
    }

    let response = {};

    switch (action) {
      case 'add-task': {
        // Add a new task
        const taskTitle = data?.title || data?.task;
        if (!taskTitle) {
          response = {
            success: false,
            error: 'Task title is required',
            speak: 'Please provide a task name.'
          };
        } else {
          const newTask = await createTask({
            user_id: userId,
            title: taskTitle,
            category: data?.category || 'personal',
            difficulty: data?.difficulty || 2,
            is_frog: false,
          });
          response = {
            success: true,
            action: 'task_added',
            task: {
              id: newTask.id,
              title: newTask.title,
              category: newTask.category,
              difficulty: newTask.difficulty
            },
            speak: `Added "${taskTitle}" to your task list.`
          };
        }
        break;
      }

      case 'complete-frog': {
        // Mark daily frog as complete
        const tasks = await getTasks(userId);
        const frogTask = tasks.find(t => !t.completed && t.is_frog);

        if (frogTask) {
          const xpEarned = frogTask.difficulty * 20; // Frog bonus
          await completeTask(frogTask.id, xpEarned);

          // Update user progress
          const progress = await getUserProgress(userId);
          await upsertUserProgress({
            user_id: userId,
            total_xp: (progress?.total_xp || 0) + xpEarned,
            level: Math.floor(((progress?.total_xp || 0) + xpEarned) / 200) + 1,
            current_streak: progress?.current_streak || 0,
          });

          response = {
            success: true,
            action: 'frog_completed',
            taskId: frogTask.id,
            xpEarned,
            message: 'Great job eating your frog!',
            speak: `Congratulations! You ate your frog "${frogTask.title}" and earned ${xpEarned} XP!`
          };
        } else {
          response = {
            success: false,
            error: 'No frog selected',
            speak: 'You don\'t have a frog selected. Open Frog to pick one first.'
          };
        }
        break;
      }

      case 'complete-task': {
        // Mark a specific task as complete
        const taskId = data?.taskId || data?.id;
        if (!taskId) {
          response = {
            success: false,
            error: 'Task ID is required',
            speak: 'Please specify which task to complete.'
          };
        } else {
          const tasks = await getTasks(userId);
          const task = tasks.find(t => t.id === taskId);

          if (task) {
            const xpEarned = task.is_frog ? task.difficulty * 20 : task.difficulty * 10;
            await completeTask(taskId, xpEarned);

            // Update user progress
            const progress = await getUserProgress(userId);
            await upsertUserProgress({
              user_id: userId,
              total_xp: (progress?.total_xp || 0) + xpEarned,
              level: Math.floor(((progress?.total_xp || 0) + xpEarned) / 200) + 1,
              current_streak: progress?.current_streak || 0,
            });

            response = {
              success: true,
              action: 'task_completed',
              taskId,
              xpEarned,
              speak: `Task completed! You earned ${xpEarned} XP.`
            };
          } else {
            response = {
              success: false,
              error: 'Task not found',
              speak: 'I couldn\'t find that task.'
            };
          }
        }
        break;
      }

      case 'energy': {
        // Log energy level (stored in response for client to handle)
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
      }

      case 'start-focus': {
        // Start a focus session
        const duration = parseInt(data?.duration || data?.minutes || 25);
        response = {
          success: true,
          action: 'focus_started',
          duration,
          message: `Starting ${duration} minute focus session`,
          openUrl: `${appUrl}?action=focus&duration=${duration}`,
          speak: `Starting a ${duration} minute focus session. Open Frog to begin.`
        };
        break;
      }

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
    console.error('Shortcuts API POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Invalid request',
      message: error.message,
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
