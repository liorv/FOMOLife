"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ padding: "50px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>Database Maintenance</h1>
      <p style={{ fontSize: "1.2rem", marginTop: "20px" }}>
        We are currently experiencing connection issues with our database (Supabase is likely paused or undergoing maintenance).
      </p>
      <p>Please check back shortly.</p>
      <button
        onClick={() => reset()}
        style={{ marginTop: "30px", padding: "10px 20px", cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}
