'use client';

interface LayoutPreviewProps {
  layout: {
    name: string;
    description?: string | null;
    template: string;
  };
}

export default function LayoutPreview({ layout }: LayoutPreviewProps) {
  const template = JSON.parse(layout.template);

  const sectionColors: Record<string, string> = {
    'hero-image': 'bg-blue-100 border-blue-300',
    image: 'bg-green-100 border-green-300',
    info: 'bg-yellow-100 border-yellow-300',
    story: 'bg-purple-100 border-purple-300',
    comments: 'bg-pink-100 border-pink-300',
    'sidebar-info': 'bg-indigo-100 border-indigo-300',
    'main-content': 'bg-gray-100 border-gray-300',
    'gallery-grid': 'bg-teal-100 border-teal-300',
    'basic-info': 'bg-orange-100 border-orange-300',
  };

  const renderPreview = () => {
    const renderSection = (section: string) => (
      <div
        key={section}
        className={`border-2 border-dashed p-4 text-center text-sm font-medium ${
          sectionColors[section] || 'bg-gray-100 border-gray-300'
        }`}
      >
        {section.replace(/-/g, ' ').toUpperCase()}
      </div>
    );

    switch (template.type) {
      case 'grid':
        return (
          <div className={`grid gap-2 grid-cols-${template.columns || 2}`}>
            {template.sections.map(renderSection)}
          </div>
        );

      case 'sidebar-left':
        return (
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <div className="space-y-2">
              {template.sections
                .filter((s: string) => s.includes('sidebar'))
                .map(renderSection)}
            </div>
            <div className="space-y-2">
              {template.sections
                .filter((s: string) => !s.includes('sidebar'))
                .map(renderSection)}
            </div>
          </div>
        );

      case 'sidebar-right':
        return (
          <div className="grid grid-cols-[2fr_1fr] gap-2">
            <div className="space-y-2">
              {template.sections
                .filter((s: string) => !s.includes('sidebar'))
                .map(renderSection)}
            </div>
            <div className="space-y-2">
              {template.sections
                .filter((s: string) => s.includes('sidebar'))
                .map(renderSection)}
            </div>
          </div>
        );

      case 'magazine':
        return (
          <div className="grid grid-cols-3 gap-2">
            {template.sections.map((section: string) => (
              <div
                key={section}
                className={section === 'featured-image' ? 'col-span-2' : ''}
              >
                {renderSection(section)}
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            {template.sections.map(renderSection)}
          </div>
        );
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-2 font-medium">{layout.name}</h3>
      {layout.description && (
        <p className="mb-3 text-sm text-gray-600">{layout.description}</p>
      )}
      <div className="aspect-[4/3] overflow-hidden rounded border bg-gray-50 p-4">
        {renderPreview()}
      </div>
    </div>
  );
}
