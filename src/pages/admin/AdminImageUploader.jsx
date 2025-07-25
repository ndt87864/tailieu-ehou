import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import Sidebar from "../../components/Sidebar";
import UserHeader from "../../components/UserHeader";

const IMGBB_API_KEY = "9f41312b9e63774e3dbdcafd6f9f5c36";

const AdminImageUploader = () => {
  const db = getFirestore(getApp());
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);

  // Lấy danh sách ảnh đã upload từ Firestore
  useEffect(() => {
    const fetchImages = async () => {
      setLoadingImages(true);
      try {
        const querySnapshot = await getDocs(
          collection(db, "admin_uploaded_images")
        );
        const imgs = [];
        querySnapshot.forEach((docSnap) => {
          imgs.push({ id: docSnap.id, ...docSnap.data() });
        });
        setUploadedImages(imgs);
      } catch (err) {
        setError("Lỗi khi tải danh sách ảnh: " + err.message);
      } finally {
        setLoadingImages(false);
      }
    };
    fetchImages();
  }, [db, success]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setImageUrl("");
    setError("");
    setSuccess("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Vui lòng chọn ảnh để tải lên.");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    setImageUrl("");
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("key", IMGBB_API_KEY);
      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setImageUrl(data.data.url);
        setSuccess("Tải ảnh lên thành công!");
        // Lưu link ảnh và delete_url (là token cuối cùng trong delete_url) vào Firestore
        let deleteToken = "";
        if (data.data.delete_url) {
          // delete_url dạng: https://ibb.co/2ndCYJK/670a7e48ddcb85ac340c717a41047e5c
          // Lấy token cuối cùng sau dấu /
          const parts = data.data.delete_url.split("/");
          deleteToken = parts[parts.length - 1];
        }
        await addDoc(collection(db, "admin_uploaded_images"), {
          url: data.data.url,
          name: selectedFile.name,
          uploadedAt: new Date().toISOString(),
          delete_token: deleteToken,
        });
      } else {
        setError("Tải ảnh thất bại: " + (data.error?.message || ""));
      }
    } catch (err) {
      setError("Lỗi khi tải ảnh lên: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Xóa ảnh đã upload
  const handleDeleteImage = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh này?")) return;
    try {
      // Lấy delete_token từ Firestore
      const img = uploadedImages.find((img) => img.id === id);
      if (img && img.delete_token) {
        // Gọi API xóa ảnh trên ImgBB (https://api.imgbb.com/1/image?delete=token)
        await fetch(
          `https://api.imgbb.com/1/image?delete=${img.delete_token}`,
          { method: "GET" }
        );
      }
      await deleteDoc(doc(db, "admin_uploaded_images", id));
      setSuccess("Đã xóa ảnh thành công!");
    } catch (err) {
      setError("Lỗi khi xóa ảnh: " + err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <UserHeader title="Tải ảnh lên ImgBB" />
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-lg mx-auto p-6 bg-white rounded shadow mt-8">
            <h2 className="text-xl font-bold mb-4">Tải ảnh lên ImgBB</h2>
            <form onSubmit={handleUpload}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mb-4"
              />
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "Đang tải lên..." : "Tải ảnh lên"}
              </button>
            </form>
            {error && <div className="mt-4 text-red-600">{error}</div>}
            {success && <div className="mt-4 text-green-600">{success}</div>}
            {imageUrl && (
              <div className="mt-4">
                <img
                  src={imageUrl}
                  alt="Uploaded"
                  className="max-w-full h-auto rounded"
                />
                <div className="mt-2">
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Xem ảnh trên ImgBB
                  </a>
                </div>
              </div>
            )}

            <hr className="my-6" />
            <h3 className="text-lg font-semibold mb-2">
              Danh sách ảnh đã upload
            </h3>
            {loadingImages ? (
              <div>Đang tải danh sách ảnh...</div>
            ) : uploadedImages.length === 0 ? (
              <div>Chưa có ảnh nào được upload.</div>
            ) : (
              <ul className="space-y-4">
                {uploadedImages.map((img) => (
                  <li
                    key={img.id}
                    className="flex items-center space-x-4 bg-gray-50 p-2 rounded shadow-sm"
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{img.name}</div>
                      <a
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm"
                      >
                        Xem ảnh
                      </a>
                      <div className="text-xs text-gray-500">
                        {img.uploadedAt &&
                          new Date(img.uploadedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Xóa
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminImageUploader;
