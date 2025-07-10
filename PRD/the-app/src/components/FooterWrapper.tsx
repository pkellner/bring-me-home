import { getSiteTextConfig } from '@/lib/config';
import Footer from './Footer';

interface FooterWrapperProps {
  townLayout?: string | null;
  townTheme?: string | null;
  townName?: string | null;
  personLayout?: string | null;
  personTheme?: string | null;
}

export default async function FooterWrapper(props: FooterWrapperProps) {
  const config = await getSiteTextConfig();
  const currentYear = new Date().getFullYear();
  const copyrightText = `© ${currentYear} ${
    config.copyright_text ||
    'Bring Me Home. Together, we can bring our loved ones home.'
  }`;

  return <Footer {...props} copyrightText={copyrightText} />;
}
