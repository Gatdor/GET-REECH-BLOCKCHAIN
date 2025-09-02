import React, { createContext, useState } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ 
      theme: theme === 'light' ? {
        background: '#f7fafc',
        backgroundSecondary: '#e2e8f0',
        text: '#2d3748',
        primary: '#2b6cb0',
        primaryHover: '#4299e1',
        primaryLight: '#63b3ed',
        card: '#ffffff',
        border: '#edf2f7',
        disabled: '#a0aec0'
      } : {
        background: '#1a202c',
        backgroundSecondary: '#2d3748',
        text: '#e2e8f0',
        primary: '#63b3ed',
        primaryHover: '#90cdf4',
        primaryLight: '#bee3f8',
        card: '#2d3748',
        border: '#4a5568',
        disabled: '#718096'
      },
      setTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};