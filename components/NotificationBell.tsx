'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createContactsApiClient } from '@myorg/api-client';
import { NotificationDropdown } from './NotificationDropdown';
import type { ContactsApiClient } from '@myorg/api-client';
import './NotificationBell.css';

export function NotificationBell() {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize API client
  const apiClient = useMemo<ContactsApiClient>(() => {
    return createContactsApiClient(
      ''
    );
  }, []);

  // Poll for pending requests
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkRequests = async () => {
      try {
        const { requests } = await apiClient.getPendingRequests();
        if (mounted) {
          setPendingRequestsCount(requests.length);
        }
      } catch (err) {
        console.warn('Failed to fetch pending requests in bell:', err);
      }
      
      // Poll every 10 seconds
      if (mounted) {
        timeoutId = setTimeout(checkRequests, 10000);
      }
    };

    checkRequests();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [apiClient]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const closeDropdown = () => {
    setShowDropdown(false);
  };

  return (
    <div className="framework-notification-wrapper" ref={dropdownRef}>
      <button 
        className="framework-bell-button" 
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM16 17H8V11C8 8.52 9.51 6.5 12 6.5C14.49 6.5 16 8.52 16 11V17Z" fill="currentColor"/>
        </svg>
        {pendingRequestsCount > 0 && (
          <span className="framework-bell-badge">
            {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="framework-notifications-dropdown-container">
          <NotificationDropdown 
            apiClient={apiClient} 
            onClose={closeDropdown} 
            onRequestsUpdate={(count) => setPendingRequestsCount(count)}
            onContactsUpdate={() => {}}
          />
        </div>
      )}
    </div>
  );
}