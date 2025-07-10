import React from "react";

const UserExcelCell = ({
  userData,
  isDarkMode,
  shouldShowExcelControls,
  handleExcelPermissionToggle,
  handleExcelPercentageChange,
  getDefaultExcelPercentage,
}) => {
  if (!shouldShowExcelControls(userData)) {
    return (
      <span
        className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
      >
        Không khả dụng
      </span>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <button
          onClick={() =>
            handleExcelPermissionToggle(
              userData.id,
              userData.isExcelEnabled !== false
            )
          }
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            userData.isExcelEnabled !== false
              ? "bg-green-600 focus:ring-green-500"
              : "bg-gray-200 focus:ring-gray-500"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              userData.isExcelEnabled !== false
                ? "translate-x-5"
                : "translate-x-0"
            }`}
          />
        </button>
        <span
          className={`text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Excel {userData.isExcelEnabled !== false ? "Bật" : "Tắt"}
        </span>
      </div>
      {userData.isExcelEnabled !== false && (
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min="0"
            max="100"
            value={
              userData.excelPercentage || getDefaultExcelPercentage(userData)
            }
            onChange={(e) =>
              handleExcelPercentageChange(userData.id, e.target.value)
            }
            className={`w-16 px-2 py-1 text-sm border rounded ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
          />
          <span
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            %
          </span>
        </div>
      )}
      <div
        className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
      >
        Mặc định: {getDefaultExcelPercentage(userData)}%
      </div>
    </div>
  );
};

export default UserExcelCell;
