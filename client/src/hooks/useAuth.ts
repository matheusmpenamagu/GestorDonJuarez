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
      console.log('🔐 === CLIENT AUTH DEBUG ===');
      console.log('🔐 Document cookies:', document.cookie);
      console.log('🔐 Checking server authentication...');
      
      // Check for stored session ID (fallback for Replit proxy cookie issues)
      const storedSessionId = localStorage.getItem('sessionId');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (storedSessionId) {
        headers['Authorization'] = `Bearer ${storedSessionId}`;
        console.log('🔐 Using stored session ID as Authorization header');
      }
      
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
        headers
      });

      console.log('🔐 Auth check response status:', response.status);
      console.log('🔐 Auth check response headers:', Array.from(response.headers.entries()));
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ User authenticated:', userData);
        setUser(userData);
        // Clear any old localStorage auth data
        localStorage.removeItem('beerAuth');
      } else {
        const errorData = await response.json();
        console.log('❌ User not authenticated, response:', JSON.stringify(errorData));
        // Clear stored session if authentication fails
        localStorage.removeItem('sessionId');
        setUser(null);
        // Only redirect if we're not already on login page or public pages
        const publicPaths = ['/', '/dashboard', '/etiquetas', '/public/etiquetas', '/contagem-publica', '/privacidade', '/termos-de-uso'];
        const isPublicPath = publicPaths.some(path => window.location.pathname.startsWith(path));
        if (!isPublicPath) {
          setLocation('/');
        }
      }
    } catch (error) {
      console.error('🚨 Error checking authentication:', error);
      localStorage.removeItem('sessionId');
      setUser(null);
      if (window.location.pathname !== '/') {
        setLocation('/');
      }
    } finally {
      console.log('🔐 === END CLIENT AUTH DEBUG ===');
      setIsLoading(false);
    }
  };

  // Employee login only - no external auth needed

  const logout = async () => {
    console.log('🚪 Logging out...');
    try {
      // Use stored session ID for logout request
      const storedSessionId = localStorage.getItem('sessionId');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (storedSessionId) {
        headers['Authorization'] = `Bearer ${storedSessionId}`;
      }
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    setUser(null);
    localStorage.removeItem('beerAuth');
    localStorage.removeItem('sessionId'); // Clear stored session
    window.location.href = '/';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    checkServerAuth,
  };
}
