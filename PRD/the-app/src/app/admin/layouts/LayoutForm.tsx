'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLayout, updateLayout } from '@/app/actions/layouts';
import LayoutPreview from '@/components/layouts/LayoutPreview';
import type { SanitizedLayout } from '@/types/sanitized';

interface LayoutFormProps {
  layout?: SanitizedLayout;
}

const layoutTemplates = [
  {
    type: 'grid',
    name: 'Standard Grid',
    columns: 2,
    sections: ['image', 'info', 'story', 'comments'],
  },
  {
    type: 'stack',
    name: 'Stacked',
    sections: ['image', 'info', 'story', 'comments'],
  },
  {
    type: 'hero',
    name: 'Hero Image',
    sections: ['hero-image', 'info', 'story', 'comments'],
  },
  {
    type: 'sidebar-left',
    name: 'Left Sidebar',
    sections: ['sidebar-info', 'main-content', 'comments'],
  },
  {
    type: 'sidebar-right',
    name: 'Right Sidebar',
    sections: ['main-content', 'sidebar-info', 'comments'],
  },
  {
    type: 'magazine',
    name: 'Magazine Style',
    columns: 3,
    sections: ['featured-image', 'article-content', 'sidebar', 'comments'],
  },
  {
    type: 'minimal',
    name: 'Minimal',
    sections: ['basic-info', 'story', 'comments'],
  },
  {
    type: 'gallery',
    name: 'Gallery Focus',
    sections: ['gallery-grid', 'info', 'story', 'comments'],
  },
  {
    type: 'timeline',
    name: 'Timeline',
    sections: ['header', 'timeline-events', 'story', 'comments'],
  },
  {
    type: 'full-width',
    name: 'Full Width',
    sections: ['banner', 'content-blocks', 'comments'],
  },
];

export default function LayoutForm({ layout }: LayoutFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: layout?.name || '',
    description: layout?.description || '',
    template: layout?.template || JSON.stringify(layoutTemplates[0]),
    cssClasses: layout?.cssClasses || '',
    isActive: layout?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [selectedTemplate, setSelectedTemplate] = useState(
    layout ? JSON.parse(layout.template).type : 'grid'
  );

  useEffect(() => {
    const template = layoutTemplates.find(t => t.type === selectedTemplate);
    if (template) {
      setFormData(prev => ({
        ...prev,
        template: JSON.stringify(template),
      }));
    }
  }, [selectedTemplate]);

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

    const result = layout
      ? await updateLayout(layout.id, formDataToSend)
      : await createLayout(formDataToSend);

    if (result.errors) {
      setErrors(result.errors);
    } else if (result.success) {
      router.push('/admin/layouts');
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
            Layout Name
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
          <label
            htmlFor="template"
            className="block text-sm font-medium text-gray-700"
          >
            Template Type
          </label>
          <select
            id="template"
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {layoutTemplates.map(template => (
              <option key={template.type} value={template.type}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="cssClasses"
            className="block text-sm font-medium text-gray-700"
          >
            Custom CSS Classes (Optional)
          </label>
          <textarea
            id="cssClasses"
            rows={3}
            value={formData.cssClasses}
            onChange={e =>
              setFormData({ ...formData, cssClasses: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-xs"
            placeholder="Enter custom CSS classes or styles"
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
            {layout ? 'Update Layout' : 'Create Layout'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/layouts')}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h2>
        <LayoutPreview
          layout={{
            name: formData.name || 'Untitled Layout',
            description: formData.description,
            template: formData.template,
          }}
        />
      </div>
    </div>
  );
}
