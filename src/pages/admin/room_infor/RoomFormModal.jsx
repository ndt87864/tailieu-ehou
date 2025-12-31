import React from "react";
import Modal from "../../../components/Modal";

const RoomFormModal = ({
  isOpen,
  onClose,
  editing,
  form,
  handleChange,
  handleSave,
  isSaving,
  isDarkMode,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Sửa thông tin phòng (đồng bộ)" : "Thêm phòng mới"}
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm text-gray-600">Ngày thi</div>
            <input type="date" value={form.examDate || ""} onChange={(e) => handleChange("examDate", e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600">Tên môn học</div>
            <input value={form.subject || ""} onChange={(e) => handleChange("subject", e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <div className="text-sm text-gray-600">Ca thi</div>
            <input value={form.examSession || ""} onChange={(e) => handleChange("examSession", e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600">Thời gian</div>
            <input value={form.examTime || ""} onChange={(e) => handleChange("examTime", e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600">Phòng</div>
            <input value={form.examRoom || ""} onChange={(e) => handleChange("examRoom", e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </label>
        </div>

        <label className="block">
          <div className="text-sm text-gray-600">Link phòng</div>
          <input value={form.examLink || ""} onChange={(e) => handleChange("examLink", e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
        </label>

        <div className="flex items-center justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border text-sm">Hủy</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60">{isSaving ? "Đang lưu..." : "Lưu và đồng bộ"}</button>
        </div>
      </form>
    </Modal>
  );
};

export default RoomFormModal;
