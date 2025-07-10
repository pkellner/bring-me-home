import { shouldShowSystemOverrideCredentials } from '@/lib/auth-protection';
import SignInClient from './SignInClient';

export default async function SignInPage() {
  const showSystemOverrideLink = shouldShowSystemOverrideCredentials();
  
  return <SignInClient showSystemOverrideLink={showSystemOverrideLink} />;
}