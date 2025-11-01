import React, { useState } from "react";
import { processExcelFile } from "../../../utils/storage/excelUploader";
import { useTheme } from "../../../context/ThemeContext";

const ExcelUploader = () => {
  const { isDarkMode } = useTheme();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel"
      ) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Vui lòng chọn file Excel để tải lên");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const stats = await processExcelFile(selectedFile);
      setResult(stats);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Có lỗi xảy ra khi xử lý file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`p-6 ${
        isDarkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
      } rounded-lg shadow`}
    >
      <h2 className="text-xl font-semibold mb-4">Upload dữ liệu từ Excel</h2>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          Chọn file Excel
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          accept=".xlsx, .xls"
          className={`block w-full text-sm ${
            isDarkMode
              ? "bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
              : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-600 focus:border-blue-500"
          } rounded-lg cursor-pointer focus:outline-none`}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          File Excel phải có các cột: STT, Câu hỏi, Trả lời, Ngành, Học phần
        </p>
      </div>

      {selectedFile && (
        <div className="mb-4">
          <p
            className={`text-sm ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            File đã chọn:{" "}
            <span className="font-semibold">{selectedFile.name}</span> (
            {Math.round(selectedFile.size / 1024)} KB)
          </p>
        </div>
      )}

      {error && (
        <div
          className={`p-4 mb-4 text-sm rounded-lg ${
            isDarkMode
              ? "bg-red-900/30 text-red-300"
              : "bg-red-100 text-red-800"
          }`}
        >
          <p>{error}</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className={`${
          uploading
            ? "bg-gray-500 cursor-not-allowed"
            : isDarkMode
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-blue-600 hover:bg-blue-700"
        } px-4 py-2 text-white font-medium rounded-lg flex items-center`}
      >
        {uploading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
            Đang xử lý...
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            Tải lên và xử lý
          </>
        )}
      </button>

      {result && (
        <div
          className={`mt-6 p-4 rounded-lg ${
            isDarkMode
              ? "bg-green-900/30 text-green-200"
              : "bg-green-50 text-green-800"
          }`}
        >
          <h3 className="text-lg font-medium mb-2">Kết quả xử lý:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Số danh mục đã thêm: {result.categoriesAdded}</li>
            <li>Số tài liệu đã thêm: {result.documentsAdded}</li>
            <li>Số câu hỏi đã thêm: {result.questionsAdded}</li>
          </ul>

          {result.errors && result.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="font-medium mb-1">Các lỗi phát sinh:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExcelUploader;
