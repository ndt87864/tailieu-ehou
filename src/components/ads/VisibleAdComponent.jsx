import React, { useEffect, useState } from "react";

const VisibleAdComponent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Hiển thị ngay lập tức sau 1 giây
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "320px",
        height: "250px",
        backgroundColor: "#f0f0f0",
        border: "2px solid #333",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "5px",
          right: "10px",
          cursor: "pointer",
          fontSize: "18px",
          fontWeight: "bold",
        }}
        onClick={() => setVisible(false)}
      >
        ✕
      </div>

      <div style={{ textAlign: "center", padding: "20px" }}>
        <div style={{ fontSize: "24px", marginBottom: "10px" }}>📢</div>
        <div
          style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}
        >
          Quảng cáo Test
        </div>
        <div style={{ fontSize: "12px", color: "#666" }}>
          Đây là vị trí quảng cáo sẽ hiển thị
        </div>
        <div style={{ fontSize: "10px", color: "#999", marginTop: "10px" }}>
          AdSense sẽ thay thế nội dung này
        </div>
      </div>
    </div>
  );
};

export default VisibleAdComponent;
