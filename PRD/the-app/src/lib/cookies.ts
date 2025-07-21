// Native cookie utilities (no external dependencies)

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const nameEQ = name + "=";
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length, cookie.length);
    }
  }
  return null;
}

export function setCookie(
  name: string, 
  value: string, 
  options: {
    expires?: number; // days
    path?: string;
    sameSite?: 'strict' | 'lax' | 'none';
    secure?: boolean;
  } = {}
): void {
  if (typeof document === 'undefined') return;
  
  const {
    expires = 365,
    path = '/',
    sameSite = 'lax',
    secure = false
  } = options;
  
  const date = new Date();
  date.setTime(date.getTime() + (expires * 24 * 60 * 60 * 1000));
  const expiresStr = "expires=" + date.toUTCString();
  
  let cookieString = `${name}=${value};${expiresStr};path=${path}`;
  
  if (sameSite) {
    cookieString += `;SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`;
  }
  
  if (secure) {
    cookieString += ';Secure';
  }
  
  document.cookie = cookieString;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  
  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
}