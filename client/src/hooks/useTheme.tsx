import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  // Initialize theme from localStorage or default to dark
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      updateBodyClasses(savedTheme);
    } else {
      setTheme('dark');
      updateBodyClasses('dark');
    }
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    updateBodyClasses(newTheme);
  };

  // Update body classes based on theme
  const updateBodyClasses = (newTheme: Theme) => {
    if (newTheme === 'dark') {
      document.body.classList.remove('bg-light-bg', 'text-gray-800');
      document.body.classList.add('bg-dark-bg', 'text-gray-100');
    } else {
      document.body.classList.remove('bg-dark-bg', 'text-gray-100');
      document.body.classList.add('bg-light-bg', 'text-gray-800');
    }
  };

  return { theme, toggleTheme };
}
