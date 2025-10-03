import React, { useState, useEffect } from 'react';
import { getFirestoreConnectionStatus, monitorFirestoreConnection } from '../firebase/errorHandler';

const FirestoreConnectionMonitor = ({ isDarkMode }) => {
  const [connectionStatus, setConnectionStatus] = useState({
    isNetworkEnabled: true,
    connectionRetries: 0,
    maxRetries: 5,
    isHealthy: true
  });
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const status = getFirestoreConnectionStatus();
      setConnectionStatus(prev => ({
        ...status,
        isHealthy: status.connectionRetries === 0
      }));
      
      // Show status if there are connection issues
      setShowStatus(status.connectionRetries > 0);
    };

    // Initialize connection monitoring
    const checkConnection = monitorFirestoreConnection();
    
    // Update status periodically
    const interval = setInterval(updateStatus, 5000);
    
    // Initial status update
    updateStatus();

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Auto-hide after connection is restored
  useEffect(() => {
    if (connectionStatus.isHealthy && showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [connectionStatus.isHealthy, showStatus]);

  if (!showStatus && connectionStatus.isHealthy) {
    return null;
  }

  const getStatusColor = () => {
    if (connectionStatus.isHealthy) return 'bg-green-500';
    if (connectionStatus.connectionRetries < 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (connectionStatus.isHealthy) return 'Kết nối ổn định';
    if (connectionStatus.connectionRetries < 3) return `Đang kết nối lại (${connectionStatus.connectionRetries}/${connectionStatus.maxRetries})`;
    return 'Kết nối không ổn định';
  };

  const getStatusIcon = () => {
    if (connectionStatus.isHealthy) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    
    if (connectionStatus.connectionRetries > 0) {
      return (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    }
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
  };

  return (
    <div className={`fixed top-16 right-4 z-50 transition-all duration-300 ${showStatus ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
      <div 
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg text-white text-sm ${getStatusColor()}`}
        role="alert"
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {connectionStatus.isHealthy && (
          <button
            onClick={() => setShowStatus(false)}
            className="ml-2 hover:bg-white hover:bg-opacity-20 rounded p-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default FirestoreConnectionMonitor;