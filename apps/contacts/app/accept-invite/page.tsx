"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AcceptInvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing invite token.");
      return;
    }

    (async () => {
      setStatus("loading");
      try {
        const res = await fetch('/api/contacts/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || 'Failed to accept invitation');
        }
        setStatus("success");
        setMessage("Invitation accepted! You can now view your contacts.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || 'Unable to accept invite.');
      }
    })();
  }, [token]);

  return (
    <main style={{ padding: 32 }}>
      <h1>Accept Invitation</h1>
      {status === 'loading' && <p>Processing invitation...</p>}
      {status === 'success' && <p style={{ color: 'green' }}>{message}</p>}
      {status === 'error' && <p style={{ color: 'red' }}>{message}</p>}
      {status !== 'loading' && (
        <button onClick={() => router.push('/')}>Go home</button>
      )}
    </main>
  );
}
