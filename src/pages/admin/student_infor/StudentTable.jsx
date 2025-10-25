import React from "react";
import { formatDate } from "./studentInforHelpers";

const StudentTable = ({
  columns,
  rows,
  loading,
  isDarkMode,
  openEditModal,
  handleDelete,
}) => {
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
                  colSpan={columns.length + 1}
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
    </div>
  );
};

export default StudentTable;
