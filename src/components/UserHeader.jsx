import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme, THEME_COLORS } from "../context/ThemeContext";
import { useUserRole } from "../context/UserRoleContext";
import { useSidebar } from "../context/SidebarContext";
import { auth } from "../firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import ThemeColorPicker from "./ThemeColorPicker";
import { signOut } from "firebase/auth";

// Helper function to check and handle domain redirection
const checkDomainAndRedirect = () => {
  const currentDomain = window.location.hostname;
  const newDomain = "tailieuehou.id.vn";

  if (currentDomain !== newDomain && currentDomain !== "localhost") {
    window.location.href = `https://${newDomain}${window.location.pathname}${window.location.search}${window.location.hash}`;
    return true;
  }
  return false;
};

// Fix the missing logoutUser function
const logoutUser = async () => {
  try {
    // Call Firebase signOut
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

const UserHeader = ({ title }) => {
  // Run domain check on component mount
  // useEffect(() => {
  //   checkDomainAndRedirect();
  // }, []);

  const { isDarkMode, toggleDarkMode } = useTheme();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Any additional actions after logout

      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleAccountClick = () => {
    setIsDropdownOpen(false);
    navigate("/profile");
  };

  const handleThemeClick = () => {
    setIsDropdownOpen(false);
    setIsThemePickerOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <header
      className={`${
        isDarkMode
          ? "bg-gray-900 border-gray-700 text-white"
          : "bg-slate-50 border-gray-200 text-gray-900"
      } px-6 py-3 flex items-center justify-between border-b sticky top-0 z-10 shadow-md border-l-0`}
    >
      <div className="flex items-center">
        <h1
          className={`text-xl font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {title || "Tài liệu HOU"}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsThemePickerOpen(true)}
          className={`p-2 rounded-full ${
            isDarkMode
              ? "hover:bg-gray-700 text-gray-300"
              : "hover:bg-gray-100 text-gray-900"
          } transition-colors`}
          aria-label="Tùy chỉnh giao diện"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
        </button>

        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                isDarkMode
                  ? "hover:bg-gray-700 text-white"
                  : "hover:bg-gray-100 text-gray-900"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-200 text-gray-600"
                } flex items-center justify-center`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    className="w-8 h-8 rounded-full"
                    alt={user.displayName || "Ảnh đại diện"}
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <span className="font-medium">
                {user.displayName
                  ? user.displayName.split(" ")[0]
                  : "Tài khoản"}
              </span>
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </button>
            {isDropdownOpen && (
              <div
                className={`absolute right-0 mt-2 w-48 py-1 rounded-md shadow-lg z-10 border-2 ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-300"
                }`}
                style={{
                  backdropFilter: "blur(0px)",
                  backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                }}
              >
                <button
                  onClick={handleAccountClick}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    isDarkMode
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg
                    className="w-4 h-4 inline mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    ></path>
                  </svg>
                  Tài khoản của tôi
                </button>

                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                <button
                  onClick={handleLogout}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    isDarkMode
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg
                    className="w-4 h-4 inline mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    ></path>
                  </svg>
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className={`px-2 py-1 rounded-full transition-colors flex items-center gap-1 ${
              isDarkMode
                ? "hover:bg-gray-700 text-white"
                : "hover:bg-gray-100 text-gray-900"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">Đăng nhập</span>
          </button>
        )}
      </div>

      {/* ThemeColorPicker */}
      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />
    </header>
  );
};

export default UserHeader;
