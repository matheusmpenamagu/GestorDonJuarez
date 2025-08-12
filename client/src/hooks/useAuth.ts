import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    checkServerAuth();
  }, [setLocation]);

  const checkServerAuth = async () => {
    setIsLoading(true);
    try {
      console.log('🔐 Checking server authentication...');
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });

      console.log('🔐 Auth check response status:', response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ User authenticated:', userData);
        setUser(userData);
        // Clear any old localStorage auth data
        localStorage.removeItem('beerAuth');
      } else {
        console.log('❌ User not authenticated, response:', await response.text());
        setUser(null);
        // Only redirect if we're not already on login page
        if (window.location.pathname !== '/') {
          setLocation('/');
        }
      }
    } catch (error) {
      console.error('🚨 Error checking authentication:', error);
      setUser(null);
      if (window.location.pathname !== '/') {
        setLocation('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    console.log('🔄 Redirecting to Replit login...');
    window.location.href = '/api/login';
  };

  const logout = async () => {
    console.log('🚪 Logging out...');
    try {
      await fetch('/api/logout', {
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    setUser(null);
    localStorage.removeItem('beerAuth');
    window.location.href = '/';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkServerAuth,
  };
}
