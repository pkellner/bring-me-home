'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Theme } from '@prisma/client';
import { createTheme, updateTheme } from '@/app/actions/themes';
import ThemeEditor from '@/components/themes/ThemeEditor';
import ThemePreview from '@/components/themes/ThemePreview';

interface ThemeFormProps {
  theme?: Theme;
}

export default function ThemeForm({ theme }: ThemeFormProps) {
  const router = useRouter();
  const initialColors = theme ? JSON.parse(theme.colors) : undefined;

  const [formData, setFormData] = useState({
    name: theme?.name || '',
    description: theme?.description || '',
    colors:
      theme?.colors ||
      JSON.stringify({
        primary: '#3B82F6',
        secondary: '#6366F1',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#111827',
      }),
    cssVars: theme?.cssVars || '',
    isActive: theme?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleColorsChange = (colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  }) => {
    const colorString = JSON.stringify(colors);
    const cssVars = `:root {
  --primary: ${colors.primary};
  --secondary: ${colors.secondary};
  --accent: ${colors.accent};
  --background: ${colors.background};
  --text: ${colors.text};
}`;

    setFormData(prev => ({
      ...prev,
      colors: colorString,
      cssVars,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        formDataToSend.append(key, value ? 'on' : '');
      } else {
        formDataToSend.append(key, value);
      }
    });

    const result = theme
      ? await updateTheme(theme.id, formDataToSend)
      : await createTheme(formDataToSend);

    if (result.errors) {
      setErrors(result.errors);
    } else if (result.success) {
      router.push('/admin/themes');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Theme Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={e =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Theme Colors
          </h3>
          <ThemeEditor
            initialColors={initialColors}
            onChange={handleColorsChange}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={e =>
              setFormData({ ...formData, isActive: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label
            htmlFor="isActive"
            className="ml-2 block text-sm text-gray-900"
          >
            Active
          </label>
        </div>

        {errors._form && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{errors._form[0]}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {theme ? 'Update Theme' : 'Create Theme'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/themes')}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="lg:sticky lg:top-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Theme Preview
        </h2>
        <ThemePreview
          theme={{
            name: formData.name || 'Untitled Theme',
            description: formData.description,
            colors: formData.colors,
            cssVars: formData.cssVars,
          }}
        />
      </div>
    </div>
  );
}
