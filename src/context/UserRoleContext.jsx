import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserData } from '../firebase/firestoreService';
import { useAuth } from './AuthContext';

// Create the context and export it
export const UserRoleContext = createContext();

export function useUserRole() {
  return useContext(UserRoleContext);
}

export function UserRoleProvider({ children }) {
  const [userRole, setUserRole] = useState('user');
  const [paidCategories, setPaidCategories] = useState([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    async function fetchUserRole() {
      if (currentUser) {
        try {
          const userData = await getUserData(currentUser.uid);
          if (userData) {
            setUserRole(userData.role || 'user');
            setPaidCategories(userData.paidCategories || []);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      } else {
        // Reset to default if no user is logged in
        setUserRole('user');
        setPaidCategories([]);
      }
    }

    fetchUserRole();
  }, [currentUser]);

  const value = {
    userRole,
    paidCategories,
    isAdmin: userRole === 'admin',
  };

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}
