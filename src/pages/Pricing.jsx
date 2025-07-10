import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { DocumentMobileHeader } from '../components/MobileHeader';
import UserHeader from '../components/UserHeader';
import ThemeColorPicker from '../components/ThemeColorPicker';
import { useTheme } from '../context/ThemeContext';
import { getAllCategories, getDocumentsByCategory } from '../firebase/firestoreService';
import { auth, db } from '../firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import ZaloContact from '../components/ZaloContact';
import Footer from '../components/Footer';

const Pricing = () => {
  const { isDarkMode } = useTheme();
  const [user] = useAuthState(auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMain, setOpenMain] = useState(-1);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [premiumTiers, setPremiumTiers] = useState([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [pricingContent, setPricingContent] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);
  const scrollContainerRef = useRef(null);

  // Fetch categories and documents for sidebar
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const categoriesData = await getAllCategories();
        if (!categoriesData || categoriesData.length === 0) {
          throw new Error('Không thể tải danh mục');
        }
        setCategories(categoriesData);
        setOpenMain(0);

        const docsPromises = categoriesData.map(async (category) => {
          const docsData = await getDocumentsByCategory(category.id);
          return { categoryId: category.id, docs: docsData };
        });
        const docsResults = await Promise.all(docsPromises);
        const docsMap = docsResults.reduce((acc, { categoryId, docs }) => {
          acc[categoryId] = docs;
          return acc;
        }, {});
        setDocuments(docsMap);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu:", err);
        setError(err.message || "Không thể tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch premium tiers
  useEffect(() => {
    const fetchPremiumTiers = async () => {
      try {
        setTiersLoading(true);
        // Simple query without compound index requirement
        const tiersQuery = query(collection(db, 'premium_tiers'));
        const snapshot = await getDocs(tiersQuery);
        
        const allTiers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter active tiers and sort by price in JavaScript
        const activeTiers = allTiers
          .filter(tier => tier.isActive === true)
          .sort((a, b) => (a.price || 0) - (b.price || 0));
        
        setPremiumTiers(activeTiers);
      } catch (error) {
        console.error('Error fetching premium tiers:', error);
      } finally {
        setTiersLoading(false);
      }
    };

    fetchPremiumTiers();
  }, []);

  // Fetch pricing content
  useEffect(() => {
    const fetchPricingContent = async () => {
      try {
        setContentLoading(true);
        const q = query(collection(db, 'pricing_content'), orderBy('number', 'asc'));
        const snapshot = await getDocs(q);
        const contentData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPricingContent(contentData);
      } catch (error) {
        console.error('Error fetching pricing content:', error);
      } finally {
        setContentLoading(false);
      }
    };

    fetchPricingContent();
  }, []);

  // Handle window resize for responsive layout
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Function to scroll the premium tiers container
  const scrollPremiumTiers = (direction) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.75; // Scroll about one card
      
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };
  
  // Available icons for premium tiers - same as in PremiumUserManagement
  const availableIcons = [
    { name: 'default', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )},
    { name: 'crown', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7l4 1 4-5 4 5 4-1 1 8-18 0 1-8z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15v2h14v-2" />
      </svg>
    )},
    { name: 'star', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    )},
    { name: 'diamond', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 2H6L2 8l10 14L22 8l-4-6z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 8h20" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2v20" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 2l6 6l6-6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 8l5 10" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8l-5 10" />
      </svg>
    )},
    { name: 'shield', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )},
    { name: 'trophy', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5h14M5 5a2 2 0 002 2h10a2 2 0 002-2M12 12V7" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5v4a7 7 0 007 7v0a7 7 0 007-7V5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 21h8M12 16v5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 21a2 2 0 01-6 0" />
      </svg>
    )},
    { name: 'lightning', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )},
    { name: 'fire', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth="2" />
        <text x="12" y="15" textAnchor="middle" fontSize={windowWidth < 768 ? "6" : "8"} fontWeight="bold" fill="currentColor" stroke="none">VIP</text>
      </svg>
    )},
    { name: 'heart', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )},
    { name: 'rocket', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth="2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v10M8" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.5 11c0-1.5-1.5-2-2.5-2s-2.5.5-2.5 2c0 1.5 5 1 5 3 0 1.5-1.5 2-2.5 2s-2.5-.5-2.5-2" />
      </svg>
    )},
    { name: 'gift', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    )},
    { name: 'magic', component: (
      <svg className={`${windowWidth < 768 ? 'w-4 h-4' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    )}
  ];

  // Get icon component by name
  const getIconComponent = (iconName) => {
    const icon = availableIcons.find(i => i.name === iconName);
    return icon ? icon.component : availableIcons[0].component;
  };
  
  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <p className="mt-3">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`${isDarkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-100 border-red-400'} border text-red-500 px-4 py-3 rounded relative`} role="alert">
            <strong className="font-bold">Lỗi!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
          <div className="mt-4 flex flex-col md:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Tải lại trang
            </button>
            <Link to="/" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-md text-center">
              Quay về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render content item with external links only
  const renderContentItem = (item) => {
    let content = item.text;
    
    // Handle external links only
    if (item.links && item.links.length > 0) {
      item.links.forEach(link => {
        if (link.linkText && link.linkUrl) {
          const linkElement = `<a href="${link.linkUrl}" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">${link.linkText}</a>`;
          content = content.replace(link.linkText, linkElement);
        }
      });
    }

    return (
      <li key={item.id} className="flex items-start">
        <span className="flex items-center justify-center bg-green-600 text-white rounded-full h-6 w-6 mr-2 flex-shrink-0">
          {item.number}
        </span>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </li>
    );
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Mobile Header */}
      {windowWidth < 770 && (
        <DocumentMobileHeader
          setIsSidebarOpen={toggleSidebar}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="flex min-h-screen">
        {/* Sidebar - Fixed on desktop, slidable on mobile */}
        {categories.length > 0 && (
          <div className={`${windowWidth < 770
            ? `fixed inset-y-0 left-0 z-20 transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : 'sticky top-0 h-screen z-10'
          }`}>
            <Sidebar
              sidebarData={categories}
              documents={documents}
              openMain={openMain}
              setOpenMain={setOpenMain}
              selectedCategory={categories[0] || null}
              selectedDocument={null}
              setSelectedDocument={() => {}}
              setSearch={() => {}}
              setDocuments={setDocuments}
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
              hideDocumentTree={false}
            />
          </div>
        )}

        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && windowWidth < 770 && (
          <div
            className="fixed inset-0 z-10 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Desktop Header - Fixed at top */}
          {windowWidth >= 770 && (
            <div className="sticky top-0 z-20 w-full">
              <UserHeader
                user={user}
                isDarkMode={isDarkMode}
                setIsThemePickerOpen={setIsThemePickerOpen}
                setIsSidebarOpen={toggleSidebar}
                title="Hướng dẫn liên hệ"
              />
            </div>
          )}

          <div className="flex flex-col flex-1">
            <main className="flex-1 overflow-y-auto p-4">
              <div className="container mx-auto py-8">
                {/* Premium Packages Section */}
                {!tiersLoading && premiumTiers.length > 0 && (
                  <div className="mb-12 px-4 sm:px-6 md:px-8">
                    <h1 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      Gói người dùng cao cấp
                    </h1>
                    
                    <div className="relative mb-8 overflow-hidden">
                      {/* Navigation buttons */}
                      <button
                        onClick={() => scrollPremiumTiers('left')}
                        className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full ${
                          isDarkMode 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                            : 'bg-white text-gray-800 hover:bg-gray-100'
                        } shadow-lg`}
                        aria-label="Previous"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => scrollPremiumTiers('right')}
                        className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full ${
                          isDarkMode 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                            : 'bg-white text-gray-800 hover:bg-gray-100'
                        } shadow-lg`}
                        aria-label="Next"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                      
                      {/* Right shadow indicator for scrollable content */}
                      {premiumTiers.length > 3 && (
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900/20 to-transparent z-10 pointer-events-none"></div>
                      )}
                      
                      <div 
                        ref={scrollContainerRef}
                        className="overflow-x-auto pb-4" 
                        style={{
                          scrollbarWidth: 'none', 
                          msOverflowStyle: 'none'
                        }}
                      >
                        <div 
                          className={`flex ${windowWidth < 768 ? 'space-x-4' : 'space-x-6'} px-0.5`}
                          style={{
                            width: '100%',
                            WebkitScrollbar: {
                              display: 'none'
                            }
                          }}
                        >
                          {premiumTiers.map((tier) => (
                            <div 
                              key={tier.id} 
                              className={`${
                                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                              } rounded-lg shadow-lg border hover:shadow-xl transition-shadow duration-300 flex-none flex flex-col
                              p-6 md:p-6 sm:p-4
                              ${windowWidth < 768 ? 'max-h-[280px] overflow-y-auto' : ''}`}
                              style={{
                                width: windowWidth < 768 
                                  ? 'calc(85% - 1rem)' 
                                  : 'calc((100% - 3rem) / 3)'
                              }}
                            >
                              <div className={`text-center ${windowWidth < 768 ? 'mb-2' : 'mb-6'}`}>
                                <div className={`inline-flex items-center justify-center ${windowWidth < 768 ? 'w-8 h-8 mb-2' : 'w-12 h-12 mb-4'} rounded-full ${
                                  isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {getIconComponent(tier.icon || 'default')}
                                </div>
                                <h3 className={`${windowWidth < 768 ? 'text-base' : 'text-xl'} font-bold ${windowWidth < 768 ? 'mb-1' : 'mb-2'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {tier.name}
                                </h3>
                                <div className={`${windowWidth < 768 ? 'text-xl' : 'text-3xl'} font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                  {formatPrice(tier.price)}
                                </div>
                              </div>
                            
                              <div className={`flex-1 ${windowWidth < 768 ? 'mb-2 max-h-[100px] overflow-y-auto' : 'mb-6'}`}>
                                {windowWidth < 768 ? (
                                  // Mobile view - compact permissions display
                                  tier.permissions && tier.permissions.length > 0 ? (
                                    <div>
                                      <h4 className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Quyền hạn:
                                      </h4>
                                      <ul className="space-y-1">
                                        {tier.permissions.map((permission, index) => (
                                          <li key={index} className="flex items-start">
                                            <svg className="w-3 h-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            <span className={`text-xs leading-tight ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                              {permission}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <div className="flex items-start">
                                      <svg className="w-3 h-3 text-yellow-500 mt-0.5 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                      </svg>
                                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Đang cập nhật
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  // Desktop view - full permissions display
                                  tier.permissions && tier.permissions.length > 0 ? (
                                    <div>
                                      <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Quyền hạn:
                                      </h4>
                                      <ul className="space-y-2">
                                        {tier.permissions.map((permission, index) => (
                                          <li key={index} className="flex items-start">
                                            <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                              {permission}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <div>
                                      <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Quyền hạn:
                                      </h4>
                                      <div className="flex items-start">
                                        <svg className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          Đang cập nhật
                                        </span>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            
                              <div className="text-center mt-auto">
                                <a 
                                  href="https://zalo.me/0915918742"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center justify-center w-full ${windowWidth < 768 ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} font-medium rounded-md transition-colors ${
                                    isDarkMode 
                                      ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                >
                                  <svg className={`${windowWidth < 768 ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-2'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                  </svg>
                                  Liên hệ Zalo
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-4 sm:px-6 md:px-8">
                  <h1 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Hướng dẫn liên hệ
                  </h1>

                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6 mb-8`}>
                    {contentLoading ? (
                      <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
                        <p className="mt-2">Đang tải nội dung...</p>
                      </div>
                    ) : pricingContent.length > 0 ? (
                      
                      <ol className="space-y-4">
                        {pricingContent.map(renderContentItem)}
                      </ol>
                    ) : (
                      <ol className="space-y-4">
                        <li className="flex items-start">
                          <span className="flex items-center justify-center bg-green-600 text-white rounded-full h-6 w-6 mr-2 flex-shrink-0">1</span>
                          <div>Liên hệ với quản trị viên để được hỗ trợ học tập và trao đổi thông tin tại <a href="https://zalo.me/0915918742" className="text-blue-600">Zalo 0876236682</a>.</div>
                        </li>
                        <li className="flex items-start">
                          <span className="flex items-center justify-center bg-green-600 text-white rounded-full h-6 w-6 mr-2 flex-shrink-0">2</span>
                          <div>Lập tài khoản người dùng tại <Link to="/register" className="text-blue-600">Đăng ký tài khoản</Link> hoặc nếu đã có tài khoản thì bạn nhấp <Link to="/login" className="text-blue-600">Đăng nhập</Link>.</div>
                        </li>
                        <li className="flex items-start">
                          <span className="flex items-center justify-center bg-green-600 text-white rounded-full h-6 w-6 mr-2 flex-shrink-0">3</span>
                          <div>Ủng hộ tôi với ly cà phê hoặc yêu cầu hỗ trợ học tập.</div>
                        </li>
                        <li className="flex items-start">
                          <span className="flex items-center justify-center bg-green-600 text-white rounded-full h-6 w-6 mr-2 flex-shrink-0">4</span>
                          <div>Trải nghiệm trang Web, mở khóa toàn bộ thông tin tài liệu.</div>
                        </li>
                      </ol>
                    )}
                  </div>

                  <h2 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Hỗ trợ tài liệu học tập</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 hover:shadow-md transition-shadow`}>
                      <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                        </div>
                      </div>
                      <h3 className={`text-center text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Hỗ trợ full 9/10 tất cả các môn hệ thống</h3>
                    </div>

                    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 hover:shadow-md transition-shadow`}>
                      <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                          </svg>
                        </div>
                      </div>
                      <h3 className={`text-center text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Hỗ trợ đề cương trong thời gian học</h3>
                    </div>

                    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 hover:shadow-md transition-shadow`}>
                      <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                          </svg>
                        </div>
                      </div>
                      <h3 className={`text-center text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Hỗ trợ thi kết thúc môn học full điểm các môn</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 hover:shadow-md transition-shadow`}>
                      <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </div>
                      </div>
                      <h3 className={`text-center text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Hỗ trợ đồ án full 9/10</h3>
                    </div>

                    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 hover:shadow-md transition-shadow`}>
                      <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                        </div>
                      </div>
                      <h3 className={`text-center text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Báo cáo thực tập, chuyên đề thực tập, luận văn thạc sĩ tất cả các chuyên ngành</h3>
                    </div>

                    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 hover:shadow-md transition-shadow`}>
                      <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                      </div>
                      <h3 className={`text-center text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Dịch vụ kế toán, tư vấn khi ra trường, tư vấn pháp lý</h3>
                    </div>
                  </div>
                </div>
              </div>
            </main>
            
            {/* Add Footer */}
            <Footer />
          </div>
        </div>
      </div>

      {/* Add ZaloContact component */}
      <ZaloContact />
      
      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default Pricing;