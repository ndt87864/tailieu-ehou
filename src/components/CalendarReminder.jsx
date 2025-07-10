import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const CalendarReminder = () => {
  const { isDarkMode } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [calendarNotes, setCalendarNotes] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayNotes, setDayNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissedNotes, setDismissedNotes] = useState([]);

  useEffect(() => {
    // Check if the user has previously opened the calendar
    const calendarOpen = localStorage.getItem('calendarOpen');
    
    // Only show if explicitly opened before
    if (calendarOpen === 'true') {
      setIsVisible(true);
    } else {
      // Default is closed
      setIsVisible(false);
    }
    
    // Set current date
    setCurrentDate(new Date());
    
    // Generate calendar days for current month
    generateCalendarDays(new Date());

    // Fetch calendar notes
    fetchCalendarNotes();
  }, []);

  // Fetch calendar notes from Firestore
  const fetchCalendarNotes = async () => {
    try {
      setLoading(true);
      const notesQuery = query(
        collection(db, 'calendar_notes'),
        orderBy('date', 'asc')
      );
      
      const snapshot = await getDocs(notesQuery);
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date
      }));
      
      setCalendarNotes(notes);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching calendar notes:', error);
      setLoading(false);
    }
  };

  // Generate calendar days for a given date's month
  const generateCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Generate array for calendar
    const days = [];
    
    // Add empty spaces for days before first day of month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    setCalendarDays(days);
  };

  // Handle selecting a day to show notes
  const handleDayClick = (day) => {
    if (!day) return;
    
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDay(selectedDate);
    
    // Format the selected date as YYYY-MM-DD
    const formattedDate = formatDateForComparison(selectedDate);
    
    // Filter notes for the selected day
    const notesForDay = calendarNotes.filter(note => {
      // Đảm bảo date từ note được xử lý đúng
      const noteDate = note.date;
      
      // Nếu noteDate đã là chuỗi YYYY-MM-DD, sử dụng trực tiếp
      if (typeof noteDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
        return noteDate === formattedDate;
      }
      
      // Nếu noteDate là timestamp hoặc Date, chuyển đổi sang chuỗi
      return formatDateForComparison(new Date(noteDate)) === formattedDate;
    });
    
    setDayNotes(notesForDay);
    
    // Reset dismissed notes for this day
    const notesIds = notesForDay.map(note => note.id);
    setDismissedNotes(prev => prev.filter(id => !notesIds.includes(id)));
  };

  // Format date as YYYY-MM-DD for comparison
  const formatDateForComparison = (date) => {
    // Sửa lỗi múi giờ bằng cách tạo chuỗi ngày thủ công thay vì dùng toISOString
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('calendarOpen', 'false');
  };

  const handleOpen = () => {
    setIsVisible(true);
    localStorage.setItem('calendarOpen', 'true');
    // Refresh notes when opening calendar
    fetchCalendarNotes();
  };

  // Check if today has notes
  const todayHasNotes = () => {
    const today = new Date();
    const formattedToday = formatDateForComparison(today);
    
    return calendarNotes.some(note => {
      const noteDate = note.date;
      
      // If noteDate is already a YYYY-MM-DD string, use it directly
      if (typeof noteDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
        return noteDate === formattedToday;
      }
      
      // If noteDate is a timestamp or Date, convert it to string
      return formatDateForComparison(new Date(noteDate)) === formattedToday;
    });
  };

  // Check if today has important notes
  const todayHasImportantNotes = () => {
    const today = new Date();
    const formattedToday = formatDateForComparison(today);
    
    return calendarNotes.some(note => {
      const noteDate = note.date;
      let dateMatches;
      
      if (typeof noteDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
        dateMatches = noteDate === formattedToday;
      } else {
        dateMatches = formatDateForComparison(new Date(noteDate)) === formattedToday;
      }
      
      return dateMatches && note.important === true;
    });
  };

  // Handle dismissing a note
  const handleDismissNote = (noteId) => {
    setDismissedNotes(prev => [...prev, noteId]);
  };

  // Check if the note is dismissed
  const isNoteDismissed = (noteId) => {
    return dismissedNotes.includes(noteId);
  };

  // Format the date in Vietnamese style
  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'long'
  }).format(currentDate);

  // Day of week labels
  const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  // Return collapsed calendar button if not visible
  if (!isVisible) {
    const hasImportantNotesToday = todayHasImportantNotes();
    const hasRegularNotesToday = todayHasNotes() && !hasImportantNotesToday;
    
    return (
      <button 
        onClick={handleOpen}
        className={`fixed right-4 bottom-24 z-40 p-2 rounded-full shadow-lg ${
          hasImportantNotesToday 
            ? 'bg-red-700 text-white' 
            : hasRegularNotesToday 
              ? 'bg-blue-600 text-white' 
              : isDarkMode 
                ? 'bg-gray-700 text-white' 
                : 'bg-white text-gray-800'
        } hover:shadow-xl transition-all`}
        aria-label="Hiển thị lịch"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
    );
  }

  // Check if a day has notes
  const dayHasNotes = (day) => {
    if (!day) return false;
    
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const formattedCheckDate = formatDateForComparison(checkDate);
    
    return calendarNotes.some(note => {
      const noteDate = note.date;
      
      // Nếu noteDate đã là chuỗi YYYY-MM-DD, sử dụng trực tiếp
      if (typeof noteDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
        return noteDate === formattedCheckDate;
      }
      
      // Nếu noteDate là timestamp hoặc Date, chuyển đổi sang chuỗi
      return formatDateForComparison(new Date(noteDate)) === formattedCheckDate;
    });
  };

  // Check if a day has important notes
  const dayHasImportantNotes = (day) => {
    if (!day) return false;
    
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const formattedCheckDate = formatDateForComparison(checkDate);
    
    return calendarNotes.some(note => {
      const noteDate = note.date;
      let dateMatches;
      
      // Nếu noteDate đã là chuỗi YYYY-MM-DD, sử dụng trực tiếp
      if (typeof noteDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
        dateMatches = noteDate === formattedCheckDate;
      } else {
        // Nếu noteDate là timestamp hoặc Date, chuyển đổi sang chuỗi
        dateMatches = formatDateForComparison(new Date(noteDate)) === formattedCheckDate;
      }
      
      return dateMatches && note.important === true;
    });
  };

  return (
    <div className={`fixed right-4 bottom-24 z-40 rounded-lg shadow-lg ${
      isDarkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-800 border border-gray-200'
    } p-3 w-72 transition-all`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formattedDate}</span>
        </h3>
        <button 
          onClick={handleClose}
          className={`p-1 rounded-full ${
            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          } transition-colors`}
          aria-label="Đóng lịch"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Hiển thị lịch dạng grid */}
      <div className={`rounded-md overflow-hidden ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        {/* Header for days of week */}
        <div className="grid grid-cols-7 gap-0">
          {daysOfWeek.map((day, index) => (
            <div 
              key={index} 
              className={`text-center text-xs py-1 font-medium ${
                isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'
              } ${index === 0 ? 'text-red-400' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map((day, index) => {
            // Check if this day matches the selected day
            const isSelectedDay = selectedDay && 
              day === selectedDay.getDate() && 
              currentDate.getMonth() === selectedDay.getMonth() && 
              currentDate.getFullYear() === selectedDay.getFullYear();
              
            return (
              <div 
                key={index} 
                className={`text-center py-2 text-sm relative cursor-pointer ${
                  day === null
                    ? 'pointer-events-none'
                    : isDarkMode 
                      ? 'hover:bg-gray-600' 
                      : 'hover:bg-gray-200'
                } ${
                  isSelectedDay
                    ? 'text-blue-500 font-bold'
                    : day === currentDate.getDate() 
                      ? isDarkMode 
                        ? 'bg-green-800 text-white' 
                        : 'bg-green-100 text-green-800 font-medium' 
                      : ''
                } ${
                  day === null 
                    ? 'text-gray-500' 
                    : isDarkMode 
                      ? 'text-gray-300' 
                      : 'text-gray-700'
                }`}
                onClick={() => handleDayClick(day)}
              >
                {day}
                
                {/* Indicator for days with notes */}
                {dayHasNotes(day) && (
                  <div className={`absolute top-0 right-0 p-0.5`}>
                    <svg 
                      className={`h-2 w-2 ${
                        dayHasImportantNotes(day)
                          ? 'text-red-500'
                          : isDarkMode 
                            ? 'text-blue-400' 
                            : 'text-blue-500'
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                      <path d="M10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Hiển thị ghi chú cho ngày đã chọn */}
      {selectedDay && (
        <div className={`mt-3 p-2 rounded-md ${
          isDarkMode ? 'bg-gray-700/70' : 'bg-gray-100'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">
              {new Intl.DateTimeFormat('vi-VN', {
                weekday: 'long',
                day: 'numeric',
                month: 'numeric'
              }).format(selectedDay)}
            </h4>
            <button 
              className={`p-1 rounded-full text-xs ${
                isDarkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
              }`}
              onClick={() => setSelectedDay(null)}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {dayNotes.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {dayNotes
                .filter(note => !isNoteDismissed(note.id))
                .map(note => (
                <div 
                  key={note.id} 
                  className={`p-2 rounded-md text-xs ${
                    note.important
                      ? isDarkMode 
                        ? 'bg-red-900/40 border-l-2 border-red-600' 
                        : 'bg-red-50 border-l-2 border-red-500'
                      : isDarkMode 
                        ? 'bg-gray-800 border-l-2 border-gray-600' 
                        : 'bg-white border-l-2 border-gray-300'
                  } relative`}
                >
                  <button 
                    onClick={() => handleDismissNote(note.id)} 
                    className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-label="Tắt thông báo"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="font-medium flex items-center justify-between">
                    <span>{note.title}</span>
                    {note.important && (
                      <span className="text-xs px-1.5 py-0.5 text-red-800 rounded-sm">[ Quan trọng]</span>
                    )}
                  </div>
                  {note.description && (
                    <div className={`mt-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>{note.description}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-xs py-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Không có ghi chú nào cho ngày này
            </div>
          )}
        </div>
      )}
      
      {/* Ngày tháng hiện tại */}
      {!selectedDay && (
        <div className={`mt-2 p-2 rounded-md ${
          isDarkMode ? 'bg-gray-700/70' : 'bg-gray-100'
        }`}>
          <p className="text-sm font-medium">
            {new Intl.DateTimeFormat('vi-VN', {
              weekday: 'long',
              day: 'numeric',
              month: 'numeric',
              year: 'numeric'
            }).format(currentDate)}
          </p>
          {/* Hiển thị các ghi chú cho ngày hiện tại */}
          {dayHasNotes(currentDate.getDate()) && (
            <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
              {calendarNotes
                .filter(note => {
                  const noteDate = note.date;
                  const formattedCurrentDate = formatDateForComparison(currentDate);
                  
                  // Nếu noteDate đã là chuỗi YYYY-MM-DD, sử dụng trực tiếp
                  if (typeof noteDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
                    return noteDate === formattedCurrentDate;
                  }
                  
                  // Nếu noteDate là timestamp hoặc Date, chuyển đổi sang chuỗi
                  return formatDateForComparison(new Date(noteDate)) === formattedCurrentDate;
                })
                .map(note => (
                  !isNoteDismissed(note.id) && (
                    <div 
                      key={note.id} 
                      className={`p-2 rounded-md text-xs ${
                        note.important
                          ? isDarkMode 
                            ? 'bg-red-900/40 border-l-2 border-red-600' 
                            : 'bg-red-50 border-l-2 border-red-500'
                          : isDarkMode 
                            ? 'bg-gray-800 border-l-2 border-gray-600' 
                            : 'bg-white border-l-2 border-gray-300'
                      }`}
                    >
                      <div className="font-medium flex items-center justify-between">
                        <span>{note.title}</span>
                        {note.important && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-600 text-white rounded-sm">Quan trọng</span>
                        )}
                        <button 
                          className={`p-1 rounded-full text-xs ${
                            isDarkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                          }`}
                          onClick={() => handleDismissNote(note.id)}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {note.description && (
                        <div className={`mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>{note.description}</div>
                      )}
                    </div>
                  )
                ))
              }
            </div>
          )}
        </div>
      )}
      
      <div className="text-xs mt-2 text-center">
        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Chúc bạn học tập tốt!</span>
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
        </div>
      )}
    </div>
  );
};

export default CalendarReminder;
