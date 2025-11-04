import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserData } from '../firebase/firestoreService';
import { useAuth } from './AuthContext';

// Create the context and export it
export const UserRoleContext = createContext();

// Utility functions for admin session caching
const ADMIN_SESSION_KEY = 'adminSession';
const ADMIN_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const cacheAdminSession = (userId, role, paidCategories) => {
  const sessionData = {
    userId,
    role,
    paidCategories,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionData));
};

const getCachedAdminSession = (userId) => {
  try {
    const cached = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      // Validate cache: same user and not expired
      if (data.userId === userId && Date.now() - data.timestamp < ADMIN_CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error('Error reading admin cache:', error);
  }
  return null;
};

const clearAdminSession = () => {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
};

export function useUserRole() {
  return useContext(UserRoleContext);
}

export function UserRoleProvider({ children }) {
  const [userRole, setUserRole] = useState('user');
  const [paidCategories, setPaidCategories] = useState([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    async function fetchUserRole() {
      setRoleLoading(true);
      
      if (currentUser) {
        try {
          // Kiểm tra cache trước
          const cachedSession = getCachedAdminSession(currentUser.uid);
          if (cachedSession && cachedSession.role === 'admin') {
            // Sử dụng cache nếu là admin
            setUserRole(cachedSession.role);
            setPaidCategories(cachedSession.paidCategories);
            setRoleLoading(false);
            return;
          }

          // Nếu không có cache hoặc không phải admin, fetch từ Firestore
          const userData = await getUserData(currentUser.uid);
          if (userData) {
            const role = userData.role || 'user';
            const paid = userData.paidCategories || [];
            
            setUserRole(role);
            setPaidCategories(paid);
            
            // Cache nếu là admin
            if (role === 'admin') {
              cacheAdminSession(currentUser.uid, role, paid);
            } else {
              clearAdminSession();
            }
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          
          // Fallback: sử dụng cache nếu fetch fail
          const cachedSession = getCachedAdminSession(currentUser.uid);
          if (cachedSession) {
            setUserRole(cachedSession.role);
            setPaidCategories(cachedSession.paidCategories);
          } else {
            setUserRole('user');
            setPaidCategories([]);
          }
        }
      } else {
        // Reset to default if no user is logged in
        setUserRole('user');
        setPaidCategories([]);
        clearAdminSession();
      }
      
      setRoleLoading(false);
    }

    fetchUserRole();
  }, [currentUser]);

  const value = {
    userRole,
    paidCategories,
    isAdmin: userRole === 'admin',
    roleLoading,
  };

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}
