'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createContactsApiClient } from '@myorg/api-client';
import { NotificationDropdown } from './NotificationDropdown';
import { getSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';

import type { ContactsApiClient } from '@myorg/api-client';
import './NotificationBell.css';

export function NotificationBell({ userId }: { userId?: string }) {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [feedbackNotifCount, setFeedbackNotifCount] = useState(0);
  const [projectNotifCount, setProjectNotifCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize API client
  const apiClient = useMemo<ContactsApiClient>(() => {
    return createContactsApiClient(
      ''
    );
  }, []);

  const currentUserId = userId;
  const fetchInFlight = useRef(false);

  // Fetch feedback notification count
  const fetchFeedbackNotifs = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch('/api/feedback/notifications');
      if (res.ok) {
        const d = await res.json();
        setFeedbackNotifCount(d.unreadCount ?? 0);
      }
    } catch { /* silent */ }
  };

  // Fetch project notification count
  const fetchProjectNotifs = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch('/api/projects/notifications');
      if (res.ok) {
        const d = await res.json();
        setProjectNotifCount(d.unreadCount ?? 0);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchFeedbackNotifs();
    // Also listen for feedback-notif-updated events dispatched by NotificationDropdown
    const handler = () => fetchFeedbackNotifs();
    window.addEventListener('feedback-notifs-updated', handler);
    return () => window.removeEventListener('feedback-notifs-updated', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    fetchProjectNotifs();
    const handler = () => fetchProjectNotifs();
    window.addEventListener('project-notifs-updated', handler);
    return () => window.removeEventListener('project-notifs-updated', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    let mounted = true;
    const checkRequests = async () => {
      // Skip if a fetch is already in-flight to avoid request pile-up from
      // rapid Supabase broadcast events or focus events.
      if (fetchInFlight.current) return;
      fetchInFlight.current = true;
      try {
        const { requests } = await apiClient.getPendingRequests();
        if (mounted) {
          setPendingRequestsCount(requests.length);
        }
      } catch (err) {
        console.warn('Failed to fetch pending requests in bell:', err);
      } finally {
        fetchInFlight.current = false;
      }
    };

    if (!currentUserId) return;
    const supabase = getSupabaseBrowserClient();
    console.log('[NotificationBell] Subscribing to channel', `user-${currentUserId}`);
    const channel = supabase.channel(`user-${currentUserId}`)
      .on('broadcast', { event: 'contacts-updated' }, (payload) => {
        console.log('[NotificationBell] Received broadcast contacts-updated', payload);
        checkRequests();
        window.dispatchEvent(new MessageEvent('message', { data: { type: 'contacts-updated' } }));
      })
      .subscribe((status) => {
        console.log('[NotificationBell] Subscription status:', status);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUserId, apiClient]);

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
        {(pendingRequestsCount + feedbackNotifCount + projectNotifCount) > 0 && (
          <span className="framework-bell-badge">
            {(pendingRequestsCount + feedbackNotifCount + projectNotifCount) > 99 ? '99+' : (pendingRequestsCount + feedbackNotifCount + projectNotifCount)}
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
            userId={currentUserId}
            onFeedbackNotifsUpdate={(count) => setFeedbackNotifCount(count)}
            onProjectNotifsUpdate={(count) => setProjectNotifCount(count)}
          />
        </div>
      )}
    </div>
  );
}