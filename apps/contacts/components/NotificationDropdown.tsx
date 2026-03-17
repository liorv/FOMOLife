'use client';

import { useEffect, useState } from 'react';
import type { ContactsApiClient } from '@myorg/api-client';
import type { PendingRequest, PendingRequestsResponse } from '@myorg/types';

type NotificationDropdownProps = {
  apiClient: ContactsApiClient;
  onClose: () => void;
  onRequestsUpdate: (count: number) => void;
  onContactsUpdate: () => void;
};

export function NotificationDropdown({
  apiClient,
  onClose,
  onRequestsUpdate,
  onContactsUpdate
}: NotificationDropdownProps) {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const response: PendingRequestsResponse = await apiClient.getPendingRequests();
      setPendingRequests(response.requests);
      onRequestsUpdate(response.requests.length);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await apiClient.approveRequest(requestId);
      await loadPendingRequests();
      onContactsUpdate();
    } catch (error) {
      console.error('Failed to approve request:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await apiClient.rejectRequest(requestId);
      await loadPendingRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="notification-dropdown">
        <div className="notification-header">
          <h3>Connection Approvals</h3>
        </div>
        <div className="notification-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Connection Approvals</h3>
        <button onClick={onClose} className="notification-close">&times;</button>
      </div>
      <div className="notification-content">
        {pendingRequests.length === 0 ? (
          <p className="notification-empty">No pending requests</p>
        ) : (
          pendingRequests.map((request) => (
            <div key={request.id} className="notification-item">
              <div className="requester-info">
                <img
                  src={request.requesterProfile.avatarUrl}
                  alt={request.requesterProfile.fullName}
                  className="requester-avatar"
                />
                <div className="requester-details">
                  <div className="requester-name">{request.requesterProfile.fullName}</div>
                  <div className="requester-email">{request.requesterProfile.email}</div>
                  <div className="requester-provider">
                    Connected via {request.requesterProfile.oauthProvider}
                  </div>
                </div>
              </div>
              <div className="notification-actions">
                <button
                  onClick={() => handleApprove(request.id)}
                  disabled={processing === request.id}
                  className="btn-approve"
                >
                  {processing === request.id ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  disabled={processing === request.id}
                  className="btn-reject"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}