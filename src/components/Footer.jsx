import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { getFooterContent } from "../firebase/firestoreService";
import "../styles/layout.css";

const Footer = () => {
  const { isDarkMode } = useTheme();
  const [footerSections, setFooterSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFooterContent = async () => {
      try {
        const data = await getFooterContent();
        if (data && data.sections) {
          setFooterSections(data.sections);
        }
      } catch (error) {
        console.error("Error loading footer content:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFooterContent();
  }, []);

  return (
    <footer className={`site-footer ${isDarkMode ? "dark" : "light"}`}>
      <div className="footer-container">
        <div
          className={`footer-grid ${
            footerSections.length > 0
              ? `lg-cols-${Math.min(4, footerSections.length + 2)}`
              : "lg-cols-4"
          }`}
        >
          {/* Logo and Description */}
          <div className="footer-col-span-2">
            <div className="footer-logo-container">
              <div className="footer-logo-icon">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3
                className={`footer-brand-name ${isDarkMode ? "dark" : "light"}`}
              >
                Tài liệu HOU
              </h3>
            </div>
            <p
              className={`footer-description ${isDarkMode ? "dark" : "light"}`}
            >
              Thư viện tài liệu học tập trực tuyến dành cho sinh viên Đại học Mở
              Hà Nội. Cung cấp nguồn tài liệu chất lượng, cập nhật và dễ tiếp
              cận.
            </p>
            <div className="social-links">
              <a
                href="#"
                className={`social-link ${isDarkMode ? "dark" : "light"}`}
              >
                <span className="sr-only">Facebook</span>
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="#"
                className={`social-link ${isDarkMode ? "dark" : "light"}`}
              >
                <span className="sr-only">Instagram</span>
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987c6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.295C3.897 14.341 3.29 12.909 3.29 11.306c0-1.602.607-3.034 1.836-4.387C6.001 5.565 7.152 5.075 8.449 5.075c1.297 0 2.448.49 3.323 1.295c1.229 1.353 1.836 2.785 1.836 4.387c0 1.603-.607 3.035-1.836 4.388c-.875.805-2.026 1.295-3.323 1.295z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="#"
                className={`social-link ${isDarkMode ? "dark" : "light"}`}
              >
                <span className="sr-only">Twitter</span>
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={`footer-heading ${isDarkMode ? "dark" : "light"}`}>
              Liên kết nhanh
            </h4>
            <ul className="footer-links-list">
              <li>
                <Link
                  to="/"
                  className={`footer-link ${isDarkMode ? "dark" : "light"}`}
                >
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className={`footer-link ${isDarkMode ? "dark" : "light"}`}
                >
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className={`footer-link ${isDarkMode ? "dark" : "light"}`}
                >
                  Gói dịch vụ
                </Link>
              </li>
            </ul>
          </div>

          {/* Dynamic Footer Sections from FooterManagement */}
          {!loading &&
            footerSections.map((section) => (
              <div key={section.id}>
                <h4
                  className={`footer-heading ${isDarkMode ? "dark" : "light"}`}
                >
                  {section.title}
                </h4>
                <ul className="footer-links-list">
                  {section.content.map((item, index) => (
                    <li key={index}>
                      <span
                        className={`footer-link ${
                          isDarkMode ? "dark" : "light"
                        }`}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          {/* Loading state for dynamic sections */}
          {loading &&
            Array.from({ length: 2 }).map((_, index) => (
              <div key={`loading-${index}`}>
                <div className="animate-pulse">
                  <div
                    className={`h-4 ${
                      isDarkMode ? "bg-gray-700" : "bg-gray-300"
                    } rounded mb-4`}
                  ></div>
                  <div className="space-y-2">
                    <div
                      className={`h-3 ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-300"
                      } rounded`}
                    ></div>
                    <div
                      className={`h-3 ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-300"
                      } rounded`}
                    ></div>
                    <div
                      className={`h-3 ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-300"
                      } rounded`}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Bottom Section */}
        <div className={`copyright-section ${isDarkMode ? "dark" : "light"}`}>
          <div className="copyright-container">
            <div className={`copyright-text ${isDarkMode ? "dark" : "light"}`}>
              © 2025 Tài liệu HOU. Tất cả quyền được bảo lưu.
            </div>
            <div className="mt-4 md:mt-0">
              <p className={`copyright-text ${isDarkMode ? "dark" : "light"}`}>
                Được phát triển với ❤️ cho sinh viên HOU
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
