import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const FinalAdSenseComponent = () => {
  const [showAds, setShowAds] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Kiểm tra localStorage
    const hideAds = localStorage.getItem("hideAds") === "true";
    setIsHidden(hideAds);

    if (hideAds) return;

    // Đơn giản hóa điều kiện: chỉ hiện trên trang chủ và document pages
    const currentPath = location.pathname;
    const shouldShowAds =
      currentPath === "/" ||
      (currentPath.includes("/") && currentPath.split("/").length >= 3);

    if (!shouldShowAds) return;

    // Hiển thị sau 3 giây để đảm bảo nội dung đã load
    const timer = setTimeout(() => {
      setShowAds(true);
      // Load AdSense script
      loadAdSenseScript();
    }, 3000);

    return () => clearTimeout(timer);
  }, [location]);

  const loadAdSenseScript = () => {
    // Chỉ load script nếu chưa có
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4282799215996734";

      script.onload = () => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
          console.error("AdSense error:", e);
        }
      };

      document.head.appendChild(script);
    } else {
      // Script đã có, chỉ cần push ad
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  };

  const hideAds = () => {
    setIsHidden(true);
    localStorage.setItem("hideAds", "true");
  };

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
        backgroundColor: "transparent",
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

      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          width: "320px",
          height: "250px",
        }}
        data-ad-client="ca-pub-4282799215996734"
        data-ad-slot="3086001754"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default FinalAdSenseComponent;
