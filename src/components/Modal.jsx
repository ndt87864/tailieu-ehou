import React, { useEffect, useState } from "react";

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = "",
  fullScreenOnMobile = false 
}) => {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    
    // Prevent body scroll when modal is open on mobile
    if (windowWidth < 770) {
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, windowWidth]);

  if (!isOpen) return null;

  const isMobile = windowWidth < 770;
  const shouldFullScreen = fullScreenOnMobile && isMobile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-60" onClick={onClose} />

      <div
        className={`relative z-60 ${
          shouldFullScreen
            ? "w-full h-full"
            : "max-w-3xl w-[95%] sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto max-h-[90vh]"
        } ${className}`}
        role="dialog"
        aria-modal="true"
      >
        <div className={`bg-white dark:bg-gray-800 shadow-xl overflow-hidden border-2 dark:border-gray-700 flex flex-col ${
          shouldFullScreen ? "h-full" : "rounded-lg max-h-[90vh]"
        }`}>
          {/* Header */}
          <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0 ${
            shouldFullScreen ? "sticky top-0 bg-white dark:bg-gray-800 z-10" : ""
          }`}>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 truncate pr-4">
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 -mr-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className={`p-4 sm:p-6 overflow-y-auto flex-1 ${
            shouldFullScreen ? "pb-safe" : ""
          }`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
