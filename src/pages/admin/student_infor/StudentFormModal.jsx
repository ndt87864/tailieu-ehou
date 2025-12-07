import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";

const StudentFormModal = ({
  isOpen,
  onClose,
  editingItem,
  form,
  handleChange,
  handleSave,
  isSaving,
  error,
  isDarkMode = false,
}) => {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 770;

  // Common input class
  const inputClass = `w-full border rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
    isDarkMode
      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-400 focus:border-blue-400"
  }`;

  // Common label class
  const labelClass = `block text-sm font-medium mb-1.5 ${
    isDarkMode ? "text-gray-200" : "text-gray-700"
  }`;

  return (
    <React.Suspense fallback={null}>
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={editingItem ? "Sửa thông tin sinh viên" : "Thêm sinh viên mới"}
          fullScreenOnMobile={true}
        >
          {/* Error message */}
          {error && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              isDarkMode
                ? "bg-red-900/30 border border-red-800 text-red-300"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Required fields section */}
            <div className={`p-3 rounded-lg ${isDarkMode ? "bg-blue-900/20" : "bg-blue-50"}`}>
              <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
                Thông tin bắt buộc
              </h4>
              <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                {/* Mã SV */}
                <div>
                  <label htmlFor="studentId" className={labelClass}>
                    Mã sinh viên <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="studentId"
                    name="studentId"
                    value={form.studentId}
                    onChange={(e) => handleChange("studentId", e.target.value)}
                    className={inputClass}
                    placeholder="Nhập mã sinh viên"
                    aria-required="true"
                    autoComplete="off"
                  />
                </div>

                {/* Họ và tên */}
                <div>
                  <label htmlFor="fullName" className={labelClass}>
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    className={inputClass}
                    placeholder="Nhập họ và tên"
                    aria-required="true"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            {/* Account & Personal info */}
            <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
              {/* Tài khoản */}
              <div>
                <label htmlFor="username" className={labelClass}>
                  Tài khoản
                </label>
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  className={inputClass}
                  placeholder="Tên tài khoản / username"
                  autoComplete="off"
                />
              </div>

              {/* Ngày sinh */}
              <div>
                <label htmlFor="dob" className={labelClass}>
                  Ngày sinh
                </label>
                <input
                  id="dob"
                  name="dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => handleChange("dob", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Exam info section */}
            <div className={`p-3 rounded-lg ${isDarkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
              <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                Thông tin kỳ thi
              </h4>
              <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                {/* Ngày thi */}
                <div>
                  <label htmlFor="examDate" className={labelClass}>
                    Ngày thi
                  </label>
                  <input
                    id="examDate"
                    name="examDate"
                    type="date"
                    value={form.examDate}
                    onChange={(e) => handleChange("examDate", e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Tên môn học */}
                <div>
                  <label htmlFor="subject" className={labelClass}>
                    Tên môn học
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    value={form.subject}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    className={inputClass}
                    placeholder="Ví dụ: Toán cao cấp"
                    autoComplete="off"
                  />
                </div>

                {/* Ca thi */}
                <div>
                  <label htmlFor="examSession" className={labelClass}>
                    Ca thi
                  </label>
                  <input
                    id="examSession"
                    name="examSession"
                    value={form.examSession}
                    onChange={(e) => handleChange("examSession", e.target.value)}
                    className={inputClass}
                    placeholder="Sáng / Chiều / Tối"
                    autoComplete="off"
                  />
                </div>

                {/* Thời gian */}
                <div>
                  <label htmlFor="examTime" className={labelClass}>
                    Thời gian
                  </label>
                  <input
                    id="examTime"
                    name="examTime"
                    value={form.examTime}
                    onChange={(e) => handleChange("examTime", e.target.value)}
                    className={inputClass}
                    placeholder="Ví dụ: 07:30 - 09:00"
                    autoComplete="off"
                  />
                </div>

                {/* Phòng thi */}
                <div>
                  <label htmlFor="examRoom" className={labelClass}>
                    Phòng thi
                  </label>
                  <input
                    id="examRoom"
                    name="examRoom"
                    value={form.examRoom}
                    onChange={(e) => handleChange("examRoom", e.target.value)}
                    className={inputClass}
                    placeholder="Ví dụ: P101"
                    autoComplete="off"
                  />
                </div>

                {/* Khóa */}
                <div>
                  <label htmlFor="course" className={labelClass}>
                    Khóa
                  </label>
                  <input
                    id="course"
                    name="course"
                    value={form.course}
                    onChange={(e) => handleChange("course", e.target.value)}
                    className={inputClass}
                    placeholder="Ví dụ: K63"
                    autoComplete="off"
                  />
                </div>

                {/* Mã ngành */}
                <div>
                  <label htmlFor="majorCode" className={labelClass}>
                    Mã ngành
                  </label>
                  <input
                    id="majorCode"
                    name="majorCode"
                    value={form.majorCode}
                    onChange={(e) => handleChange("majorCode", e.target.value)}
                    className={inputClass}
                    placeholder="Nhập mã ngành"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            {/* Link phòng - full width */}
            <div>
              <label htmlFor="examLink" className={labelClass}>
                Link phòng thi online
              </label>
              <input
                id="examLink"
                name="examLink"
                value={form.examLink}
                onChange={(e) => handleChange("examLink", e.target.value)}
                placeholder="https://..."
                className={inputClass}
                autoComplete="off"
              />
              <p className={`mt-1.5 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Nếu có, nhập URL bắt đầu bằng http:// hoặc https://
              </p>
            </div>

            {/* Action buttons */}
            <div className={`flex gap-3 pt-4 border-t ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            } ${isMobile ? "flex-col-reverse" : "justify-end"}`}>
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex items-center justify-center px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? "border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                } ${isMobile ? "w-full" : ""}`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                  isSaving
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } ${isMobile ? "w-full" : ""}`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingItem ? "Cập nhật" : "Thêm mới"}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </React.Suspense>
  );
};

export default StudentFormModal;
