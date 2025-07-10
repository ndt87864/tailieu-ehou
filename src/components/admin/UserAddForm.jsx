import React, { useRef, useEffect } from "react";

const UserAddForm = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  formErrors,
  loading,
  onChange,
}) => {
  const formRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div
        ref={formRef}
        className="bg-white text-gray-800 rounded-lg shadow-xl p-6 w-[95%] mx-auto border-2 border-gray-300 md:w-[80%] z-50"
        style={{ background: "#ffffff" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Thêm tài khoản mới</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Desktop layout: name and email in one row */}
          <div className="md:flex md:space-x-4 md:space-y-0 space-y-4">
            {/* Họ tên */}
            <div className="md:w-1/2">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Họ và tên
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={onChange}
                className={`${inputClasses} ${
                  formErrors.fullName ? "border-red-500" : ""
                }`}
                placeholder="Nhập họ và tên"
              />
              {formErrors.fullName && (
                <p className="mt-1 text-sm text-red-600">
                  {formErrors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="md:w-1/2">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onChange}
                className={`${inputClasses} ${
                  formErrors.email ? "border-red-500" : ""
                }`}
                placeholder="Nhập địa chỉ email"
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>
          </div>

          {/* Desktop layout: phone and role in one row */}
          <div className="md:flex md:space-x-4 md:space-y-0 space-y-4">
            {/* Số điện thoại */}
            <div className="md:w-1/2">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Số điện thoại
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={onChange}
                className={`${inputClasses} ${
                  formErrors.phone ? "border-red-500" : ""
                }`}
                placeholder="Nhập số điện thoại"
              />
              {formErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
              )}
            </div>

            {/* Vai trò */}
            <div className="md:w-1/2">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Vai trò
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={onChange}
                className={inputClasses}
              >
                <option value="fuser">Người dùng miễn phí</option>
                <option value="puser">Người dùng trả phí</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
          </div>

          {/* Desktop layout: password and confirm password in one row */}
          <div className="md:flex md:space-x-4 md:space-y-0 space-y-4">
            {/* Mật khẩu */}
            <div className="md:w-1/2">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Mật khẩu
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={onChange}
                className={`${inputClasses} ${
                  formErrors.password ? "border-red-500" : ""
                }`}
                placeholder="Nhập mật khẩu"
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {formErrors.password}
                </p>
              )}
            </div>

            {/* Xác nhận mật khẩu */}
            <div className="md:w-1/2">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={onChange}
                className={`${inputClasses} ${
                  formErrors.confirmPassword ? "border-red-500" : ""
                }`}
                placeholder="Nhập lại mật khẩu"
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Đang tạo...
                </span>
              ) : (
                "Tạo tài khoản"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserAddForm;
