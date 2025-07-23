'use client';

import Footer from './Footer';

interface FooterClientProps {
  config?: Record<string, string>;
  townLayout?: string | null;
  townTheme?: string | null;
  townName?: string | null;
  personLayout?: string | null;
  personTheme?: string | null;
}

export default function FooterClient({
  config = {},
  townLayout,
  townTheme,
  townName,
  personLayout,
  personTheme,
}: FooterClientProps) {
  return (
    <Footer
      copyrightText={config.footer_copyright_text}
      townLayout={townLayout}
      townTheme={townTheme}
      townName={townName}
      personLayout={personLayout}
      personTheme={personTheme}
    />
  );
}