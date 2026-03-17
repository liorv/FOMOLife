# System Requirement: Contacts & Connection Management Module

## 1. Feature Overview
The system shall implement a "Contacts" tab within the Tasks module to facilitate user-to-user connections. The core mechanism is a secure, two-phase handshake initiated via unique, time-sensitive invitation links.

## 2. Functional Specifications

### 2.1 Invitation Link Generation & Sharing
* **Tokenization:** Users can generate a unique URL containing a secure, non-sequential token.
* **TTL (Time-to-Live):** Links must automatically expire exactly **168 hours (7 days)** after creation.
* **Elegant Sharing UI:** Upon generation, the system shall present a "Share Invitation" modal featuring:
    * **Visual Link Display:** A read-only text field showing the full URL.
    * **Click-to-Copy:** A primary "Copy Link" button that copies the URL to the clipboard and triggers a brief "Copied!" success toast.
    * **Native Share Integration:** A "Share" button utilizing the **Web Share API**. On mobile/supported browsers, this triggers the OS-level share sheet (allowing direct sharing to SMS, WhatsApp, Slack, etc.).
* **Access Control:** * Recipients clicking the link must be redirected to the application.
    * Authentication is mandatory; if unauthenticated, the user must log in/sign up before viewing the invitation details.

### 2.2 The Two-Phase Handshake
* **Phase 1 (Initiation):** * Upon link access, the Invitee is presented with the Inviter's profile: **Full Name**, **Email**, and **OAuth Provider** (e.g., Google, X).
    * The Invitee must explicitly click "Request Linkage" to move to the next phase.
* **Phase 2 (Approval):** * The Inviter receives a real-time notification of the request.
    * The connection is **not** established until the Inviter manually clicks "Approve" from the notifications menu.

### 2.3 Management & UI
* **Contacts Tab:** Displays an alphabetized list of established contacts. Each entry must show:
    * Full Name
    * Email Address
    * Profile Avatar (sourced from the contact's OAuth provider)
* **Bilateral Deletion:** Users can delete any contact. This action must be mutual, removing the record for both parties simultaneously.
* **Notification System:** * A bell icon located at the top-right of the UI (adjacent to the user avatar).
    * A dedicated "Connection Approvals" dropdown menu to manage pending Phase 2 requests.

## 3. Technical Implementation

### 3.1 API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/contacts/invite` | Generates unique token and 7-day expiration link. |
| `GET` | `/api/contacts/invite/{token}` | Validates token; returns inviter's Name, Email, Provider. |
| `POST` | `/api/contacts/request-link` | **Phase 1:** Invitee submits connection request. |
| `GET` | `/api/contacts/pending` | Fetches pending requests for the notification menu. |
| `PATCH` | `/api/contacts/approve/{requestId}` | **Phase 2:** Inviter finalizes the bilateral link. |
| `GET` | `/api/contacts/list` | Retrieves established contacts with OAuth metadata. |
| `DELETE` | `/api/contacts/{contactId}` | Permanently severs the link for both parties. |

### 3.2 Database Schema
* **`Invitation_Links` Table:** `id` (UUID), `creator_id` (FK), `token` (Unique), `expires_at` (Timestamp), `is_used` (Bool).
* **`Connections` Table:** `id` (UUID), `inviter_id` (FK), `invited_id` (FK), `status` (Enum: `PENDING`, `CONNECTED`), `created_at`, `updated_at`.

## 4. Acceptance Criteria (AC)
1.  **AC-01 (Link Expiration):** Links accessed at T+168h 1m must return a `410 Gone` and block the initiation flow.
2.  **AC-02 (Data Privacy):** The invitee must only see the inviter's public OAuth profile metadata prior to approval.
3.  **AC-03 (State Integrity):** A connection record must remain in `PENDING` status until Phase 2 is explicitly approved.
4.  **AC-04 (UI Sync):** Upon approval, the contact list for both users must refresh to include the new contact with full OAuth metadata.
5.  **AC-05 (Atomic Deletion):** Deleting a contact must result in a `404` or "Not Found" result if the other party attempts to interact with that specific link immediately after.
6.  **AC-06 (Notification UI):** The bell icon must display a visual badge count representing the number of `PENDING` requests awaiting approval.
7.  **AC-07 (Copy/Share Feedback):** The "Copy" action must provide immediate haptic or visual feedback (Toast/Tooltip) to confirm the link is ready to paste.