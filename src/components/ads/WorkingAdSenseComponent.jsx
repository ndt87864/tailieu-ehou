import React, { useEffect, useState } from "react";

const WorkingAdSenseComponent = () => {
  const [showAds, setShowAds] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    // Kiểm tra localStorage
    const hideAds = localStorage.getItem("hideAds") === "true";
    setIsHidden(hideAds);

    if (hideAds) {
      console.log("AdSense: Ads hidden by user setting");
      return;
    }

    // Hiển thị quảng cáo sau 2 giây
    const timer = setTimeout(() => {
      console.log("AdSense: Showing ads now");
      setShowAds(true);

      // Load AdSense script
      setTimeout(loadAdSenseScript, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const loadAdSenseScript = () => {
    console.log("AdSense: Loading script...");

    // Kiểm tra nếu script đã có
    if (document.querySelector('script[src*="adsbygoogle.js"]')) {
      console.log("AdSense: Script already loaded, pushing ad");
      pushAd();
      return;
    }

    // Tạo script mới
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4282799215996734";

    script.onload = () => {
      console.log("AdSense: Script loaded successfully");
      pushAd();
    };

    script.onerror = () => {
      console.error("AdSense: Failed to load script");
    };

    document.head.appendChild(script);
  };

  const pushAd = () => {
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      console.log("AdSense: Ad pushed to queue");
    } catch (error) {
      console.error("AdSense: Error pushing ad:", error);
    }
  };

  const hideAds = () => {
    console.log("AdSense: User clicked hide");
    setIsHidden(true);
    localStorage.setItem("hideAds", "true");
  };

  // Debug log
  console.log("AdSense: Render state", { showAds, isHidden });

  if (isHidden || !showAds) {
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
        backgroundColor: "#f9f9f9",
        border: "1px solid #ddd",
        borderRadius: "8px",
        zIndex: 1000,
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      }}
    >
      {/* Nút đóng */}
      <div
        onClick={hideAds}
        style={{
          position: "absolute",
          top: "-10px",
          right: "-10px",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "#ff4444",
          color: "white",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 10,
          fontWeight: "bold",
        }}
      >
        ✕
      </div>

      {/* AdSense */}
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          width: "320px",
          height: "250px",
          borderRadius: "8px",
        }}
        data-ad-client="ca-pub-4282799215996734"
        data-ad-slot="3086001754"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />

      {/* Fallback content nếu quảng cáo không load */}
      <div
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          color: "#666",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          zIndex: -1,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div>📢 Quảng cáo</div>
          <div style={{ marginTop: "5px" }}>Đang tải...</div>
        </div>
      </div>
    </div>
  );
};

export default WorkingAdSenseComponent;
