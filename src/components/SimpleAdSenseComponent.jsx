import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const SimpleAdSenseComponent = () => {
  const [showAds, setShowAds] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Kiểm tra localStorage
    const hideAds = localStorage.getItem("hideAds") === "true";
    setIsHidden(hideAds);

    if (hideAds) return;

    // Hiển thị quảng cáo sau 2 giây (thay vì 3)
    const timer = setTimeout(() => {
      setShowAds(true);
      console.log("AdSense: Showing ads after content check");
    }, 2000);

    return () => clearTimeout(timer);
  }, [location]);

  const hideAds = () => {
    setIsHidden(true);
    localStorage.setItem("hideAds", "true");
    console.log("AdSense: Ads hidden by user");
  };

  // Thêm debug log
  console.log("AdSense Debug:", {
    showAds,
    isHidden,
    pathname: location.pathname,
  });

  if (isHidden || !showAds) {
    return null;
  }

  return (
    <div
      id="ads-container"
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "320px",
        height: "250px",
        backgroundColor: "#f0f0f0", // Thêm background để thấy được
        border: "2px solid #ccc", // Thêm border để debug
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={hideAds}
        style={{
          position: "absolute",
          top: "-10px",
          right: "-10px",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          color: "white",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        ✕
      </div>

      {/* Hiển thị placeholder thay vì AdSense thật để test */}
      <div style={{ textAlign: "center", color: "#666" }}>
        <div>📢 AdSense Placeholder</div>
        <div style={{ fontSize: "12px", marginTop: "5px" }}>
          Route: {location.pathname}
        </div>
      </div>

      {/* AdSense thật - comment out để test */}
      {/*
      <ins 
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '320px',
          height: '250px'
        }}
        data-ad-client="ca-pub-4282799215996734"
        data-ad-slot="3086001754"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      */}
    </div>
  );
};

export default SimpleAdSenseComponent;
