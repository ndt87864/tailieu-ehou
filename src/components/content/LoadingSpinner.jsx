import React from "react";
import { useTheme } from "../../context/ThemeContext";

const LoadingSpinner = () => {
  const { theme } = useTheme();

  return (
    <div className="flex justify-center items-center h-full w-full">
      <div
        className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${
          theme === "dark" ? "border-white" : "border-blue-600"
        }`}
      ></div>
    </div>
  );
};

export default LoadingSpinner;
