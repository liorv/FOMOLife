# Contacts & Groups API Implementation Plan

This plan breaks down the implementation of the following APIs into clear, incremental steps suitable for LLM automation:

- createContact
- inviteContact
- createGroup
- inviteToGroup
- acceptContactInvite
- acceptGroupInvite
- getContacts
- getGroups
- deleteContact
- leaveGroup

## 1. Document API Contracts
- For each endpoint, specify:
  - HTTP method and route (e.g. POST /api/contacts/invite)
  - Request body and required fields
  - Response shape (success, error)
  - Status codes
- Store this as a markdown table or section in this file for reference.

## 2. Update Types
- Add or update TypeScript types/interfaces for all request and response payloads in `@myorg/types` and `@myorg/api-client`.
- Ensure all new status values and group/invite structures are represented.

## 3. Implement API Route Handlers
- For each endpoint, create or update the corresponding Next.js API route:
  - `apps/contacts/app/api/contacts/` for contact endpoints
  - `apps/contacts/app/api/contacts/groups/` for group endpoints
- Implement logic in `lib/server/contactsStore.ts` for any new operations (e.g. invite, accept, leave).
- Ensure all endpoints check authentication and return proper CORS headers.

## 4. Update Client API
- Update or add functions in `@myorg/api-client` to call each new endpoint.
- Ensure all functions are typed and return the expected data.

## 5. Add/Update Tests
- Add or update Jest tests for each endpoint in `apps/contacts/__tests__/api.test.ts`.
- Cover all success and error cases, including edge cases (e.g. invalid token, already linked, etc).

## 6. Validate and Refine
- Run all tests and ensure 100% pass rate.
- Refactor for clarity and maintainability as needed.
- Update documentation and usage examples.

---

## API Contract Table (Example)

| Endpoint                | Method | Request Body                | Response                | Status Codes |
|-------------------------|--------|-----------------------------|-------------------------|--------------|
| /api/contacts           | POST   | { name, ... }               | Contact                 | 201, 400     |
| /api/contacts/invite    | POST   | { contactId }               | InviteToken             | 200, 400     |
| /api/contacts/accept    | POST   | { token }                   | Contact                 | 200, 400,404 |
| /api/contacts           | GET    |                             | { contacts: Contact[] } | 200, 401     |
| /api/contacts/:id       | DELETE |                             | { ok: true }            | 200, 404     |
| /api/contacts/groups    | POST   | { name }                    | ContactGroup            | 201, 400     |
| /api/contacts/groups    | GET    |                             | { groups: Group[] }     | 200, 401     |
| /api/contacts/groups/invite | POST | { groupId, contactId }     | InviteToken             | 200, 400     |
| /api/contacts/groups/accept | POST | { token }                  | Group                   | 200, 400,404 |
| /api/contacts/groups/:id/leave | POST |                         | { ok: true }            | 200, 404     |
| /api/contacts/groups/invite | POST | { groupId, contactId }     | InviteToken             | 200, 400     |
| /api/contacts/groups/accept | POST | { token }                  | Group                   | 200, 400,404 |
| /api/contacts/groups/:id/leave | POST |                         | { ok: true }            | 200, 404     |

---

## LLM Execution Guidance
- Complete each step in order, marking progress in a state file (e.g. `plans/contact-page-redesign-state.json`).
- After each step, validate with tests and update documentation.
- If a step fails, halt and report the error for correction before proceeding.
- Use atomic commits for each step to ensure traceability and easy rollback.

---

This plan ensures a robust, testable, and maintainable API for contacts and groups, ready for LLM-driven implementation.