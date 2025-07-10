import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useTheme } from "../context/ThemeContext";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email) {
      setMessage("Vui lòng nhập email để lấy lại mật khẩu.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.");
    } catch (err) {
      setMessage(
        "Không thể gửi email. Vui lòng kiểm tra lại email hoặc thử lại sau."
      );
    } finally {
      setLoading(false);
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
        <h2 className="text-2xl font-bold text-center mb-4">Quên mật khẩu</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Nhập email của bạn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${
              isDarkMode
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-blue-500 hover:bg-blue-600"
            } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {loading ? "Đang gửi..." : "Gửi email đặt lại mật khẩu"}
          </button>
        </form>
        {message && (
          <div className="mt-2 text-sm text-red-500 text-center">{message}</div>
        )}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => navigate("/login")}
            className={`text-sm ${
              isDarkMode
                ? "text-gray-400 hover:text-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
