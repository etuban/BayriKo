import { useState, useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');
  const { setTheme: setNextTheme, resolvedTheme } = useNextTheme();

  // Initialize theme from next-themes
  useEffect(() => {
    if (resolvedTheme === 'dark' || resolvedTheme === 'light') {
      setTheme(resolvedTheme);
    }
  }, [resolvedTheme]);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setNextTheme(newTheme);
    
    // Also update body classes for components that don't use next-themes
    updateBodyClasses(newTheme);
    
    // Store in localStorage for persistence
    localStorage.setItem('theme', newTheme);
  };

  // Update body classes based on theme
  const updateBodyClasses = (newTheme: Theme) => {
    // First, handle document class for Tailwind dark mode
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Then handle body classes for custom styling
    if (newTheme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      
      // Legacy classes
      document.body.classList.remove('bg-light-bg', 'text-gray-800');
      document.body.classList.add('bg-dark-bg', 'text-gray-100');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      
      // Legacy classes
      document.body.classList.remove('bg-dark-bg', 'text-gray-100');
      document.body.classList.add('bg-light-bg', 'text-gray-800');
    }
  };

  return { theme, toggleTheme };
}
