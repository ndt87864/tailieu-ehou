import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/firebase";
import {
  loginWithEmailPassword,
  loginWithGoogle,
} from "../firebase/authService";
import { useTheme } from "../context/ThemeContext";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  // Use the authenticated instance and add error handling
  const [user, authLoading, authError] = useAuthState(auth);
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Add error logging
  useEffect(() => {
    if (authError) {
      console.error("Auth state error:", authError);
    }
  }, [authError]);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Kiểm tra thông báo từ URL
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    // Remove session expiration check
    const loggedOut = queryParams.get("logged_out");

    if (loggedOut === "current_device") {
      setError("Bạn đã đăng xuất khỏi thiết bị này.");
    } else if (loggedOut === "all_devices") {
      setError("Bạn đã đăng xuất khỏi tất cả thiết bị.");
    }
  }, []);

  const handleEmailLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await loginWithEmailPassword(email, password);

      if (!result.success) {
        if (result.alreadyLoggedIn) {
          // Hiển thị thông báo đặc biệt cho trường hợp đã đăng nhập ở thiết bị khác
          setError(result.error);
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await loginWithGoogle();

      if (result.success) {
      } else {
        if (result.alreadyLoggedIn) {
          // Hiển thị thông báo đặc biệt cho trường hợp đã đăng nhập ở thiết bị khác
          setError(result.error);
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error("Unexpected error during Google login:", err);
      setError("Có lỗi xảy ra. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = async () => {
    setResetMessage("");
    if (!resetEmail) {
      setResetMessage("Vui lòng nhập email để lấy lại mật khẩu.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage(
        "Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư."
      );
    } catch (err) {
      setResetMessage(
        "Không thể gửi email. Vui lòng kiểm tra lại email hoặc thử lại sau."
      );
    }
  };

  const inputClasses = `appearance-none rounded-md relative block w-full px-3 py-2 border ${
    isDarkMode
      ? "border-gray-700 bg-gray-700 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500"
      : "border-gray-300 placeholder-gray-500 focus:ring-green-600 focus:border-green-600"
  } focus:outline-none focus:ring-2 focus:z-10 sm:text-sm transition-colors`;

  return (
    <div
      className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${
        isDarkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"
      }`}
    >
      <div
        className={`max-w-md w-full space-y-6 p-8 rounded-lg shadow-md ${
          isDarkMode
            ? "bg-gray-800 shadow-gray-900/50"
            : "bg-white shadow-gray-200/50"
        }`}
      >
        <div>
          <div className="flex justify-center">
            <svg
              className={`w-12 h-12 ${
                isDarkMode ? "text-green-500" : "text-green-600"
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M4 11.5l8 4 8-4M4 15l8 4 8-4" />
            </svg>
          </div>
          <h2
            className={`mt-6 text-center text-3xl font-extrabold ${
              isDarkMode ? "text-gray-100" : "text-gray-900"
            }`}
          >
            Đăng nhập vào tài khoản
          </h2>
          <p
            className={`mt-2 text-center text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Chưa có tài khoản?{" "}
            <button
              onClick={() => navigate("/register")}
              className={`font-medium transition-colors ${
                isDarkMode
                  ? "text-green-500 hover:text-green-400"
                  : "text-green-600 hover:text-green-500"
              }`}
            >
              Đăng ký ngay
            </button>
          </p>
        </div>

        {error && (
          <div
            className={`px-4 py-3 rounded border ${
              isDarkMode
                ? "bg-red-900/30 border-red-800 text-red-300"
                : "bg-red-100 border-red-400 text-red-700"
            }`}
          >
            <span>{error}</span>
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleEmailLogin}>
          <div className="rounded-md space-y-4">
            {/* Email field */}
            <div>
              <label htmlFor="email-address" className="sr-only">
                E-mail
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                placeholder="E-mail"
              />
            </div>

            {/* Password field */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClasses}
                placeholder="Mật khẩu"
              />
              <button
                type="button"
                className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-300"
                    : "text-gray-600 hover:text-gray-500"
                }`}
                onClick={togglePasswordVisibility}
              >
                {showPassword ? (
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
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${
                isDarkMode
                  ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  : "bg-green-700 hover:bg-green-800 focus:ring-green-600"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </button>
          </div>
        </form>

        {/* Thêm nút Quên mật khẩu dưới nút đăng nhập, chuyển sang trang mới */}
        <div className="flex justify-end mt-2">
          <button
            type="button"
            className={`text-blue-500 hover:underline text-sm bg-transparent border-none p-0 ${
              isDarkMode ? "hover:text-blue-300" : "hover:text-blue-700"
            }`}
            onClick={() => navigate("/forgot-password")}
            style={{ cursor: "pointer" }}
          >
            Quên mật khẩu?
          </button>
        </div>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div
                className={`w-full border-t ${
                  isDarkMode ? "border-gray-700" : "border-gray-300"
                }`}
              ></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span
                className={`px-2 ${
                  isDarkMode
                    ? "bg-gray-800 text-gray-400"
                    : "bg-white text-gray-600"
                }`}
              >
                Hoặc tiếp tục với
              </span>
            </div>
          </div>

          <div className="mt-4">
            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md ${
                isDarkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  : "bg-white hover:bg-gray-50 text-gray-800 border border-gray-300"
              } transition-colors mb-4`}
            >
              {/* Google Logo */}
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path
                    fill="#4285F4"
                    d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                  />
                </g>
              </svg>
              <span>Google</span>
            </button>
          </div>
        </div>

        {/* Nút quay lại trang chủ */}
        <div className="flex justify-center">
          <button
            onClick={() => navigate("/")}
            className={`flex items-center text-sm transition-colors 
                ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-300"
                    : "text-gray-600 hover:text-gray-800"
                }`}
          >
            Quay lại trang chủ
          </button>
        </div>

        {/* Reset password prompt */}
        {showResetPrompt && (
          <div className="mt-4 p-4 rounded-md shadow-md bg-white">
            <p className="text-sm text-gray-500 mb-2">
              Nhập địa chỉ email của bạn. Chúng tôi sẽ gửi hướng dẫn đặt lại mật
              khẩu đến email của bạn.
            </p>
            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="border px-3 py-2 rounded-md w-full mb-2"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleForgotPassword}
                className={`px-4 py-2 rounded-md text-white transition-colors ${
                  isDarkMode
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                Gửi
              </button>
              <button
                onClick={() => {
                  setShowResetPrompt(false);
                  setResetMessage("");
                }}
                className="px-4 py-2 bg-gray-200 rounded-md"
              >
                Đóng
              </button>
            </div>
            {resetMessage && (
              <div className="mt-2 text-sm text-red-500">{resetMessage}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
