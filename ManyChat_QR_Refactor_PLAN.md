# ManyChat QR Refactor Plan

## 1. Context & Goals
- Refactor the QR tool's ManyChat integration to streamline configuration and align with the latest user feedback.
- Introduce clearer guidance for issuing QR codes and validating scans via ManyChat External Requests.
- Support richer field and tag automations, including core validation status tracking and per-outcome values.

## 2. High-Level Objectives
1. **Integration Guide Refresh**
   - Consolidate QR generation + validation webhook instructions in a single section.
   - Provide ready-to-copy payloads/endpoints and highlight response handling.
2. **Field Mapping UI Overhaul**
   - Replace the existing enable-toggle with a "ManyChat field + sync timing" pairing per QR field.
   - Surface a permanent core validation status row.
   - Allow inline creation of ManyChat fields (defaulting to `playgram_<tool>_<field>` names) directly from the dropdown.
3. **Outcome-Based Field Values**
   - Let users send different values to the same ManyChat field depending on `sent`, `validated_success`, or `validated_failed` (with failure reasons).
   - Ensure "core validation status" can be mapped without extra setup.
4. **Inline Tag Selection & Creation**
   - Offer a combobox per outcome to pick existing tags or create new ones inline.
   - Support add/remove actions tied to success/failure outcomes.
5. **Backend & Persistence Updates**
   - Extend field-mapping payloads with sync timing, per-outcome values, and inline-created fields/tags.
   - Update validation + sync services to honor the new structures.
6. **Testing & Documentation**
   - Smoke test ManyChat flows (QR issue, validation success/fail).
   - Update README / admin docs with the new workflows.

## 3. Detailed Task Breakdown
### 3.1 Integration Guide ✅ COMPLETED
- [x] Capture base URL in the UI to render accurate example endpoints.
- [x] Build a combined "Generate & Validate" instruction card with two subsections:
  - **Generate QR**: endpoint, body, response (image URL/data URI), tips for sending image to subscriber.
  - **Validate QR**: webhook endpoint, expected payload, outcome/failure reason mapping guidance.
- [x] Move mapping/advanced config guidance into a dedicated secondary card.

### 3.2 Field Mapping UI
- [ ] Define helper constants/types (core validation row, sync timing options, naming helpers).
- [ ] Rebuild the table to use dropdowns for ManyChat field + sync timing (no toggle).
- [ ] Make "+ Create new field" the default option; auto-create using recommended naming/type heuristics.
- [ ] Surface current field selection, show spinner/status during inline creation, and allow manual refresh.

### 3.3 Outcome-Based Field Values
- [ ] Expand the advanced card to render editable rows per mapping (field, outcome, optional failure reason, value input, enable toggle).
- [ ] Provide template button to prefill common validation-status mappings (SUCCESS/FAILURE/REASONS).
- [ ] Validate inputs client-side and serialize to the API payload.

### 3.4 Tag Automations
- [ ] Implement a combobox that lists ManyChat tags and supports inline creation.
- [ ] Allow specifying add/remove actions per outcome; persist selections.
- [ ] Display a quick summary badge (counts of enabled tag configs).

### 3.5 Backend / API Adjustments
- [ ] Update `/api/v1/qr/field-mapping` handlers to accept new structures (`syncTiming`, `outcomeFieldMappings`, `outcomeTagConfigs`).
- [ ] Ensure `QRToolConfigService` validation accepts extended schema.
- [ ] Modify `QRManychatSync` and `QRValidationService` to respect timing selection and per-outcome values.
- [ ] Capture auto-created field/tag metadata (IDs, names) for display consistency.

### 3.6 Testing & Verification
- [ ] Manual UI regression pass (format tab, integrations tab, security tab).
- [ ] Run `npm run build` to ensure type safety.
- [ ] Validate ManyChat flow end-to-end using a staging bot (issue QR → send image → scan success/fail → observe field/tag updates).

## 4. Risks & Mitigations
- **ManyChat API rate limits**: cache fields/tags locally and debounce inline creation calls.
- **Complex UI state**: centralize mapping state management helpers (normalize + ensure row functions).
- **Backward compatibility**: migrate existing field-mapping configs to include default sync timing/backfill core field row.

## 5. Timeline / Sequencing
1. Integration guide updates (fast win, informs UX).
2. Field mapping UI restructure (foundational for later steps).
3. Outcome-based values + tag combobox.
4. Backend persistence + services.
5. QA + documentation polish.

## 6. Open Questions
- Should QR generation be authenticated via ManyChat token or API key exchange? (Currently assumes admin session.)
- Any predefined values for core validation status (e.g., `SUCCESS`, `EXPIRED`, `WRONG_PERSON`), or should they remain fully configurable?
- Do we need rollout flags to hide new UI until backend is ready?
