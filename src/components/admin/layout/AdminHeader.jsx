import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../firebase/firebase";
import { useTheme } from "../../../context/ThemeContext";
import ThemeColorPicker from "../../ThemeColorPicker";

const AdminHeader = ({ title, user, setIsSidebarOpen }) => {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const navigate = useNavigate();
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header
      className={`px-4 py-3 ${
        isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
      } shadow-sm flex items-center justify-between`}
    >
      <div className="flex items-center">
        <button
          className={`p-2 rounded-md ${
            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
          } md:hidden`}
          onClick={() => setIsSidebarOpen(true)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <h1 className="text-xl font-medium ml-2">{title}</h1>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={() => setIsThemePickerOpen(true)}
          className={`p-2 rounded-full ${
            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
          }`}
          title="Tuỳ chỉnh giao diện"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
            </div>
            <span className="hidden md:block text-sm font-medium truncate max-w-[100px]">
              {user?.displayName || "Admin"}
            </span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isUserMenuOpen && (
            <div
              className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 ${
                isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
              }`}
            >
              <div
                className={`px-4 py-2 ${
                  isDarkMode
                    ? "border-b border-gray-700"
                    : "border-b border-gray-200"
                }`}
              >
                <p className="text-sm font-medium truncate">
                  {user?.displayName || "Admin"}
                </p>
                <p
                  className={`text-xs truncate ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {user?.email}
                </p>
              </div>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate("/profile");
                }}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                Tài khoản của tôi
              </button>

              <button
                onClick={handleSignOut}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />
    </header>
  );
};

export default AdminHeader;
