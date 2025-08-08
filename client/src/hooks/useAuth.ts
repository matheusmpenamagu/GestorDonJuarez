import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check for authentication state in localStorage
    const authData = localStorage.getItem('beerAuth');
    if (authData) {
      try {
        const userData = JSON.parse(authData);
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('beerAuth');
      }
    }
    setIsLoading(false);

    // Listen for storage changes (logout from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'beerAuth' && !e.newValue) {
        // Auth data was removed, redirect to login
        setUser(null);
        setLocation('/');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setLocation]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
