import React from "react";
import { useTheme } from "../../context/ThemeContext";
import UserHeader from "../../components/UserHeader";
import { DocumentMobileHeader } from "../../components/MobileHeader";
import Sidebar from "../../components/Sidebar";
import ThemeColorPicker from "../../components/ThemeColorPicker";
import { useState, useEffect } from "react";

const AdminDashboard = () => {
  const { isDarkMode } = useTheme();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  // State for sidebar elements (dummy data for now)
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {windowWidth < 770 && (
        <DocumentMobileHeader
          selectedCategory={{ title: "Quản trị" }}
          selectedDocument={{ title: "Dashboard" }}
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="flex min-h-screen">
        <div
          className={`${
            windowWidth < 770
              ? `fixed inset-y-0 left-0 z-20 transition-all duration-300 transform ${
                  isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`
              : "sticky top-0 h-screen z-10"
          }`}
        >
          <Sidebar
            sidebarData={categories}
            documents={documents}
            openMain={openMain}
            setOpenMain={setOpenMain}
            selectedCategory={selectedCategory}
            selectedDocument={selectedDocument}
            setSelectedDocument={setSelectedDocument}
            setSearch={setSearchQuery}
            setDocuments={setDocuments}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />
        </div>

        {isSidebarOpen && windowWidth < 770 && (
          <div
            className="fixed inset-0 z-10 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        <div className="flex-1 overflow-hidden">
          {windowWidth >= 770 && (
            <div className="sticky top-0 z-20 w-full">
              <UserHeader
                title="Admin Dashboard"
                isDarkMode={isDarkMode}
                setIsThemePickerOpen={setIsThemePickerOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              />
            </div>
          )}

          <main
            className={`p-4 md:p-6 ${
              isDarkMode
                ? "bg-gray-900 text-white"
                : "bg-slate-100 text-gray-900"
            }`}
          >
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
              <p>
                Welcome to the admin dashboard. More content will be added here.
              </p>
            </div>
          </main>
        </div>
      </div>

      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />
    </div>
  );
};

export default AdminDashboard;
