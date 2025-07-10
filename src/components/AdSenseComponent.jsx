import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const AdSenseComponent = () => {
  const [showAds, setShowAds] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const location = useLocation();

  // Kiểm tra nội dung trang có hợp lệ không
  const checkValidContent = useCallback(() => {
    const rootElement = document.getElementById('root');
    if (!rootElement) return false;

    // Kiểm tra có ít nhất 200 ký tự nội dung thực sự
    const textContent = rootElement.textContent?.trim() || '';
    const hasSubstantialContent = textContent.length > 200;

    // Kiểm tra không phải trang loading, error hoặc trang trống
    const isNotLoadingOrError = !textContent.includes('Loading') &&
                               !textContent.includes('Đang tải') &&
                               !textContent.includes('404') &&
                               !textContent.includes('Page not found') &&
                               !textContent.includes('Error') &&
                               !document.title.includes('404') &&
                               !document.title.includes('Error');

    // Kiểm tra có navigation menu hoặc header (dấu hiệu của trang có layout hoàn chỉnh)
    const hasNavigation = rootElement.querySelector('nav') || 
                         rootElement.querySelector('header') ||
                         rootElement.querySelector('[class*="sidebar"]') ||
                         rootElement.querySelector('[class*="menu"]');

    // Kiểm tra có nội dung chính
    const hasMainContent = rootElement.querySelector('main') || 
                          rootElement.querySelector('[class*="content"]') ||
                          rootElement.querySelector('article') ||
                          textContent.includes('Tài liệu') ||
                          textContent.includes('Danh mục');

    return hasSubstantialContent && isNotLoadingOrError && (hasNavigation || hasMainContent);
  }, []);

  // Kiểm tra route có hợp lệ không
  const isValidRoute = useCallback(() => {
    const currentPath = location.pathname;
    
    // Chỉ hiển thị quảng cáo trên các trang có nội dung thực sự
    const validRoutes = [
      '/',           // Trang chủ
      '/pricing',    // Trang pricing
      '/profile'     // Trang profile
    ];

    // Cho phép trên các trang document cụ thể
    const isDocumentPage = currentPath.includes('/') && 
                          currentPath.split('/').length >= 3 && 
                          !currentPath.includes('/admin') &&
                          !currentPath.includes('/login') &&
                          !currentPath.includes('/register');

    return validRoutes.includes(currentPath) || isDocumentPage;
  }, [location.pathname]);

  useEffect(() => {
    // Kiểm tra localStorage
    const hideAds = localStorage.getItem('hideAds') === 'true';
    setIsHidden(hideAds);

    if (hideAds) return;

    // Reset state khi route thay đổi
    setShowAds(false);
    setIsContentLoaded(false);

    if (!isValidRoute()) {
      return;
    }

    // Kiểm tra nội dung với độ trễ để đảm bảo React đã render xong
    const checkContent = () => {
      if (checkValidContent()) {
        setIsContentLoaded(true);
        // Thêm delay để đảm bảo người dùng thấy nội dung trước
        setTimeout(() => {
          setShowAds(true);
        }, 3000); // 3 giây sau khi nội dung đã tải
      }
    };

    // Kiểm tra ngay lập tức
    const immediateCheck = setTimeout(checkContent, 1000);
    
    // Kiểm tra lại sau một khoảng thời gian
    const delayedCheck = setTimeout(checkContent, 3000);
    
    // Kiểm tra lần cuối để đảm bảo
    const finalCheck = setTimeout(checkContent, 5000);

    return () => {
      clearTimeout(immediateCheck);
      clearTimeout(delayedCheck);
      clearTimeout(finalCheck);
    };
  }, [location, isValidRoute, checkValidContent]);

  const loadAdSense = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      // Đảm bảo AdSense script đã được tải
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
      }

      // Tìm element quảng cáo và khởi tạo
      const adElement = document.querySelector('#ads-container ins.adsbygoogle');
      if (adElement && !adElement.getAttribute('data-adsbygoogle-status')) {
        window.adsbygoogle.push({});
      }
    } catch (error) {
      console.error('Lỗi khởi tạo AdSense:', error);
    }
  }, []);

  useEffect(() => {
    if (showAds && isContentLoaded) {
      // Delay nhỏ để đảm bảo DOM đã render
      setTimeout(loadAdSense, 500);
    }
  }, [showAds, isContentLoaded, loadAdSense]);

  const hideAds = () => {
    setIsHidden(true);
    localStorage.setItem('hideAds', 'true');
  };

  // Không hiển thị nếu bị ẩn, chưa có nội dung, hoặc route không hợp lệ
  if (isHidden || !showAds || !isContentLoaded || !isValidRoute()) {
    return null;
  }

  return (
    <div 
      id="ads-container"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: '320px',
        height: '250px',
        backgroundColor: 'transparent'
      }}
    >
      <div 
        onClick={hideAds}
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        ✕
      </div>
      
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
    </div>
  );
};

export default AdSenseComponent;
