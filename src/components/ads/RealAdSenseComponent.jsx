import React, { useEffect, useState, useRef } from "react";

const RealAdSenseComponent = () => {
  const [visible, setVisible] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const adRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Hiển thị sau 3 giây để đảm bảo nội dung đã load
    const timer = setTimeout(() => {
      setVisible(true);
      loadAdSense();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const loadAdSense = () => {
    // Kiểm tra xem script đã được load chưa
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4282799215996734";

      script.onload = () => {
        initializeAd();
      };

      script.onerror = () => {
        console.error("Failed to load AdSense script");
      };

      document.head.appendChild(script);
    } else {
      initializeAd();
    }
  };

  const initializeAd = () => {
    // Kiểm tra nếu đã được khởi tạo rồi thì không làm gì
    if (initialized.current || !adRef.current) {
      return;
    }

    try {
      // Kiểm tra xem ins element đã có ads chưa
      const insElement = adRef.current;
      if (insElement.dataset.adsbygoogleStatus) {
        setAdLoaded(true);
        return;
      }

      // Đợi một chút để đảm bảo DOM đã sẵn sàng
      setTimeout(() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          initialized.current = true;
          setAdLoaded(true);
        } catch (error) {
          console.error("AdSense push error:", error);
        }
      }, 500);
    } catch (error) {
      console.error("AdSense initialization error:", error);
    }
  };

  const hideAd = () => {
    setVisible(false);
    localStorage.setItem("hideAds", "true");
  };

  // Kiểm tra localStorage
  if (localStorage.getItem("hideAds") === "true") {
    return null;
  }

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
        backgroundColor: "transparent",
        zIndex: 1000,
      }}
    >
      {/* Nút đóng */}
      <div
        style={{
          position: "absolute",
          top: "-10px",
          right: "-10px",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "white",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 10,
        }}
        onClick={hideAd}
      >
        ✕
      </div>
      {/* AdSense */}
      <ins
        ref={adRef}
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

      {/* Fallback nếu AdSense không load */}
      {!adLoaded && (
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(248, 248, 248, 0.9)",
            border: "1px dashed #ddd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            color: "#888",
            textAlign: "center",
          }}
        >
          <div>
            <div>📢</div>
            <div>Đang tải quảng cáo...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealAdSenseComponent;
