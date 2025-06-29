import { useState, useEffect } from "react";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for authentication state in localStorage
    let authData = localStorage.getItem('beerAuth');
    
    // If no auth data exists, create demo user for easy access
    if (!authData) {
      const demoUser = {
        id: 'demo',
        name: 'Matheus Demo',
        email: 'matheus@donjuarez.com.br'
      };
      localStorage.setItem('beerAuth', JSON.stringify(demoUser));
      setUser(demoUser);
    } else {
      try {
        const userData = JSON.parse(authData);
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('beerAuth');
        // Create demo user on error
        const demoUser = {
          id: 'demo',
          name: 'Matheus Demo',
          email: 'matheus@donjuarez.com.br'
        };
        localStorage.setItem('beerAuth', JSON.stringify(demoUser));
        setUser(demoUser);
      }
    }
    setIsLoading(false);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
