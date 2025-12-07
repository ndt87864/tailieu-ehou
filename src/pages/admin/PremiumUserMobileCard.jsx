import React from "react";

const PremiumUserMobileCard = ({
  tier,
  isDarkMode,
  onEdit,
  onDelete,
  onToggleStatus,
  formatPrice,
  getIconComponent,
}) => {
  return (
    <div
      className={`p-4 mb-3 rounded-lg shadow-sm border ${
        isDarkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Header: Icon, Name & Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isDarkMode ? "bg-gray-700 text-yellow-400" : "bg-gray-100 text-yellow-600"
            }`}
          >
            {getIconComponent(tier.icon)}
          </div>
          <div>
            <h3 className={`font-medium text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {tier.name}
            </h3>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  tier.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {tier.isActive ? "Đang hoạt động" : "Đã tạm dừng"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className={`border-t pt-3 space-y-2 ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
        <div className="flex justify-between items-center">
          <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Giá
          </span>
          <span className={`text-sm font-bold ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
            {formatPrice(tier.price)}
          </span>
        </div>
        
        <div className="flex flex-col mt-2">
          <span className={`text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Quyền lợi ({tier.permissions?.length || 0})
          </span>
          <div className="flex flex-wrap gap-1">
            {tier.permissions && tier.permissions.slice(0, 3).map((perm, idx) => (
              <span 
                key={idx}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                }`}
              >
                {perm}
              </span>
            ))}
            {tier.permissions && tier.permissions.length > 3 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
              }`}>
                +{tier.permissions.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={`mt-4 pt-3 border-t flex justify-end space-x-2 ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
        <button
          onClick={() => onToggleStatus(tier)}
          className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${
            isDarkMode
              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {tier.isActive ? "Tạm dừng" : "Kích hoạt"}
        </button>
        <button
          onClick={() => onEdit(tier)}
          className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${
            isDarkMode
              ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Sửa
        </button>
        <button
          onClick={() => onDelete(tier)}
          className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${
            isDarkMode
              ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
              : "bg-red-50 text-red-600 hover:bg-red-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Xóa
        </button>
      </div>
    </div>
  );
};

export default PremiumUserMobileCard;
