'use client';

import { useState } from 'react';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

interface ThemeEditorProps {
  initialColors?: ThemeColors;
  onChange: (colors: ThemeColors) => void;
}

export default function ThemeEditor({ 
  initialColors = {
    primary: '#3B82F6',
    secondary: '#6366F1',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#111827',
  },
  onChange 
}: ThemeEditorProps) {
  const [colors, setColors] = useState<ThemeColors>(initialColors);

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    const newColors = { ...colors, [key]: value };
    setColors(newColors);
    onChange(newColors);
  };

  const presetThemes = [
    {
      name: 'Ocean Blue',
      colors: {
        primary: '#0EA5E9',
        secondary: '#0284C7',
        accent: '#F59E0B',
        background: '#F0F9FF',
        text: '#0C4A6E',
      },
    },
    {
      name: 'Forest Green',
      colors: {
        primary: '#10B981',
        secondary: '#059669',
        accent: '#F59E0B',
        background: '#ECFDF5',
        text: '#064E3B',
      },
    },
    {
      name: 'Sunset Orange',
      colors: {
        primary: '#F97316',
        secondary: '#EA580C',
        accent: '#EAB308',
        background: '#FFF7ED',
        text: '#7C2D12',
      },
    },
    {
      name: 'Purple Dream',
      colors: {
        primary: '#9333EA',
        secondary: '#7C3AED',
        accent: '#EC4899',
        background: '#FAF5FF',
        text: '#4C1D95',
      },
    },
  ];

  const applyPreset = (preset: typeof presetThemes[0]) => {
    setColors(preset.colors);
    onChange(preset.colors);
  };

  return (
    <div className="space-y-6">
      {/* Preset themes */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-700">Preset Themes</h3>
        <div className="grid grid-cols-2 gap-2">
          {presetThemes.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="rounded-lg border p-3 text-left hover:bg-gray-50"
            >
              <div className="mb-2 text-sm font-medium">{preset.name}</div>
              <div className="flex gap-1">
                {Object.values(preset.colors).slice(0, 4).map((color, idx) => (
                  <div
                    key={idx}
                    className="h-6 w-6 rounded"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Color pickers */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-700">Custom Colors</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Primary Color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={colors.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="h-10 w-20"
              />
              <input
                type="text"
                value={colors.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="rounded-md border px-3 py-1 text-sm"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Secondary Color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={colors.secondary}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="h-10 w-20"
              />
              <input
                type="text"
                value={colors.secondary}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="rounded-md border px-3 py-1 text-sm"
                placeholder="#6366F1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Accent Color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={colors.accent}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="h-10 w-20"
              />
              <input
                type="text"
                value={colors.accent}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="rounded-md border px-3 py-1 text-sm"
                placeholder="#F59E0B"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Background Color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={colors.background}
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="h-10 w-20"
              />
              <input
                type="text"
                value={colors.background}
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="rounded-md border px-3 py-1 text-sm"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Text Color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={colors.text}
                onChange={(e) => handleColorChange('text', e.target.value)}
                className="h-10 w-20"
              />
              <input
                type="text"
                value={colors.text}
                onChange={(e) => handleColorChange('text', e.target.value)}
                className="rounded-md border px-3 py-1 text-sm"
                placeholder="#111827"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-700">Live Preview</h3>
        <div
          className="rounded-lg p-6"
          style={{
            backgroundColor: colors.background,
            color: colors.text,
            border: `2px solid ${colors.primary}`,
          }}
        >
          <h4
            className="mb-3 text-xl font-bold"
            style={{ color: colors.primary }}
          >
            Sample Heading
          </h4>
          <p className="mb-4" style={{ color: colors.text }}>
            This is how your content will look with these colors. The theme colors
            will be applied throughout the entire page.
          </p>
          <div className="flex gap-2">
            <button
              className="rounded px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: colors.primary,
                color: colors.background,
              }}
            >
              Primary Button
            </button>
            <button
              className="rounded px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: colors.secondary,
                color: colors.background,
              }}
            >
              Secondary Button
            </button>
            <button
              className="rounded px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: colors.accent,
                color: colors.background,
              }}
            >
              Accent Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}