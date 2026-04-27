'use client';

import { useEffect, useState } from 'react';

type MockCookieLoginProps = {
  showMissingUserError: boolean;
};

export default function MockCookieLogin({ showMissingUserError }: MockCookieLoginProps) {
  const [userId, setUserId] = useState('');
  const [existingUsers, setExistingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/auth/users');
        const data = await response.json();
        setExistingUsers(data.users || []);
      } catch (error) {
        console.error('Failed to fetch existing users:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const filteredUsers = userId.trim()
    ? existingUsers.filter(user =>
        user.toLowerCase().includes(userId.toLowerCase())
      )
    : existingUsers;

  const handleInputChange = (value: string) => {
    setUserId(value);
    // Keep dropdown open while typing if it was already open
    if (showDropdown && value.length === 0) {
      // If user cleared the input, keep showing all users
      setShowDropdown(true);
    }
  };

  const handleUserSelect = (selectedUser: string) => {
    setUserId(selectedUser);
    setShowDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (!userId.trim()) {
      e.preventDefault();
      return;
    }
  };

  return (
    <form method="post" action="/api/auth/login" className="auth-form" onSubmit={handleSubmit}>
      <label htmlFor="userId" className="auth-label">
        User ID
      </label>
      <div className="auth-input-container">
        <input
          id="userId"
          name="userId"
          type="text"
          className="auth-input"
          placeholder="e.g. alice"
          autoComplete="username"
          value={userId}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => {
            // Delay hiding dropdown to allow clicks on options
            setTimeout(() => setShowDropdown(false), 150);
          }}
          required
        />
        {showDropdown && (
          <div className="auth-dropdown">
            {filteredUsers.slice(0, userId.trim() ? 10 : 5).map((user) => (
              <div
                key={user}
                className="auth-dropdown-item"
                onClick={() => handleUserSelect(user)}
              >
                {user}
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="auth-dropdown-item" style={{ color: '#999' }}>
                No users found
              </div>
            )}
          </div>
        )}
      </div>
      <input type="hidden" name="returnTo" value="/" />
      {showMissingUserError ? <p className="auth-error">Please enter a user ID.</p> : null}
      <button type="submit" className="auth-submit" disabled={!userId.trim()}>
        Sign in
      </button>
    </form>
  );
}