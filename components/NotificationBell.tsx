'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NotificationSettingsModal } from '@myorg/ui';
import { PushNotificationSettings } from './PushNotificationSettings';
import { createContactsApiClient } from '@myorg/api-client';
import { NotificationDropdown } from './NotificationDropdown';
import { getSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { invalidateContactsCache } from '@/lib/client/contactsCache';
import { ensurePushSubscription } from '@/lib/client/pushNotifications';

import type { ContactsApiClient } from '@myorg/api-client';
import './NotificationBell.css';

export function NotificationBell({ userId }: { userId?: string }) {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [feedbackNotifCount, setFeedbackNotifCount] = useState(0);
  const [projectNotifCount, setProjectNotifCount] = useState(0);
  const [taskNotifCount, setTaskNotifCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [settingsUserId, setSettingsUserId] = useState<string | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize API client
  const apiClient = useMemo<ContactsApiClient>(() => {
    return createContactsApiClient(
      ''
    );
  }, []);

  const currentUserId = userId;

  useEffect(() => {
    if (!currentUserId) return;
    void ensurePushSubscription().catch((error) => {
      console.warn('Push subscription failed:', error);
    });
  }, [currentUserId]);

  useEffect(() => {
    setPendingRequestsCount(0);
    setFeedbackNotifCount(0);
    setProjectNotifCount(0);
    setTaskNotifCount(0);
    setShowDropdown(false);
    setSettingsUserId(null);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = getSupabaseBrowserClient();
    console.log('[NotificationBell] Subscribing to channel', `user-${currentUserId}`);
    const channel = supabase.channel(`user-${currentUserId}`)
      .on('broadcast', { event: 'contacts-updated' }, (payload) => {
        console.log('[NotificationBell] Received broadcast contacts-updated', payload);
        window.dispatchEvent(new MessageEvent('message', { data: { type: 'contacts-updated' } }));
      })
      .subscribe((status) => {
        console.log('[NotificationBell] Subscription status:', status);
      });

    return () => {
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
        ref={bellRef}
        className="framework-bell-button" 
        onClick={toggleDropdown}
        aria-label="Notifications"
        aria-expanded={showDropdown}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM16 17H8V11C8 8.52 9.51 6.5 12 6.5C14.49 6.5 16 8.52 16 11V17Z" fill="currentColor"/>
        </svg>
        {(pendingRequestsCount + feedbackNotifCount + projectNotifCount + taskNotifCount) > 0 && (
          <span className="framework-bell-badge">
            {(pendingRequestsCount + feedbackNotifCount + projectNotifCount + taskNotifCount) > 99 ? '99+' : (pendingRequestsCount + feedbackNotifCount + projectNotifCount + taskNotifCount)}
          </span>
        )}
      </button>

      {currentUserId && (
        <div className="framework-notifications-dropdown-container" hidden={!showDropdown}>
          <NotificationDropdown 
            key={currentUserId}
            isOpen={showDropdown}
            apiClient={apiClient} 
            onClose={closeDropdown} 
            onOpenSettings={() => {
              setShowDropdown(false);
              bellRef.current?.focus();
              setSettingsUserId(currentUserId);
            }}
            onRequestsUpdate={(count) => setPendingRequestsCount(count)}
            onContactsUpdate={() => {
                invalidateContactsCache();
                window.postMessage({ type: 'contacts-updated' }, window.location.origin);
              }}
            userId={currentUserId}
            onFeedbackNotifsUpdate={(count) => {
              setFeedbackNotifCount(count);
            }}
            onProjectNotifsUpdate={(count) => {
              setProjectNotifCount(count);
            }}
            onTaskNotifsUpdate={(count) => {
              setTaskNotifCount(count);
            }}
          />
        </div>
      )}
      {currentUserId && settingsUserId === currentUserId && createPortal(
        <NotificationSettingsModal
          onEnableNotifications={async () => {
            const status = await ensurePushSubscription(true);
            if (status === 'blocked') return 'Notifications are enabled in the bell, but browser notifications are blocked. Allow notifications in your browser or device settings; browsers cannot ask again after a denial.';
            if (status === 'unsupported') return 'Notifications are enabled in the bell. Device notifications require a supported browser over HTTPS or an installed Home Screen app on iPhone/iPad.';
            if (status === 'disabled') return 'Notifications are enabled in the bell, but browser permission was not granted. Enable device notifications in Browser & mobile when ready.';
          }}
          onClose={() => setSettingsUserId(null)}
          deviceControls={<PushNotificationSettings />}
        />,
        document.body,
      )}
    </div>
  );
}