import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase/firebase';
import { useUserRole } from '../../context/UserRoleContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  getFooterContent, 
  updateFooterContent,
  addFooterItem,
  deleteFooterItem
} from '../../firebase/firestoreService';
import Sidebar from '../../components/Sidebar';
import { DocumentMobileHeader } from '../../components/MobileHeader';
import UserHeader from '../../components/UserHeader';
import ThemeColorPicker from '../../components/ThemeColorPicker';

const FooterManagement = () => {
  const [footerSections, setFooterSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useAuthState(auth);
  const { isAdmin } = useUserRole();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  
  const [sidebarData, setSidebarData] = useState([]);
  const [sidebarDocuments, setSidebarDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newFooter, setNewFooter] = useState({ title: '', content: [''] });
  const [editFooter, setEditFooter] = useState({ id: '', title: '', content: [''] });
  const [footerToDelete, setFooterToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    loadFooterData();
  }, [isAdmin, navigate]);

  const loadFooterData = async () => {
    try {
      setLoading(true);
      const data = await getFooterContent();
      if (data && data.sections) {
        setFooterSections(data.sections);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error loading footer data:", err);
      setError("Không thể tải dữ liệu footer: " + err.message);
      setLoading(false);
    }
  };

  const handleAddFooter = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!newFooter.title.trim()) {
      setFormError('Vui lòng nhập tiêu đề');
      return;
    }
    
    if (newFooter.content.length === 0 || !newFooter.content.some(item => item.trim())) {
      setFormError('Vui lòng nhập ít nhất một nội dung');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const footerData = {
        id: Date.now().toString(),
        title: newFooter.title.trim(),
        content: newFooter.content.filter(item => item.trim()),
        createdAt: new Date()
      };
      
      const updatedSections = [...footerSections, footerData];
      const updatedFooter = { sections: updatedSections };
      
      await updateFooterContent(updatedFooter);
      setFooterSections(updatedSections);
      setNewFooter({ title: '', content: [''] });
      setShowAddModal(false);
      setSuccessMessage('Đã thêm footer thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Error adding footer:", error);
      setFormError('Lỗi khi thêm footer: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFooter = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!editFooter.title.trim()) {
      setFormError('Vui lòng nhập tiêu đề');
      return;
    }
    
    if (editFooter.content.length === 0 || !editFooter.content.some(item => item.trim())) {
      setFormError('Vui lòng nhập ít nhất một nội dung');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const updatedSections = footerSections.map(section => 
        section.id === editFooter.id 
          ? {
              ...section,
              title: editFooter.title.trim(),
              content: editFooter.content.filter(item => item.trim()),
              updatedAt: new Date()
            }
          : section
      );
      
      const updatedFooter = { sections: updatedSections };
      await updateFooterContent(updatedFooter);
      setFooterSections(updatedSections);
      setShowEditModal(false);
      setSuccessMessage('Đã cập nhật footer thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Error updating footer:", error);
      setFormError('Lỗi khi cập nhật footer: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFooter = async () => {
    if (!footerToDelete) return;
    
    try {
      setIsSubmitting(true);
      const updatedSections = footerSections.filter(section => section.id !== footerToDelete.id);
      const updatedFooter = { sections: updatedSections };
      
      await updateFooterContent(updatedFooter);
      setFooterSections(updatedSections);
      setShowDeleteModal(false);
      setFooterToDelete(null);
      setSuccessMessage('Đã xóa footer thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Error deleting footer:", error);
      setFormError('Lỗi khi xóa footer: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (footer) => {
    setEditFooter({
      id: footer.id,
      title: footer.title,
      content: [...footer.content]
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (footer) => {
    setFooterToDelete(footer);
    setShowDeleteModal(true);
  };

  const addContentItem = (isEdit = false) => {
    if (isEdit) {
      setEditFooter({
        ...editFooter,
        content: [...editFooter.content, '']
      });
    } else {
      setNewFooter({
        ...newFooter,
        content: [...newFooter.content, '']
      });
    }
  };

  const removeContentItem = (index, isEdit = false) => {
    if (isEdit) {
      const newContent = editFooter.content.filter((_, i) => i !== index);
      setEditFooter({
        ...editFooter,
        content: newContent.length > 0 ? newContent : ['']
      });
    } else {
      const newContent = newFooter.content.filter((_, i) => i !== index);
      setNewFooter({
        ...newFooter,
        content: newContent.length > 0 ? newContent : ['']
      });
    }
  };

  const updateContentItem = (index, value, isEdit = false) => {
    if (isEdit) {
      const newContent = [...editFooter.content];
      newContent[index] = value;
      setEditFooter({
        ...editFooter,
        content: newContent
      });
    } else {
      const newContent = [...newFooter.content];
      newContent[index] = value;
      setNewFooter({
        ...newFooter,
        content: newContent
      });
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Mobile Header */}
      {windowWidth < 770 && (
        <DocumentMobileHeader 
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className={`${windowWidth < 770 
          ? `fixed inset-y-0 left-0 z-20 transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}` 
          : 'sticky top-0 h-screen z-10'
        }`}>
          <Sidebar
            sidebarData={sidebarData}
            documents={sidebarDocuments}
            openMain={openMain}
            setOpenMain={setOpenMain}
            selectedCategory={selectedCategory}
            selectedDocument={selectedDocument}
            setSelectedDocument={setSelectedDocument}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            hideDocumentTree={true}
          />
        </div>
        
        {/* Overlay for mobile */}
        {isSidebarOpen && windowWidth < 770 && (
          <div 
            className="fixed inset-0 z-10 bg-black/50" 
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Desktop Header */}
          {windowWidth >= 770 && (
            <div className="sticky top-0 z-20 w-full">
              <UserHeader 
                user={user}
                isDarkMode={isDarkMode}
                setIsThemePickerOpen={setIsThemePickerOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              />
            </div>
          )}
          
          {/* Theme Color Picker */}
          {isThemePickerOpen && (
            <ThemeColorPicker onClose={() => setIsThemePickerOpen(false)} />
          )}
          
          <main className={`p-4 md:p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-100 text-gray-900'}`}>
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <h1 className="text-2xl font-bold mb-4 md:mb-0">Quản lý Footer</h1>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm Footer
                  </span>
                </button>
              </div>
            
              {/* Success message */}
              {successMessage && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                  {successMessage}
                </div>
              )}
              
              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4">Đang tải dữ liệu...</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  {footerSections && footerSections.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              STT
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Tiêu đề
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Nội dung
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Thao tác
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                          {footerSections.map((footer, index) => (
                            <tr key={footer.id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {index + 1}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {footer.title}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <ul className="list-disc list-inside space-y-1">
                                  {footer.content.map((item, itemIndex) => (
                                    <li key={itemIndex} className="text-gray-600 dark:text-gray-300">
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => openEditModal(footer)}
                                    className="text-blue-500 hover:text-blue-700"
                                    title="Chỉnh sửa"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(footer)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Xóa"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p>Chưa có footer nào được tạo.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      
      {/* Add Footer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black bg-opacity-70"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="px-6 pt-6 pb-6">
                <h3 className="text-xl font-medium leading-6 mb-5">Thêm Footer Mới</h3>
                
                {formError && (
                  <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md text-sm">
                    {formError}
                  </div>
                )}
                
                <form onSubmit={handleAddFooter}>
                  <div className="mb-4">
                    <label htmlFor="footerTitle" className="block text-sm font-medium mb-2">
                      Tiêu đề
                    </label>
                    <input
                      type="text"
                      id="footerTitle"
                      className={`w-full rounded-md py-2 px-3 ${
                        isDarkMode
                          ? 'bg-gray-700 text-white border-gray-600'
                          : 'bg-white text-gray-900 border-gray-300'
                      } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Nhập tiêu đề footer..."
                      value={newFooter.title}
                      onChange={(e) => setNewFooter({...newFooter, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium">
                        Nội dung
                      </label>
                      <button
                        type="button"
                        onClick={() => addContentItem(false)}
                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                      >
                        Thêm nội dung
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {newFooter.content.map((item, index) => (
                        <div key={index} className="flex space-x-2 items-center">
                          <textarea
                            rows="2"
                            placeholder={`Nội dung ${index + 1}...`}
                            value={item}
                            onChange={(e) => updateContentItem(index, e.target.value, false)}
                            className={`flex-1 rounded py-2 px-3 ${
                              isDarkMode
                                ? 'bg-gray-700 text-white border-gray-600'
                                : 'bg-white text-gray-900 border-gray-300'
                            } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                          {newFooter.content.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeContentItem(index, false)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      className={`px-4 py-2 rounded-md ${
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      } transition-colors`}
                      onClick={() => {
                        setShowAddModal(false);
                        setNewFooter({ title: '', content: [''] });
                        setFormError('');
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors ${
                        isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Đang thêm...' : 'Thêm Footer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Footer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black bg-opacity-70"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="px-6 pt-6 pb-6">
                <h3 className="text-xl font-medium leading-6 mb-5">Chỉnh sửa Footer</h3>
                
                {formError && (
                  <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md text-sm">
                    {formError}
                  </div>
                )}
                
                <form onSubmit={handleEditFooter}>
                  <div className="mb-4">
                    <label htmlFor="editFooterTitle" className="block text-sm font-medium mb-2">
                      Tiêu đề
                    </label>
                    <input
                      type="text"
                      id="editFooterTitle"
                      className={`w-full rounded-md py-2 px-3 ${
                        isDarkMode
                          ? 'bg-gray-700 text-white border-gray-600'
                          : 'bg-white text-gray-900 border-gray-300'
                      } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Nhập tiêu đề footer..."
                      value={editFooter.title}
                      onChange={(e) => setEditFooter({...editFooter, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium">
                        Nội dung
                      </label>
                      <button
                        type="button"
                        onClick={() => addContentItem(true)}
                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                      >
                        Thêm nội dung
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {editFooter.content.map((item, index) => (
                        <div key={index} className="flex space-x-2 items-center">
                          <textarea
                            rows="2"
                            placeholder={`Nội dung ${index + 1}...`}
                            value={item}
                            onChange={(e) => updateContentItem(index, e.target.value, true)}
                            className={`flex-1 rounded py-2 px-3 ${
                              isDarkMode
                                ? 'bg-gray-700 text-white border-gray-600'
                                : 'bg-white text-gray-900 border-gray-300'
                            } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                          {editFooter.content.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeContentItem(index, true)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      className={`px-4 py-2 rounded-md ${
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      } transition-colors`}
                      onClick={() => {
                        setShowEditModal(false);
                        setEditFooter({ id: '', title: '', content: [''] });
                        setFormError('');
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors ${
                        isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black bg-opacity-70"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="px-6 pt-6 pb-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-xl font-medium">Xác nhận xóa</h3>
                    <div className="mt-3">
                      <p className="text-base">
                        Bạn có chắc chắn muốn xóa footer "{footerToDelete?.title}"? Hành động này không thể khôi phục.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className={`w-full inline-flex justify-center rounded-md px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={handleDeleteFooter}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang xóa...' : 'Xóa'}
                  </button>
                  <button
                    type="button"
                    className={`mt-3 w-full inline-flex justify-center rounded-md px-4 py-2 ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    } font-medium focus:outline-none sm:mt-0 sm:w-auto`}
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FooterManagement;
