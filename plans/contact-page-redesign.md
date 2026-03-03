# Contacts Page Redesign Plan

This document describes a step-by-step plan for redesigning the contacts page and implementing related interactions. Each step is independent and small, allowing incremental progress and easy rollback. A separate state file (`contact-page-redesign-state.json`) will track progress.

## Overall Goals

- Each contact tile shows avatar, name (editable), status.
- Unique GUID for each contact.
- Status values: `Not Linked`, `Link Pending`, `Linked`.
- Uniform dimensions for contact tiles.
- `Linked` contacts can be unlinked (remove contact).
- `Not Linked` contacts provide a button to generate invite token (GUID) and copy it to clipboard; status changes to `Link Pending`.
- A token acceptance flow (dialog/tab) where a user pastes a shared token to connect.
- Contacts can be grouped; groups are namable like Projects with inline editing and pencil icon.
- Drag-and-drop contacts into groups similar to tasks/projects.

## State Tracking

- `plans/contact-page-redesign-state.json` will store an integer `state` that increments after each completed step.
- When a step is finished, update the state file and add a brief note describing completion.

## Step-by-Step Plan

1. **Initial data model changes**
   - Add `guid` field to contact schema.
   - Add `status` field (`enum` with 3 values).
   - Migration script or defaults for existing contacts.

2. **Core API endpoints**
   - Create endpoints to fetch contacts, update name, change status, generate invite token, accept token, unlink contact.
   - Endpoint for groups: create group, rename group, list groups, assign/unassign contacts.

3. **Contact tile component**
   - Build `ContactTile` in UI package, matching dimension specs.
   - Avatar placeholder, name with inline editing and pencil icon (reuse Task pattern).
   - Status indicator display (badge/text).
   - Action buttons based on status (link/unlink).

4. **Invite token generation & clipboard**
   - Implement UI for generating random GUID token, call API, update status locally.
   - Copy token to clipboard and show toast.

5. **Token acceptance UI**
   - Create a new tab or modal with input for token and accept button.
   - Wire to API to connect contacts (both sides). Handle success/error.

6. **Unlink functionality**
   - Add unlink confirmation flow and API call.
   - Remove contact post-unlink.

7. **Groups UI**
   - Create `ContactGroup` analogous to `Project` component.
   - Inline editable name with pencil icon.
   - Groups list retrieval and create/delete/rename actions.

8. **Drag-and-drop contacts into groups**
   - Use existing drag-drop utilities for tasks; adapt for contacts.
   - Update group membership via API.

9. **Uniform tile dimensions & styling
   - Final CSS tweaks ensuring identical size and responsive layout.
   - Visual polish (hover states, icons).

10. **Testing & validation**
    - Add Jest/RTL tests for components and API mocks.
    - End-to-end scenario tests (link, accept token, unlink, group operations).

11. **Documentation & cleanup**
    - Document new API routes and UI interactions in README or docs.
    - Update architecture notes, add any migration instructions.

Each step will have associated commits and the state file updated accordingly.

---

**Usage:**

```json
{
  "state": 0,
  "notes": []
}
```

Increment `state` and append a note after completing each step.

---

This plan ensures a structured, traceable approach to delivering the redesign without large-scale refactors. Work can proceed one step at a time with clear checkpoints.