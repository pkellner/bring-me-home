'use client';

import Footer from './Footer';

interface FooterClientProps {
  config?: Record<string, string>;
  townTheme?: string | null;
  townName?: string | null;
  personTheme?: string | null;
}

export default function FooterClient({
  config = {},
  townTheme,
  townName,
  personTheme,
}: FooterClientProps) {
  return (
    <Footer
      copyrightText={config.footer_copyright_text}
      townTheme={townTheme}
      townName={townName}
      personTheme={personTheme}
    />
  );
}