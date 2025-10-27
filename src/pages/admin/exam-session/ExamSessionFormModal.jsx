import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";

const defaultForm = {
  title: "",
  startTime: "",
  endTime: "",
  examType: "Onsite",
  isActive: true,
};

const ExamSessionFormModal = ({
  isOpen,
  onClose,
  onSave,
  initial = null,
  isSaving,
}) => {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || "",
        startTime: initial.startTime || "",
        endTime: initial.endTime || "",
        examType: initial.examType || "Onsite",
        isActive:
          typeof initial.isActive === "boolean" ? initial.isActive : true,
      });
    } else {
      setForm(defaultForm);
    }
    setError("");
  }, [initial, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Vui lòng nhập tên ca thi");
      return;
    }
    if (!form.startTime) {
      setError("Vui lòng chọn thời gian bắt đầu");
      return;
    }
    if (!form.endTime) {
      setError("Vui lòng chọn thời gian kết thúc");
      return;
    }
    setError("");
    onSave(form);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? "Chỉnh sửa ca thi" : "Thêm ca thi mới"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Tiêu đề <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-900 dark:text-white"
            placeholder="Nhập tên ca thi"
            required
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Thời gian bắt đầu <span className="text-red-500">*</span>
            </label>
            <input
              name="startTime"
              type="text"
              value={form.startTime}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-900 dark:text-white"
              placeholder="VD:08:00"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Thời gian kết thúc <span className="text-red-500">*</span>
            </label>
            <input
              name="endTime"
              type="text"
              value={form.endTime}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-900 dark:text-white"
              placeholder="VD:09:30"
              required
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Hình thức thi
            </label>
            <input
              name="examType"
              type="text"
              value={form.examType}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-900 dark:text-white"
              placeholder="VD: TN,TL-90p,..."
            />
          </div>
          <div className="flex items-center mt-6">
            <input
              name="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={handleChange}
              className="mr-2"
              id="isActive"
            />
            <label htmlFor="isActive" className="text-sm">
              Đang kích hoạt
            </label>
          </div>
        </div>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {isSaving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ExamSessionFormModal;
