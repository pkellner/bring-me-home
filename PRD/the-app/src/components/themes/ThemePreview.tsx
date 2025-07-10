'use client';

interface ThemePreviewProps {
  theme: {
    name: string;
    description?: string | null;
    colors: string;
    cssVars?: string | null;
  };
}

export default function ThemePreview({ theme }: ThemePreviewProps) {
  const colors = JSON.parse(theme.colors);

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-2 font-medium">{theme.name}</h3>
      {theme.description && (
        <p className="mb-3 text-sm text-gray-600">{theme.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded"
            style={{ backgroundColor: colors.primary }}
          />
          <span className="text-sm">Primary: {colors.primary}</span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded"
            style={{ backgroundColor: colors.secondary }}
          />
          <span className="text-sm">Secondary: {colors.secondary}</span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded"
            style={{ backgroundColor: colors.accent }}
          />
          <span className="text-sm">Accent: {colors.accent}</span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded border"
            style={{ backgroundColor: colors.background }}
          />
          <span className="text-sm">Background: {colors.background}</span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded border"
            style={{ backgroundColor: colors.text }}
          />
          <span className="text-sm">Text: {colors.text}</span>
        </div>
      </div>

      {/* Preview card */}
      <div
        className="mt-4 rounded-lg p-4"
        style={{
          backgroundColor: colors.background,
          color: colors.text,
          border: `2px solid ${colors.primary}`,
        }}
      >
        <h4 className="mb-2 font-semibold" style={{ color: colors.primary }}>
          Sample Card
        </h4>
        <p className="text-sm" style={{ color: colors.text }}>
          This is how content will look with this theme.
        </p>
        <button
          className="mt-2 rounded px-3 py-1 text-sm"
          style={{
            backgroundColor: colors.accent,
            color: colors.background,
          }}
        >
          Action Button
        </button>
      </div>
    </div>
  );
}
