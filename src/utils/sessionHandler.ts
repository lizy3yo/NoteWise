/**
 * Session expiration handler
 * Monitors API responses for 401 errors and shows session expiration notification
 */

let sessionExpiredShown = false;

export function handleSessionExpiration() {
  if (sessionExpiredShown) return;
  
  sessionExpiredShown = true;
  
  // Dispatch custom event for session expiration
  const event = new CustomEvent('session:expired', {
    detail: {
      message: 'Your session has expired. Please log in again.',
      title: 'Session Expired'
    }
  });
  window.dispatchEvent(event);
  
  // Clear tokens
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  // Redirect to login after a short delay
  setTimeout(() => {
    const currentPath = window.location.pathname;
    window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}&expired=true`;
  }, 2000);
}

export function resetSessionExpiredFlag() {
  sessionExpiredShown = false;
}

/**
 * Intercept fetch to check for 401 responses
 */
export function setupSessionMonitoring() {
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      
      // Check if response is 401 Unauthorized
      if (response.status === 401) {
        // Extract URL from fetch arguments
        let url = '';
        if (typeof args[0] === 'string') {
          url = args[0];
        } else if (args[0] instanceof Request) {
          url = args[0].url;
        } else if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
          url = String(args[0].url);
        }
        
        // Ignore 401 from login/logout endpoints
        if (!url.includes('/auth/login') && !url.includes('/auth/logout')) {
          handleSessionExpiration();
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };
}
