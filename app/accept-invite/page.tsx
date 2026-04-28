"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createContactsApiClient } from "@myorg/api-client";

interface InviterProfile {
  fullName: string;
  email: string;
  oauthProvider: string;
  avatarUrl?: string;
}

function AcceptInvitePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [inviterProfile, setInviterProfile] = useState<InviterProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    // Clear previous state when token changes
    setError(null);
    setInviterProfile(null);
    setRequestSent(false);

    if (!token) {
      setError("No invite token provided.");
      return;
    }

    const apiClient = createContactsApiClient();
    apiClient.getInviteDetails(token)
      .then(setInviterProfile)
      .catch((err: any) => {
        if (err?.status === 401) {
          const returnTo = `/accept-invite?token=${encodeURIComponent(token)}`;
          router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        let msg = err?.message || "Invalid or expired invitation.";
        if (err?.body?.error) {
          msg += ` (${err.body.error})`;
        }
        setError(msg);
      });
  }, [token]);

  const handleRequestLinkage = async () => {
    setProcessing(true);
    try {
      const apiClient = createContactsApiClient();
      await apiClient.requestLinkage(token);
      setRequestSent(true);
    } catch (err: any) {
      if (err?.status === 401) {
        const returnTo = `/accept-invite?token=${encodeURIComponent(token)}`;
        router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      let msg = err?.message || "Failed to send connection request.";
      if (err?.body?.error) {
        msg += ` (${err.body.error})`;
      }
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  if (error) {
    return (
      <main className="invite-page">
        <div className="invite-card">
          <div className="invite-header">
            <span className="material-icons invite-icon invite-icon--error">error_outline</span>
            <h1 className="invite-title">Invitation Error</h1>
          </div>
          <p className="invite-message invite-message--error">{error}</p>
          <button
            onClick={() => {
              window.location.href = `/?tab=people`;
            }}
            className="invite-button invite-button--secondary"
          >
            Return to Contacts
          </button>
        </div>
      </main>
    );
  }

  if (!inviterProfile) {
    return (
      <main className="invite-page">
        <div className="invite-card">
          <div className="invite-loading">
            <div className="invite-spinner"></div>
            <p>Loading invitation…</p>
          </div>
        </div>
      </main>
    );
  }

  if (requestSent) {
    return (
      <main className="invite-page">
        <div className="invite-card">
          <div className="invite-header">
            <span className="material-icons invite-icon invite-icon--success">check_circle</span>
            <h1 className="invite-title">Request Sent</h1>
          </div>
          <p className="invite-message">
            Your connection request has been sent to <strong>{inviterProfile.fullName}</strong>.
            You will be notified once they approve your request.
          </p>
          <button
            onClick={() => {
              window.location.href = `/?tab=people&accepted=true`;
            }}
            className="invite-button invite-button--primary"
          >
            Return to Contacts
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="invite-page">
      <div className="invite-card">
        <div className="invite-header">
          <span className="material-icons invite-icon invite-icon--invite">person_add</span>
          <h1 className="invite-title">Connect with {inviterProfile.fullName}</h1>
        </div>
        <div className="invite-content">
          <div className="inviter-profile">
            {inviterProfile.avatarUrl ? (
              <img
                src={inviterProfile.avatarUrl}
                alt={inviterProfile.fullName}
                className="inviter-avatar"
              />
            ) : (
                <div className="inviter-avatar-fallback">
                    {inviterProfile.fullName.charAt(0)}
                </div>
            )}
            <div className="inviter-info">
              <h2 className="inviter-name">{inviterProfile.fullName}</h2>
              <p className="inviter-email">{inviterProfile.email}</p>
              <p className="inviter-provider">Connected via {inviterProfile.oauthProvider}</p>
            </div>
          </div>
          <p className="invite-message">
            This person wants to connect with you. Review their profile above and click "Request Linkage" to send a connection request.
          </p>
          <div className="invite-actions">
            <button
              onClick={handleRequestLinkage}
              disabled={processing}
              className="invite-button invite-button--primary"
            >
              {processing ? (
                <>
                  <div className="invite-spinner invite-spinner--small"></div>
                  Sending Request…
                </>
              ) : (
                <>
                  <span className="material-icons">send</span>
                  Request Linkage
                </>
              )}
            </button>
            <button
              onClick={() => {
                window.location.href = `/?tab=people`;
              }}
              disabled={processing}
              className="invite-button invite-button--secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptInvitePageInner />
    </Suspense>
  );
}
