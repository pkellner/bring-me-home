import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/comment-verification';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');
  const action = searchParams.get('action');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
  }

  try {
    // Handle action parameter for magic links
    if (action === 'hide') {
      // Hide all comments for this email
      const updateResult = await prisma.comment.updateMany({
        where: { email },
        data: {
          hideRequested: true,
          hideRequestedAt: new Date(),
        },
      });

      // Update user's allowAnonymousComments setting if they have an account
      await prisma.user.updateMany({
        where: { email },
        data: {
          allowAnonymousComments: false, // Disable anonymous comments when hiding
        },
      });

      // Redirect to a success page
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Comments Hidden</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background-color: #f9fafb;
              }
              .container {
                max-width: 400px;
                background: white;
                padding: 2rem;
                border-radius: 0.5rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                text-align: center;
              }
              h1 { color: #111827; margin-bottom: 0.5rem; }
              p { color: #6b7280; margin-bottom: 1.5rem; }
              .icon {
                width: 48px;
                height: 48px;
                background-color: #fee2e2;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 1rem;
              }
              .icon svg { width: 24px; height: 24px; color: #dc2626; }
              a {
                display: inline-block;
                background-color: #4f46e5;
                color: white;
                padding: 0.5rem 1.5rem;
                border-radius: 0.375rem;
                text-decoration: none;
                margin: 0.25rem;
              }
              a:hover { background-color: #4338ca; }
              .secondary {
                background-color: #e5e7eb;
                color: #374151;
              }
              .secondary:hover { background-color: #d1d5db; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h1>Comments Hidden</h1>
              <p>All ${updateResult.count} comments associated with your email have been hidden from public view.</p>
              <p style="font-size: 0.875rem; color: #9ca3af;">You can change this setting at any time using the manage link in your email.</p>
              <div>
                <a href="/">Go to Homepage</a>
                <a href="/api/profile/anonymous-comments?email=${encodeURIComponent(email)}&action=manage" class="secondary">Manage Comments</a>
              </div>
            </div>
          </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (action === 'manage') {
      // Redirect to a management page
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Manage Your Comments</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background-color: #f9fafb;
              }
              .container {
                max-width: 500px;
                background: white;
                padding: 2rem;
                border-radius: 0.5rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              h1 { color: #111827; margin-bottom: 1rem; text-align: center; }
              p { color: #6b7280; margin-bottom: 1.5rem; }
              .stats {
                background-color: #f3f4f6;
                padding: 1rem;
                border-radius: 0.375rem;
                margin-bottom: 1.5rem;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                text-align: center;
              }
              .stat-label { font-size: 0.875rem; color: #6b7280; }
              .stat-value { font-size: 1.5rem; font-weight: bold; color: #111827; }
              .actions {
                display: flex;
                flex-direction: column;
                gap: 1rem;
              }
              button {
                width: 100%;
                padding: 0.75rem 1.5rem;
                border-radius: 0.375rem;
                border: none;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.2s;
              }
              .hide-btn {
                background-color: #dc2626;
                color: white;
              }
              .hide-btn:hover { background-color: #b91c1c; }
              .show-btn {
                background-color: #10b981;
                color: white;
              }
              .show-btn:hover { background-color: #059669; }
              .home-link {
                display: block;
                text-align: center;
                margin-top: 1rem;
                color: #4f46e5;
                text-decoration: none;
              }
              .home-link:hover { text-decoration: underline; }
              .loading { opacity: 0.6; cursor: not-allowed; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Manage Your Comments</h1>
              <p>Control the visibility of all comments associated with <strong>${email}</strong></p>
              
              <div class="stats" id="stats">
                <div class="stats-grid">
                  <div>
                    <div class="stat-label">Total Comments</div>
                    <div class="stat-value" id="total-count">Loading...</div>
                  </div>
                  <div>
                    <div class="stat-label">Current Status</div>
                    <div class="stat-value" id="status">Loading...</div>
                  </div>
                </div>
              </div>

              <div class="actions">
                <button id="hide-btn" class="hide-btn" onclick="updateVisibility('hide')">
                  Hide All My Comments
                </button>
                <button id="show-btn" class="show-btn" onclick="updateVisibility('show')">
                  Show All My Comments
                </button>
              </div>

              <a href="/" class="home-link">Return to Homepage</a>
            </div>

            <script>
              const email = ${JSON.stringify(email)};
              
              // Load current status
              async function loadStatus() {
                try {
                  const response = await fetch('/api/profile/anonymous-comments?email=' + encodeURIComponent(email));
                  const data = await response.json();
                  
                  // Get comment count
                  const countResponse = await fetch('/api/profile/anonymous-comments/count?email=' + encodeURIComponent(email));
                  const countData = await countResponse.json();
                  
                  document.getElementById('total-count').textContent = countData.total || '0';
                  document.getElementById('status').textContent = countData.hidden > 0 ? 'Hidden' : 'Visible';
                  
                  // Update button states
                  if (countData.hidden > 0) {
                    document.getElementById('hide-btn').style.display = 'none';
                    document.getElementById('show-btn').style.display = 'block';
                  } else {
                    document.getElementById('hide-btn').style.display = 'block';
                    document.getElementById('show-btn').style.display = 'none';
                  }
                } catch (error) {
                  console.error('Error loading status:', error);
                  document.getElementById('total-count').textContent = 'Error';
                  document.getElementById('status').textContent = 'Error';
                }
              }

              async function updateVisibility(action) {
                const btn = document.getElementById(action + '-btn');
                btn.classList.add('loading');
                btn.disabled = true;

                try {
                  const url = '/api/profile/anonymous-comments?email=' + encodeURIComponent(email) + '&action=' + action;
                  window.location.href = url;
                } catch (error) {
                  console.error('Error updating visibility:', error);
                  btn.classList.remove('loading');
                  btn.disabled = false;
                  alert('An error occurred. Please try again.');
                }
              }

              // Load status on page load
              loadStatus();
            </script>
          </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (action === 'show') {
      // Show all comments for this email
      const updateResult = await prisma.comment.updateMany({
        where: { email },
        data: {
          hideRequested: false,
          hideRequestedAt: null,
        },
      });

      // Update user's allowAnonymousComments setting if they have an account
      await prisma.user.updateMany({
        where: { email },
        data: {
          allowAnonymousComments: true, // Enable anonymous comments when showing
        },
      });

      // Redirect to a success page
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Comments Shown</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background-color: #f9fafb;
              }
              .container {
                max-width: 400px;
                background: white;
                padding: 2rem;
                border-radius: 0.5rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                text-align: center;
              }
              h1 { color: #111827; margin-bottom: 0.5rem; }
              p { color: #6b7280; margin-bottom: 1.5rem; }
              .icon {
                width: 48px;
                height: 48px;
                background-color: #d1fae5;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 1rem;
              }
              .icon svg { width: 24px; height: 24px; color: #10b981; }
              a {
                display: inline-block;
                background-color: #4f46e5;
                color: white;
                padding: 0.5rem 1.5rem;
                border-radius: 0.375rem;
                text-decoration: none;
                margin: 0.25rem;
              }
              a:hover { background-color: #4338ca; }
              .secondary {
                background-color: #e5e7eb;
                color: #374151;
              }
              .secondary:hover { background-color: #d1d5db; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h1>Comments Shown</h1>
              <p>All ${updateResult.count} comments associated with your email are now visible.</p>
              <p style="font-size: 0.875rem; color: #9ca3af;">You can change this setting at any time using the manage link in your email.</p>
              <div>
                <a href="/">Go to Homepage</a>
                <a href="/api/profile/anonymous-comments?email=${encodeURIComponent(email)}&action=manage" class="secondary">Manage Comments</a>
              </div>
            </div>
          </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Default behavior - check if a user exists with this email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        allowAnonymousComments: true 
      }
    });

    if (!user) {
      // If no user exists, anonymous comments are allowed by default
      return NextResponse.json({ allowAnonymousComments: true });
    }

    return NextResponse.json({ 
      allowAnonymousComments: user.allowAnonymousComments 
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { allowAnonymousComments } = body;

    if (typeof allowAnonymousComments !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Update the user's allowAnonymousComments setting
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { allowAnonymousComments },
      select: { 
        id: true,
        allowAnonymousComments: true 
      }
    });

    return NextResponse.json({ 
      success: true,
      allowAnonymousComments: updatedUser.allowAnonymousComments 
    });
  } catch (error) {
    console.error('Error updating anonymous comments preference:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { allowAnonymousComments, email } = body;

    if (typeof allowAnonymousComments !== 'boolean' || !email) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Check authorization: either session or valid token
    const session = await getServerSession(authOptions);
    const token = request.headers.get('x-verification-token');
    
    let authorized = false;
    
    // Check if user is logged in and owns this email
    if (session?.user?.email === email) {
      authorized = true;
    }
    
    // Check if valid token for this email
    if (token && !authorized) {
      const verificationToken = await verifyToken(token);
      if (verificationToken && verificationToken.email === email) {
        authorized = true;
      }
    }
    
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the user's allowAnonymousComments setting
    const updatedUsers = await prisma.user.updateMany({
      where: { email },
      data: { allowAnonymousComments },
    });

    return NextResponse.json({ 
      success: true,
      allowAnonymousComments,
      updated: updatedUsers.count 
    });
  } catch (error) {
    console.error('Error updating anonymous comments preference:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}