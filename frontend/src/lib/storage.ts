/**
 * Storage utility that uses cookies with localStorage fallback for mobile browsers
 * where third-party cookies might be blocked
 */

// Check if cookies are available and working
const areCookiesAvailable = (): boolean => {
  try {
    document.cookie = 'cookietest=1; SameSite=Lax';
    const cookiesEnabled = document.cookie.indexOf('cookietest=') !== -1;
    document.cookie = 'cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT';
    return cookiesEnabled;
  } catch {
    return false;
  }
}

// Cookie utilities
const setCookie = (name: string, value: string, days: number = 1): void => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  const sameSite = 'SameSite=Lax'; // Lax for better mobile compatibility
  document.cookie = `${name}=${value};${expires};path=/;${sameSite}`;
}

const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

const deleteCookie = (name: string): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// Storage strategy detection
const useCookies = areCookiesAvailable();

export const storage = {
  /**
   * Set an item in storage (cookies or localStorage fallback)
   */
  setItem: (key: string, value: string): void => {
    try {
      if (useCookies) {
        setCookie(key, value, 1); // 1 day expiry
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Failed to set storage item:', error);
      // Fallback to localStorage if cookie setting fails
      try {
        localStorage.setItem(key, value);
      } catch (localStorageError) {
        console.error('LocalStorage also failed:', localStorageError);
      }
    }
  },

  /**
   * Get an item from storage (cookies or localStorage fallback)
   */
  getItem: (key: string): string | null => {
    try {
      if (useCookies) {
        const cookieValue = getCookie(key);
        // If cookie doesn't exist, check localStorage as fallback
        if (!cookieValue) {
          return localStorage.getItem(key);
        }
        return cookieValue;
      } else {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error('Failed to get storage item:', error);
      // Try localStorage as fallback
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
  },

  /**
   * Remove an item from storage (both cookies and localStorage)
   */
  removeItem: (key: string): void => {
    try {
      if (useCookies) {
        deleteCookie(key);
      }
      // Always clear from localStorage too to ensure cleanup
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove storage item:', error);
    }
  },

  /**
   * Clear all auth-related storage
   */
  clear: (): void => {
    try {
      // Remove common auth keys
      ['token', 'user', 'organization'].forEach(key => {
        storage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  },

  /**
   * Get the current storage strategy being used
   */
  getStrategy: (): 'cookies' | 'localStorage' => {
    return useCookies ? 'cookies' : 'localStorage';
  }
}

export default storage;
