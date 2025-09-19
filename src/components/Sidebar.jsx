import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getDocumentsByCategory } from "../firebase/firestoreService";
import { useTheme } from "../context/ThemeContext";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/firebase";
import ThemeColorPicker from "./ThemeColorPicker";
import { useSafeAdminCheck } from "../utils/adminHelper"; // Sử dụng helper function
import { optimizedGetDocumentsByCategory } from "../utils/queryOptimizer";

// Helper function to convert string to slug
const toSlug = (str) => {
  return str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "_");
};

// Helper function to get icon component based on logo id
const getCategoryIcon = (logoId) => {
  // Default icon if no logo is specified
  if (!logoId) {
    return (
      <svg
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        ></path>
      </svg>
    );
  }

  // Map of logo ids to their SVG components
  const logoMap = {
    business: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    economics: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    accounting: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    finance: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    management: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    marketing: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
        />
      </svg>
    ),
    law: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
        />
      </svg>
    ),
    technology: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    science: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
    ),
    education: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 14l9-5-9-5-9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
        />
      </svg>
    ),
    language: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
    ),
    statistics: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
        />
      </svg>
    ),
    mathematics: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8"
        />
      </svg>
    ),
    international: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    social: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    political: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
        />
      </svg>
    ),
    history: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return logoMap[logoId] || getCategoryIcon(null); // Return default if logo not found
};

// Helper function to get icon component based on logo id
const getLogoIcon = (logoId) => {
  // Default icon if no logo is specified
  if (!logoId) {
    return (
      <svg
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        ></path>
      </svg>
    );
  }

  // Map of logo ids to their SVG components - use same mapping as category icons but smaller size
  const logoMap = {
    business: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    economics: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    accounting: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    finance: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    management: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    marketing: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
        />
      </svg>
    ),
    law: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
        />
      </svg>
    ),
    technology: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    science: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
    ),
    education: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 14l9-5-9-5-9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
        />
      </svg>
    ),
    language: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
    ),
    statistics: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
        />
      </svg>
    ),
    mathematics: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8"
        />
      </svg>
    ),
    international: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    social: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    political: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
        />
      </svg>
    ),
    history: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 flex-shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return logoMap[logoId] || getLogoIcon(null); // Return default if logo not found
};

function Sidebar({
  sidebarData,
  documents,
  openMain,
  setOpenMain,
  selectedCategory,
  selectedDocument,
  setSelectedDocument,
  setSearch,
  setDocuments,
  isOpen,
  setIsOpen,
  hideDocumentTree = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isPricingPage = location.pathname === "/pricing";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { isDarkMode, toggleDarkMode, setIsThemePickerOpen } = useTheme();
  const [user] = useAuthState(auth);
  const { isAdmin } = useSafeAdminCheck();
  const [isThemePickerVisible, setIsThemePickerVisible] = useState(false);

  // Theo dõi kích thước màn hình with improved handling
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      // Responsive sidebar state
      if (width < 770) {
        // On mobile, don't auto-collapse but hide if not open
        setIsCollapsed(false);
      } else if (width >= 770 && width < 1280) {
        // Medium screens: collapse by default
        setIsCollapsed(true);
      } else {
        // Large screens: expand by default
        setIsCollapsed(false);
      }
    };

    window.addEventListener("resize", handleResize);
    // Initialize with proper values
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Đóng tất cả danh mục khi vào trang pricing
  useEffect(() => {
    if (isPricingPage) {
      setOpenMain(-1);
    }
  }, [isPricingPage, setOpenMain]);

  const handleDocumentClick = (category, document) => {
    setSelectedDocument(document);
    setSearch("");
    const categorySlug = toSlug(category.title);
    navigate(`/${categorySlug}/${document.slug}`);
    // Đóng sidebar trên mobile khi người dùng chọn tài liệu
    if (windowWidth < 770) {
      setIsOpen(false);
    }
  };

  const handleCategoryClick = async (idx, category) => {
    // Nếu đang ở trang pricing, giữ trạng thái đóng cho đến khi người dùng yêu cầu mở
    if (isPricingPage && openMain !== idx) {
      setOpenMain(idx); // Mở danh mục được nhấp
    } else if (openMain === idx) {
      setOpenMain(-1); // Đóng danh mục nếu đã mở
      return;
    } else {
      setOpenMain(idx); // Mở danh mục mới
    }

    // Chỉ tải tài liệu nếu danh mục được mở và chưa có dữ liệu
    if (!documents[category.id] || documents[category.id].length === 0) {
      try {
        console.log(
          `Đang tải tài liệu cho danh mục: ${category.title} (${category.id})`
        );

        // Sử dụng hàm tối ưu
        const docsData = await optimizedGetDocumentsByCategory(category.id);

        if (docsData && Array.isArray(docsData) && docsData.length > 0) {
          console.log(
            `Đã tải ${docsData.length} tài liệu cho danh mục: ${category.title}`
          );

          // Hiển thị tài liệu đầu tiên để debug
          console.log("Example document:", docsData[0]);

          // Cập nhật state với dữ liệu mới
          setDocuments((prev) => ({
            ...prev,
            [category.id]: docsData,
          }));
        } else {
          console.log(`Không có tài liệu nào cho danh mục: ${category.title}`);

          // Đặt mảng rỗng để tránh tải lại trong tương lai
          setDocuments((prev) => ({
            ...prev,
            [category.id]: [],
          }));
        }
      } catch (error) {
        console.error(
          `Lỗi khi tải tài liệu cho danh mục ${category.title}:`,
          error
        );

        // Thêm hướng dẫn tạo index nếu là lỗi index Firebase
        if (error.message && error.message.includes("index")) {
          console.error(
            "Lỗi index Firebase: Thiếu chỉ mục cho truy vấn categoryId.",
            "\nVui lòng tạo chỉ mục bằng cách truy cập:",
            "\nhttps://console.firebase.google.com/project/_/firestore/indexes",
            "\nHoặc nhấp vào URL trong lỗi để tạo index tự động"
          );
        }

        // Đặt mảng rỗng để tránh tải lại liên tục khi có lỗi
        setDocuments((prev) => ({
          ...prev,
          [category.id]: [],
        }));
      }
    } else {
      console.log(
        `Đã có sẵn ${documents[category.id].length} tài liệu cho danh mục: ${
          category.title
        }`
      );
    }
  };

  const handleAuthClick = () => {
    if (user) {
      // Hiển thị menu tài khoản hoặc chuyển đến trang profile (có thể mở rộng sau)
      if (window.confirm("Bạn có muốn đăng xuất không?")) {
        auth.signOut();
      }
    } else {
      // Chuyển đến trang đăng nhập
      navigate("/login");
    }
  };

  // Hàm mở Tùy chỉnh giao diện
  const handleThemeSettings = () => {
    setIsThemePickerVisible(true);
  };

  // Add function to handle refresh for admin pages
  const handleAdminRefresh = (e, path) => {
    // If we're already on the path, prevent default and just refresh the current page
    if (location.pathname === path) {
      e.preventDefault();
      window.location.reload();
    }
    // Otherwise, let the normal navigation happen
  };

  // Improved sidebar classes with better responsive behavior
  const sidebarClasses = `
    h-screen overflow-y-auto border-r ${
      isDarkMode ? "border-gray-700" : "border-green-800"
    } transition-all duration-300 scrollbar-hide
    ${isCollapsed && windowWidth >= 770 && windowWidth < 1280 ? "w-16" : "w-72"}
    ${
      windowWidth < 770
        ? isOpen
          ? "fixed left-0 top-0 z-50 shadow-lg w-72"
          : "fixed -left-80 top-0 z-50"
        : "relative h-screen flex-shrink-0"
    }
    theme-sidebar text-white
  `;

  // Overlay khi sidebar mở trên mobile
  const Overlay = () =>
    windowWidth < 770 && isOpen ? (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => setIsOpen(false)}
      ></div>
    ) : null;

  // Kiểm tra xem có đang ở mobile không - mobile KHÔNG bao giờ thu gọn nội dung
  const showFullContent = !isCollapsed || windowWidth < 770;

  // Define theme-aware classes
  const linkBaseClass =
    "flex items-center p-2 text-base font-normal rounded-lg";
  const linkHoverClass = isDarkMode
    ? "hover:bg-gray-700"
    : "hover:bg-green-800";
  const activeClass = isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800";

  return (
    <>
      {/* Improved mobile close button positioning */}
      {windowWidth < 770 && isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed top-4 left-[260px] z-[60] bg-gray-800 text-white rounded-full p-1.5 shadow-xl hover:bg-gray-700 transition-colors"
          aria-label="Đóng sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      <Overlay />
      <aside className={sidebarClasses}>
        {/* Optimized sidebar header with better responsive layout */}
        <div className={`sticky top-0 theme-sidebar z-10`}>
          <div
            className={`p-4 flex items-center justify-between border-b ${
              isDarkMode ? "border-gray-700" : "border-green-600"
            }`}
          >
            <Link to="/" className="flex items-center overflow-hidden">
              <div className="p-1 mr-2 flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M4 11.5l8 4 8-4M4 15l8 4 8-4" />
                </svg>
              </div>
              {showFullContent && (
                <span className="text-lg text-white font-medium truncate">
                  Tài liệu HOU
                </span>
              )}
            </Link>

            {/* Add toggle button for medium screens */}
            {windowWidth >= 770 && windowWidth < 1280 && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded-full hover:bg-gray-700/30 transition-colors"
                title={isCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                <svg
                  className={`w-5 h-5 transform transition-transform ${
                    isCollapsed ? "rotate-0" : "rotate-180"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Remove the dashboard link from the top section */}

          {/* Admin Section - Only visible for admin users */}
          {isAdmin && (
            <div
              className={`border-b ${
                isDarkMode ? "border-gray-700" : "border-green-600"
              }`}
            >
              <Link
                to="/admin/dashboard"
                onClick={(e) => handleAdminRefresh(e, "/admin/dashboard")}
                className={`flex items-center px-4 py-3 transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800"
                }`}
              >
                <svg
                  className="w-5 h-5 mr-3 text-white flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                {showFullContent && (
                  <span className="text-white font-medium">Thống kê</span>
                )}
              </Link>
              <Link
                to="/admin/users"
                onClick={(e) => handleAdminRefresh(e, "/admin/users")}
                className={`flex items-center px-4 py-3 transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800"
                }`}
              >
                <svg
                  className="w-5 h-5 mr-3 text-white flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  ></path>
                </svg>
                {showFullContent && (
                  <span className="text-white font-medium">
                    Quản lý tài khoản
                  </span>
                )}
              </Link>

              <Link
                to="/admin/categories"
                onClick={(e) => handleAdminRefresh(e, "/admin/categories")}
                className={`flex items-center px-4 py-3 transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800"
                }`}
              >
                <svg
                  className="w-5 h-5 mr-3 text-white flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  ></path>
                </svg>
                {showFullContent && (
                  <span className="text-white font-medium">
                    Quản lý danh mục
                  </span>
                )}
              </Link>

              <Link
                to="/admin/documents"
                onClick={(e) => handleAdminRefresh(e, "/admin/documents")}
                className={`flex items-center px-4 py-3 transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800"
                }`}
              >
                <svg
                  className="w-5 h-5 mr-3 text-white flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
                {showFullContent && (
                  <span className="text-white font-medium">
                    Quản lý tài liệu
                  </span>
                )}
              </Link>

              <Link
                to="/admin/questions"
                onClick={(e) => handleAdminRefresh(e, "/admin/questions")}
                className={`flex items-center px-4 py-3 transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800"
                }`}
              >
                <svg
                  className="w-5 h-5 mr-3 text-white flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                {showFullContent && (
                  <span className="text-white font-medium">
                    Quản lý bộ câu hỏi
                  </span>
                )}
              </Link>
              <Link
                to="/admin/calendar-notes"
                onClick={(e) => handleAdminRefresh(e, "/admin/calendar-notes")}
                className={`flex items-center px-4 py-3 transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800"
                }`}
              >
                <svg
                  className="w-5 h-5 mr-3 text-white flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {showFullContent && (
                  <span className="text-white font-medium">Quản lý lịch</span>
                )}
              </Link>

              <Link
                to="/admin/premium-users"
                onClick={(e) => handleAdminRefresh(e, "/admin/premium-users")}
                className={`flex items-center px-4 py-3 transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800"
                }`}
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
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                {showFullContent && (
                  <span className="text-white font-medium">
                    Quản lý tài khoản cao cấp{" "}
                  </span>
                )}
              </Link>

              <Link
                to="/admin/footer"
                onClick={(e) => handleAdminRefresh(e, "/admin/footer")}
                className={`flex items-center px-4 py-3 transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 mr-3 text-white flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                {showFullContent && (
                  <span className="text-white font-medium">Quản lý footer</span>
                )}
              </Link>
              {/* <Link
                to="/admin/image-uploader"
                onClick={(e) => handleAdminRefresh(e, "/admin/image-uploader")}
                className={`flex items-center px-4 py-3 transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 mr-3 text-white flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                {showFullContent && (
                  <span className="text-white font-medium">
                    Quản lý upload file{" "}
                  </span>
                )}
              </Link> */}

              <Link
                to="/admin/pricing-content-management"
                onClick={(e) =>
                  handleAdminRefresh(e, "/admin/pricing-content-management")
                }
                className={`flex items-center px-4 py-3 transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-green-800"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 mr-3 text-white flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {showFullContent && (
                  <span className="text-white font-medium">
                    Quản lý nội dung liên hệ
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>

        {/* Optimize navigation content for better mobile experience */}
        <nav className="mt-2 px-2 overflow-y-auto">
          <ul className="space-y-1">
            {!hideDocumentTree &&
              sidebarData &&
              sidebarData.map((category, idx) => (
                <li
                  key={category.id || idx}
                  className="rounded-md overflow-hidden"
                >
                  <button
                    className={`w-full flex items-center ${
                      isCollapsed && windowWidth >= 770
                        ? "justify-center"
                        : "justify-between"
                    } px-3 py-2.5 text-sm font-medium text-left transition-all duration-200 rounded-md ${
                      openMain === idx
                        ? isDarkMode
                          ? "bg-slate-700 text-white"
                          : "theme-category-selected text-white"
                        : `text-white hover:${
                            isDarkMode ? "bg-slate-700" : "theme-button-hover"
                          } hover:shadow-md`
                    }`}
                    style={
                      openMain === idx && isDarkMode
                        ? { backgroundColor: "#334155" }
                        : {}
                    }
                    onClick={() => handleCategoryClick(idx, category)}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {getCategoryIcon(category.logo)}
                      </div>
                      {showFullContent && (
                        <span className="truncate ml-2 mr-2">
                          {category.title}
                        </span>
                      )}
                    </div>

                    {showFullContent && (
                      <svg
                        className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                          openMain === idx ? "transform rotate-180" : ""
                        }`}
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
                    )}
                  </button>

                  {/* Hiển thị menu documents có điều kiện */}
                  {openMain === idx && documents && documents[category.id] && (
                    <ul
                      className={`mt-1 ${
                        showFullContent ? "pl-4" : ""
                      } space-y-0.5 py-1 ${
                        showFullContent
                          ? (isDarkMode
                              ? "bg-slate-700/50"
                              : "theme-category-container") + " rounded-md mx-1"
                          : ""
                      }`}
                      style={
                        showFullContent && isDarkMode
                          ? { backgroundColor: "rgba(51, 65, 85, 0.5)" }
                          : {}
                      }
                    >
                      {Array.isArray(documents[category.id]) &&
                      documents[category.id].length > 0 ? (
                        documents[category.id].map((doc) => (
                          <li key={doc.id}>
                            <button
                              className={`group flex items-center w-full ${
                                showFullContent ? "px-3" : "px-1"
                              } py-2 text-sm rounded-md transition-all duration-200 ${
                                selectedDocument &&
                                selectedDocument.id === doc.id
                                  ? showFullContent
                                    ? (isDarkMode
                                        ? "bg-slate-600/50"
                                        : "theme-document-selected") +
                                      " text-white font-medium shadow-sm"
                                    : "text-white font-medium"
                                  : `text-white hover:${
                                      isDarkMode
                                        ? "bg-slate-700"
                                        : "theme-button-hover"
                                    } hover:text-white hover:shadow-sm`
                              }`}
                              style={
                                selectedDocument &&
                                selectedDocument.id === doc.id &&
                                showFullContent &&
                                isDarkMode
                                  ? {
                                      backgroundColor: "rgba(71, 85, 105, 0.5)",
                                    }
                                  : {}
                              }
                              onClick={() => handleDocumentClick(category, doc)}
                            >
                              {getLogoIcon(doc.categoryLogo)}
                              {showFullContent && (
                                <span className="truncate flex-1 min-w-0 ml-2">
                                  {doc.title}
                                </span>
                              )}
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="px-3 py-2 text-sm text-gray-400 italic">
                          {showFullContent && <span>Không có tài liệu</span>}
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              ))}
            {!isAdmin && (
              <li className="rounded-md overflow-hidden">
                <Link
                  to="/pricing"
                  className={`${linkBaseClass} ${
                    isCollapsed && windowWidth >= 770 ? "justify-center" : ""
                  } ${
                    location.pathname === "/pricing"
                      ? activeClass
                      : linkHoverClass
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-100 dark:text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {showFullContent && (
                    <span className="ml-3 flex-1 text-white">Ủng hộ tôi</span>
                  )}
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Theme Color Picker Modal */}
        <ThemeColorPicker
          isOpen={isThemePickerVisible}
          onClose={() => setIsThemePickerVisible(false)}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      </aside>
    </>
  );
}

export default Sidebar;
