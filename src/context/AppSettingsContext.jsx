import React, { createContext, useContext, useEffect, useState } from "react";
import { subscribeAppSettings, setStudentPageEnabled } from "../firebase/appSettingsService";

const AppSettingsContext = createContext({
  studentPageEnabled: true,
  setStudentPageEnabled: async () => {},
  loading: true,
});

export const useAppSettings = () => useContext(AppSettingsContext);

export const AppSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    studentPageEnabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAppSettings((data) => {
      setSettings(data);
      setLoading(false);
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const handleSetStudentPageEnabled = async (enabled) => {
    try {
      await setStudentPageEnabled(enabled);
      // Optimistic update
      setSettings((prev) => ({ ...prev, studentPageEnabled: enabled }));
    } catch (error) {
      console.error("Failed to update student page setting:", error);
      throw error;
    }
  };

  return (
    <AppSettingsContext.Provider
      value={{
        studentPageEnabled: settings.studentPageEnabled,
        setStudentPageEnabled: handleSetStudentPageEnabled,
        loading,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export default AppSettingsContext;
