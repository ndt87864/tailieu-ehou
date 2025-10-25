import React, { useEffect, useState } from "react";
import { formatDate } from "./studentInforHelpers";

const StudentTable = ({
  columns,
  rows,
  loading,
  isDarkMode,
  openEditModal,
  handleDelete,
  onBulkDelete,
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // keep selection in sync when rows change (remove ids that are no longer visible)
  useEffect(() => {
    setSelectedIds((prev) => {
      if (!rows || rows.length === 0) return new Set();
      const visibleIds = new Set((rows || []).map((r) => r.id));
      const next = new Set();
      for (const id of prev) if (visibleIds.has(id)) next.add(id);
      return next;
    });
  }, [rows]);

  const toggleSelectAll = () => {
    if (!rows || rows.length === 0) return;
    const allSelected = rows.every((r) => selectedIds.has(r.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteClick = async () => {
    if (!onBulkDelete) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa ${ids.length} bản ghi đã chọn không?`
      )
    )
      return;
    await onBulkDelete(ids);
    // clear selection after delete attempt
    setSelectedIds(new Set());
  };
  return (
    <div
      className={`rounded-lg shadow-md overflow-hidden ${
        isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
      }`}
    >
      <div
        className={`px-6 py-4 ${
          isDarkMode
            ? "bg-gray-700/50 border-b border-gray-700"
            : "bg-gray-50 border-b border-gray-200"
        }`}
      >
        <h3
          className={`text-lg font-medium ${
            isDarkMode ? "text-gray-100" : "text-gray-900"
          }`}
        >
          Danh sách sinh viên
        </h3>
        <p
          className={`mt-1 text-sm ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Hiển thị {rows.length} bản ghi
        </p>
      </div>

      <div className="overflow-x-auto">
        <table
          className={`min-w-full divide-y ${
            isDarkMode ? "divide-gray-700" : "divide-gray-200"
          }`}
        >
          <thead>
            <tr className={isDarkMode ? "bg-gray-700/30" : "bg-gray-50"}>
              <th className={`px-4 py-3 text-red-500`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label="select all"
                    onChange={toggleSelectAll}
                    checked={
                      rows &&
                      rows.length > 0 &&
                      rows.every((r) => selectedIds.has(r.id))
                    }
                  />
                  {/* Bulk delete icon button moved next to master checkbox */}
                  <button
                    onClick={handleBulkDeleteClick}
                    disabled={selectedIds.size === 0}
                    title={
                      selectedIds.size === 0
                        ? "Chưa có bản ghi được chọn"
                        : `Xóa ${selectedIds.size} bản ghi đã chọn`
                    }
                    aria-label="Xóa các bản ghi đã chọn"
                    className={`p-1 rounded-md inline-flex items-center justify-center ml-1 ${
                      selectedIds.size === 0
                        ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                        : isDarkMode
                        ? "bg-red-700 hover:bg-red-600 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {/* Trash icon (SVG) */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 9a1 1 0 011 1v7a1 1 0 11-2 0V10a1 1 0 011-1zm6 0a1 1 0 011 1v7a1 1 0 11-2 0V10a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                      <path d="M4 6h16v2H4V6z" />
                      <path
                        fillRule="evenodd"
                        d="M9 4a1 1 0 00-1 1v1h8V5a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                      <path
                        d="M7 8h10l-1 12a2 2 0 01-2 2H10a2 2 0 01-2-2L7 8z"
                        opacity="0.01"
                      />
                    </svg>
                  </button>
                </div>
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  {col.label}
                </th>
              ))}
              <th
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? "text-gray-300" : "text-gray-500"
                }`}
              >
                Hành động
              </th>
            </tr>
          </thead>
          <tbody
            className={`divide-y ${
              isDarkMode ? "divide-gray-700" : "divide-gray-200"
            }`}
          >
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className={`px-6 py-6 text-center ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Đang tải...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className={`px-6 py-10 text-center ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  <div className="mx-auto">Không có dữ liệu</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    isDarkMode ? "hover:bg-gray-700/30" : "hover:bg-gray-50"
                  }
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <input
                      type="checkbox"
                      aria-label={`select-${row.id}`}
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelectOne(row.id)}
                    />
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-4 whitespace-nowrap text-sm"
                    >
                      {col.key === "dob" ? (
                        formatDate(row[col.key])
                      ) : col.key === "examLink" ? (
                        row[col.key] ? (
                          <a
                            href={row[col.key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                            title={row[col.key]}
                          >
                            {row[col.key].length > 60
                              ? row[col.key].slice(0, 60) + "..."
                              : row[col.key]}
                          </a>
                        ) : (
                          ""
                        )
                      ) : (
                        row[col.key] ?? ""
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => openEditModal(row)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
                        isDarkMode
                          ? "bg-blue-600 hover:bg-blue-500 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ml-2 ${
                        isDarkMode
                          ? "bg-red-700 hover:bg-red-600 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Bulk actions footer (selection count only; delete moved to header) */}
      <div className="px-6 py-3 border-t flex items-center justify-between">
        <div className="text-sm">
          Đã chọn: <strong>{selectedIds.size}</strong>
        </div>
        <div />
      </div>
    </div>
  );
};

export default StudentTable;
