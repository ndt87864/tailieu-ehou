import React from "react";
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
}) => {
  return (
    <React.Suspense fallback={null}>
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={editingItem ? "Sửa thông tin" : "Thêm sinh viên"}
        >
          {error && <div className="alert-error">{error}</div>}
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="studentId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Mã sv <span className="text-red-500">*</span>
                </label>
                <input
                  id="studentId"
                  name="studentId"
                  value={form.studentId}
                  onChange={(e) => handleChange("studentId", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Nhập mã sinh viên"
                  aria-required="true"
                />
              </div>

              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Nhập họ và tên"
                  aria-required="true"
                />
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tài khoản
                </label>
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Tên tài khoản / username"
                />
              </div>

              <div>
                <label
                  htmlFor="dob"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Ngày sinh
                </label>
                <input
                  id="dob"
                  name="dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => handleChange("dob", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label
                  htmlFor="examDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Ngày thi
                </label>
                <input
                  id="examDate"
                  name="examDate"
                  type="date"
                  value={form.examDate}
                  onChange={(e) => handleChange("examDate", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tên môn học
                </label>
                <input
                  id="subject"
                  name="subject"
                  value={form.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Ví dụ: Toán cao cấp"
                />
              </div>

              <div>
                <label
                  htmlFor="examSession"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Ca thi
                </label>
                <input
                  id="examSession"
                  name="examSession"
                  value={form.examSession}
                  onChange={(e) => handleChange("examSession", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Sáng / Chiều / Tối"
                />
              </div>

              <div>
                <label
                  htmlFor="examTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Thời gian
                </label>
                <input
                  id="examTime"
                  name="examTime"
                  value={form.examTime}
                  onChange={(e) => handleChange("examTime", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Ví dụ: 07:30 - 09:00"
                />
              </div>

              <div>
                <label
                  htmlFor="examRoom"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phòng thi
                </label>
                <input
                  id="examRoom"
                  name="examRoom"
                  value={form.examRoom}
                  onChange={(e) => handleChange("examRoom", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Ví dụ: P101"
                />
              </div>

              <div>
                <label
                  htmlFor="course"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Khóa
                </label>
                <input
                  id="course"
                  name="course"
                  value={form.course}
                  onChange={(e) => handleChange("course", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Ví dụ: K63"
                />
              </div>

              <div>
                <label
                  htmlFor="majorCode"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Mã ngành
                </label>
                <input
                  id="majorCode"
                  name="majorCode"
                  value={form.majorCode}
                  onChange={(e) => handleChange("majorCode", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* examType hidden in UI */}

              <div className="md:col-span-2">
                <label
                  htmlFor="examLink"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Link phòng
                </label>
                <input
                  id="examLink"
                  name="examLink"
                  value={form.examLink}
                  onChange={(e) => handleChange("examLink", e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Nếu có, nhập URL bắt đầu bằng http:// hoặc https://
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white ${
                  isSaving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-60`}
                disabled={isSaving}
              >
                {isSaving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </React.Suspense>
  );
};

export default StudentFormModal;
