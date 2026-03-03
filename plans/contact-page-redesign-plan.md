# Contacts Page Redesign & Interactions Plan

This plan breaks down the redesign and new interactions for the contacts page into small, independent, incremental steps. Each step is documented and tracked in a state file for stable, progressive implementation.

## Steps


1. **Design Contact Tile UI**
   1.1. Create a ContactTile component skeleton.
   1.2. Add avatar placeholder to the tile.
   1.3. Add name display and pencil icon for editing.
   1.4. Add status display (with placeholder value).
   1.5. Ensure tile dimensions are fixed and consistent via CSS.
   1.6. Add props for contact data (id, name, status, avatar).
   1.7. Add storybook or test page for visual validation.

2. **Implement Inline Name Editing**
   - Make name editable with pencil icon, matching task UI/UX.
   - Save changes on blur or Enter.

3. **Display Contact Status**
   - Show status as "Not Linked", "Link Pending", or "Linked".
   - Status is visually distinct.

4. **Show Unique GUID for Each Contact**
   - Ensure each contact displays or uses a unique GUID.

5. **Link/Unlink Actions**
   - If status is "Linked", show a button to break the link (removes contact).
   - If status is "Not Linked", show a button to create link (generates invite token, copies to clipboard, sets status to "Link Pending").

6. **Handle Invite Token Generation**
   - Generate unique invite token (GUID) for linking.
   - Copy token to clipboard and update status.

   - Add UI to enter and accept an invite token.
   - Accepting connects users and updates both contact lists.

8. **Contact Groups UI**
7. **Accept Invite Token UI** (Completed March 2, 2026)
    - UI added to ContactTile for entering and accepting invite tokens.
    - Accepting a valid token updates the contact status and provides user feedback.
    - Demo page supports and tests the full accept flow.
    - UI/UX polished for accessibility and consistency.


8. **Contact Groups UI** (Completed March 2, 2026)
   - UI for creating, naming, and displaying contact groups is implemented.
   - Groups have fixed dimensions and editable names.

9. **Drag-and-Drop Contacts into Groups** (Completed March 2, 2026)
   - Contacts can be dragged and dropped between groups in the demo UI.

10. **Persist and Sync State** (Completed March 2, 2026)
   - All group assignments are persisted in demo state and update live.

11. **Testing and Validation** (Completed March 2, 2026)
   - All group and drag-and-drop flows are tested in the demo.

----

## State Tracking

A state file (`plans/contact-page-redesign-state.json`) will track the completion of each step. Each step is marked as `not-started`, `in-progress`, or `completed`.

---

## LLM Execution Guidance
- Complete each step in order, updating the state file after each.
- Validate UI and API at each step.
- Use atomic commits for each step.
- If a step fails, halt and report for correction before proceeding.

---

This plan ensures a robust, testable, and maintainable contacts page redesign, ready for incremental LLM-driven implementation.
