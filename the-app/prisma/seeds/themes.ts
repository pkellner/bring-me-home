import { PrismaClient, Theme } from '@prisma/client';

export async function seedThemes(prisma: PrismaClient): Promise<Theme[]> {
  const themesData = [
    {
      name: 'Default Blue',
      description: 'Clean blue theme with good contrast',
      colors: JSON.stringify({
        primary: '#2563eb',
        secondary: '#3b82f6',
        accent: '#60a5fa',
        background: '#ffffff',
        text: '#1f2937',
        border: '#e5e7eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      }),
      cssVars: `
        --color-primary: #2563eb;
        --color-secondary: #3b82f6;
        --color-accent: #60a5fa;
        --color-background: #ffffff;
        --color-text: #1f2937;
        --color-border: #e5e7eb;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --color-error: #ef4444;
      `,
      isActive: true
    },
    {
      name: 'Hope Green',
      description: 'Calming green theme symbolizing hope',
      colors: JSON.stringify({
        primary: '#059669',
        secondary: '#10b981',
        accent: '#34d399',
        background: '#ffffff',
        text: '#064e3b',
        border: '#d1fae5',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      }),
      cssVars: `
        --color-primary: #059669;
        --color-secondary: #10b981;
        --color-accent: #34d399;
        --color-background: #ffffff;
        --color-text: #064e3b;
        --color-border: #d1fae5;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --color-error: #ef4444;
      `,
      isActive: true
    },
    {
      name: 'Sunset Warm',
      description: 'Warm colors inspired by California sunsets',
      colors: JSON.stringify({
        primary: '#dc2626',
        secondary: '#f87171',
        accent: '#fbbf24',
        background: '#fffbeb',
        text: '#451a03',
        border: '#fed7aa',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      }),
      cssVars: `
        --color-primary: #dc2626;
        --color-secondary: #f87171;
        --color-accent: #fbbf24;
        --color-background: #fffbeb;
        --color-text: #451a03;
        --color-border: #fed7aa;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --color-error: #ef4444;
      `,
      isActive: true
    },
    {
      name: 'Ocean',
      description: 'Deep ocean blues and teals',
      colors: JSON.stringify({
        primary: '#0891b2',
        secondary: '#06b6d4',
        accent: '#67e8f9',
        background: '#f0fdfa',
        text: '#134e4a',
        border: '#5eead4',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      }),
      cssVars: `
        --color-primary: #0891b2;
        --color-secondary: #06b6d4;
        --color-accent: #67e8f9;
        --color-background: #f0fdfa;
        --color-text: #134e4a;
        --color-border: #5eead4;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --color-error: #ef4444;
      `,
      isActive: true
    },
    {
      name: 'Night',
      description: 'Dark theme for reduced eye strain',
      colors: JSON.stringify({
        primary: '#818cf8',
        secondary: '#a78bfa',
        accent: '#c7d2fe',
        background: '#1e1b4b',
        text: '#e0e7ff',
        border: '#4c1d95',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171'
      }),
      cssVars: `
        --color-primary: #818cf8;
        --color-secondary: #a78bfa;
        --color-accent: #c7d2fe;
        --color-background: #1e1b4b;
        --color-text: #e0e7ff;
        --color-border: #4c1d95;
        --color-success: #34d399;
        --color-warning: #fbbf24;
        --color-error: #f87171;
      `,
      isActive: true
    },
    {
      name: 'Earth',
      description: 'Natural earth tones',
      colors: JSON.stringify({
        primary: '#92400e',
        secondary: '#b45309',
        accent: '#d97706',
        background: '#fef3c7',
        text: '#451a03',
        border: '#f59e0b',
        success: '#059669',
        warning: '#dc2626',
        error: '#b91c1c'
      }),
      cssVars: `
        --color-primary: #92400e;
        --color-secondary: #b45309;
        --color-accent: #d97706;
        --color-background: #fef3c7;
        --color-text: #451a03;
        --color-border: #f59e0b;
        --color-success: #059669;
        --color-warning: #dc2626;
        --color-error: #b91c1c;
      `,
      isActive: true
    },
    {
      name: 'Purple Dream',
      description: 'Rich purple theme',
      colors: JSON.stringify({
        primary: '#7c3aed',
        secondary: '#8b5cf6',
        accent: '#a78bfa',
        background: '#faf5ff',
        text: '#2e1065',
        border: '#ddd6fe',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      }),
      cssVars: `
        --color-primary: #7c3aed;
        --color-secondary: #8b5cf6;
        --color-accent: #a78bfa;
        --color-background: #faf5ff;
        --color-text: #2e1065;
        --color-border: #ddd6fe;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --color-error: #ef4444;
      `,
      isActive: true
    },
    {
      name: 'Rose Garden',
      description: 'Soft rose and pink tones',
      colors: JSON.stringify({
        primary: '#e11d48',
        secondary: '#f43f5e',
        accent: '#fb7185',
        background: '#fff1f2',
        text: '#881337',
        border: '#fecdd3',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#be123c'
      }),
      cssVars: `
        --color-primary: #e11d48;
        --color-secondary: #f43f5e;
        --color-accent: #fb7185;
        --color-background: #fff1f2;
        --color-text: #881337;
        --color-border: #fecdd3;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --color-error: #be123c;
      `,
      isActive: true
    },
    {
      name: 'Slate Professional',
      description: 'Professional grayscale theme',
      colors: JSON.stringify({
        primary: '#475569',
        secondary: '#64748b',
        accent: '#94a3b8',
        background: '#ffffff',
        text: '#0f172a',
        border: '#e2e8f0',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      }),
      cssVars: `
        --color-primary: #475569;
        --color-secondary: #64748b;
        --color-accent: #94a3b8;
        --color-background: #ffffff;
        --color-text: #0f172a;
        --color-border: #e2e8f0;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --color-error: #ef4444;
      `,
      isActive: true
    },
    {
      name: 'Solidarity Orange',
      description: 'Bright orange theme for solidarity',
      colors: JSON.stringify({
        primary: '#ea580c',
        secondary: '#f97316',
        accent: '#fb923c',
        background: '#fff7ed',
        text: '#431407',
        border: '#fed7aa',
        success: '#10b981',
        warning: '#dc2626',
        error: '#b91c1c'
      }),
      cssVars: `
        --color-primary: #ea580c;
        --color-secondary: #f97316;
        --color-accent: #fb923c;
        --color-background: #fff7ed;
        --color-text: #431407;
        --color-border: #fed7aa;
        --color-success: #10b981;
        --color-warning: #dc2626;
        --color-error: #b91c1c;
      `,
      isActive: true
    }
  ];

  const createdThemes: Theme[] = [];

  for (const themeData of themesData) {
    const theme = await prisma.theme.create({
      data: themeData
    });
    createdThemes.push(theme);
    console.log(`  ✓ Created theme: ${theme.name}`);
  }

  return createdThemes;
}