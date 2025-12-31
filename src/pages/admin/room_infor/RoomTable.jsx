import React from "react";
import { formatDate } from "../student_infor/studentInforHelpers";

const RoomTable = ({
  loading,
  roomsCount,
  filteredRooms,
  visibleRooms,
  selectedIds,
  toggleSelect,
  selectAllVisible,
  clearSelection,
  openEdit,
  handleDeleteRoom,
  groupByLink,
  isSaving,
  isDarkMode,
}) => {
  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 md:overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">Tổng: <strong>{roomsCount}</strong></div>
        </div>
        <table className="min-w-max table-auto">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={(filteredRooms || []).length > 0 && selectedIds.length === (filteredRooms || []).length}
                  onChange={(e) => e.target.checked ? selectAllVisible() : clearSelection()}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">STT</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Ngày thi</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tên môn học</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Mã ngành</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Ca thi</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Thời gian</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Phòng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Link phòng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {visibleRooms.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-sm text-gray-500">Không có dữ liệu</td>
              </tr>
            ) : groupByLink ? (
              (() => {
                const groups = new Map();
                const normalizeLink = (s) => (s || "").toString().trim();
                (filteredRooms || []).forEach((r) => {
                  const key = normalizeLink(r.examLink) || "(no-link)";
                  if (!groups.has(key)) groups.set(key, []);
                  groups.get(key).push(r);
                });

                const rows = [];
                let rowIndex = 0;
                groups.forEach((members, link) => {
                  rows.push(
                    <tr key={`group-${link}`} className="bg-gray-100 dark:bg-gray-700">
                      <td colSpan={10} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                        Link: {link === "(no-link)" ? <span className="text-gray-500">(không)</span> : <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{link}</a>} — Số phòng: {members.length}
                      </td>
                    </tr>
                  );

                  members.forEach((r, idx) => {
                    const cls = rowIndex % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700";
                    rows.push(
                      <tr key={r.id} className={`${cls} hover:bg-gray-100 dark:hover:bg-gray-600`}>
                        <td className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200"><input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{rowIndex + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.examDate ? formatDate(r.examDate) : <span className="text-sm text-gray-500">chưa cập nhật</span>}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.subject || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.majorCode || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.examSession || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.examTime || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.examRoom || "-"}</td>
                        <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 break-all">{r.examLink ? <a href={r.examLink} target="_blank" rel="noreferrer" className="hover:underline break-words">{r.examLink}</a> : <span className="text-sm text-gray-500">(không)</span>}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                          <div className="flex items-center space-x-2">
                            <button onClick={() => openEdit(r)} className="px-2 py-1 rounded bg-yellow-400 text-xs text-white hover:opacity-90">Sửa</button>
                            <button onClick={() => handleDeleteRoom(r)} disabled={isSaving} className="px-2 py-1 rounded bg-red-600 text-xs text-white hover:opacity-90">Xóa</button>
                          </div>
                        </td>
                      </tr>
                    );
                    rowIndex++;
                  });
                });
                return rows;
              })()
            ) : (
              filteredRooms.map((r, idx) => (
                <tr key={r.id} className={`${idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"} hover:bg-gray-100 dark:hover:bg-gray-600`}>
                  <td className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200"><input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.examDate ? formatDate(r.examDate) : <span className="text-sm text-gray-500">chưa cập nhật</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.subject || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.majorCode || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.examSession || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.examTime || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.examRoom || "-"}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 break-all">{r.examLink ? <a href={r.examLink} target="_blank" rel="noreferrer" className="hover:underline break-words">{r.examLink}</a> : <span className="text-sm text-gray-500">(không)</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => openEdit(r)} className="px-2 py-1 rounded bg-yellow-400 text-xs text-white hover:opacity-90">Sửa</button>
                      <button onClick={() => handleDeleteRoom(r)} disabled={isSaving} className="px-2 py-1 rounded bg-red-600 text-xs text-white hover:opacity-90">Xóa</button>
                    </div>
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

export default RoomTable;
