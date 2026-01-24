import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/firebase";
import { useUserRole } from "../../context/UserRoleContext";
import { useTheme } from "../../context/ThemeContext";
import { getAppSettings, updateAppSettings } from "../../firebase/appSettingsService";

const DocumentSettings = () => {
  const [user] = useAuthState(auth);
  const { isAdmin } = useUserRole();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [questionRates, setQuestionRates] = useState({
    guest: 20,
    free: 50,
    paidPerCategoryDefault: 50,
    paidFullOrPaidCategoryPaid: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    (async () => {
      try {
        const settings = await getAppSettings();
        if (!mounted) return;
        if (settings && settings.questionRates) setQuestionRates(settings.questionRates);
      } catch (e) {
        console.warn("Failed to load app settings:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className={`${isDarkMode ? "bg-gray-900 text-white" : "bg-slate-100 text-gray-900"} min-h-screen p-6`}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Cài đặt Tỷ lệ câu hỏi</h1>

        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          {loading ? (
            <div>Đang tải...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm">Khách (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={questionRates.guest}
                  onChange={(e) => setQuestionRates({ ...questionRates, guest: Number(e.target.value) })}
                  className="mt-1 w-full px-2 py-1 rounded border"
                />
              </div>
              <div>
                <label className="block text-sm">User miễn phí (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={questionRates.free}
                  onChange={(e) => setQuestionRates({ ...questionRates, free: Number(e.target.value) })}
                  className="mt-1 w-full px-2 py-1 rounded border"
                />
              </div>
              <div>
                <label className="block text-sm">User trả phí (chưa trả mục) (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={questionRates.paidPerCategoryDefault}
                  onChange={(e) => setQuestionRates({ ...questionRates, paidPerCategoryDefault: Number(e.target.value) })}
                  className="mt-1 w-full px-2 py-1 rounded border"
                />
              </div>
              <div>
                <label className="block text-sm">User trả phí (đã trả mục / full) (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={questionRates.paidFullOrPaidCategoryPaid}
                  onChange={(e) => setQuestionRates({ ...questionRates, paidFullOrPaidCategoryPaid: Number(e.target.value) })}
                  className="mt-1 w-full px-2 py-1 rounded border"
                />
              </div>
            </div>
          )}

          <div className="mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={async () => {
                setSaving(true);
                try {
                  await updateAppSettings({ questionRates });
                  setMessage("Đã lưu");
                  setTimeout(() => setMessage(""), 2000);
                } catch (e) {
                  console.error(e);
                  setMessage("Lỗi khi lưu");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            {message && <span className="ml-3">{message}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSettings;
