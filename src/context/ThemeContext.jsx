import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { saveUserThemePreference, getUserThemePreference } from '../firebase/firestoreService';

// Define theme color constants
export const THEME_COLORS = {
  DEFAULT: 'emerald', // Changed from 'green' to 'emerald'
  BLUE: 'blue',
  RED: 'red',
  PURPLE: 'purple',
  YELLOW: 'yellow',
  BROWN: 'brown',
  BLACK: 'black',
  WHITE: 'white'
};

export const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? JSON.parse(savedMode) : false;
  });
  const [themeColor, setThemeColor] = useState(THEME_COLORS.DEFAULT);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [user] = useAuthState(auth);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastAppliedTheme, setLastAppliedTheme] = useState(null);

  // Load theme preferences on initial load and when user changes
  useEffect(() => {
    const loadThemePreferences = async () => {
      try {
        // First check localStorage for theme settings
        const savedDarkMode = localStorage.getItem('darkMode');
        const savedThemeColor = localStorage.getItem('themeColor');
        
        // Set initial values from localStorage if available
        if (savedDarkMode !== null) {
          setIsDarkMode(JSON.parse(savedDarkMode));
        }
        
        if (savedThemeColor) {
          setThemeColor(savedThemeColor);
        }
        
        // If user is logged in, try to get their preferences from Firestore
        if (user) {
          const userPrefs = await getUserThemePreference(user.uid);
          
          if (userPrefs) {
            // If we got preferences from the database, use those and update localStorage
            if (userPrefs.isDarkMode !== undefined) {
              setIsDarkMode(userPrefs.isDarkMode);
              localStorage.setItem('darkMode', JSON.stringify(userPrefs.isDarkMode));
            }
            
            if (userPrefs.themeColor) {
              setThemeColor(userPrefs.themeColor);
              localStorage.setItem('themeColor', userPrefs.themeColor);
            }
          } else {
            // If no prefs in database but we have local settings, sync to database
            if (savedDarkMode !== null || savedThemeColor) {
              await saveUserThemePreference(user.uid, {
                isDarkMode: savedDarkMode !== null ? JSON.parse(savedDarkMode) : false,
                themeColor: savedThemeColor || THEME_COLORS.DEFAULT
              });
            }
          }
        }
        
        // Mark initialization complete
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading theme preferences:', error);
        setIsInitialized(true);
      }
    };

    loadThemePreferences();
  }, [user]);

  // Apply dark mode class to HTML element
  useEffect(() => {
    if (!isInitialized) return;
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Always update localStorage to ensure persistence
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode, isInitialized]);

  // Apply theme color to document when it changes
  useEffect(() => {
    if (!isInitialized) return;
    
    // Only apply if theme actually changed
    if (lastAppliedTheme !== themeColor) {
      applyThemeColorToDocument(themeColor);
      setLastAppliedTheme(themeColor);
      
      // Always update localStorage to ensure persistence
      localStorage.setItem('themeColor', themeColor);
    }
  }, [themeColor, isInitialized, lastAppliedTheme]);

  // Function to apply theme color to document
  const applyThemeColorToDocument = (color) => {
    // Remove all existing theme color classes
    const root = document.documentElement;
    Object.values(THEME_COLORS).forEach(themeClass => {
      root.classList.remove(`theme-${themeClass}`);
    });

    // Add the new theme color class
    if (color && color !== THEME_COLORS.DEFAULT) {
      root.classList.add(`theme-${color}`);
    }
    
    
    // Also set a CSS variable for components that use it directly
    document.documentElement.style.setProperty('--theme-color', color);
  };

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
    
    // Sync to database if user is logged in
    if (user) {
      try {
        await saveUserThemePreference(user.uid, {
          isDarkMode: newDarkMode,
          themeColor
        });
      } catch (error) {
        console.error('Error saving dark mode preference to database:', error);
      }
    }
  };

  const changeThemeColor = async (color) => {
    setThemeColor(color);
    localStorage.setItem('themeColor', color);
    
    // Sync to database if user is logged in
    if (user) {
      try {
        await saveUserThemePreference(user.uid, {
          isDarkMode,
          themeColor: color
        });
      } catch (error) {
        console.error('Error saving theme color preference to database:', error);
      }
    }
    
    // Don't call applyThemeColorToDocument here - let useEffect handle it
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        isDarkMode, 
        toggleDarkMode, 
        themeColor, 
        changeThemeColor,
        THEME_COLORS,
        isThemePickerOpen,
        setIsThemePickerOpen,
        isThemeInitialized: isInitialized
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;