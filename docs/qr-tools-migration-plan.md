# QR Tools Migration & Regression Plan

## Migration Strategy

1. **Run Prisma Migration**
   - Execute `npm run prisma:migrate` after pulling latest code. This applies the new `QRToolConfig` table and backfill script.

2. **Verify Backfill Results**
   - Inspect `QRToolConfig` entries via `prisma studio` or direct SQL. Confirm each `qr` tool now has a config row.
   - Ensure `Tool.settings` no longer contains legacy `qr*` keys.

3. **Manual Data Validation**
   - For a sample admin, confirm fields migrated correctly:
     - `formatPattern`, `appearance`, `fieldMappings`, `fallbackUrl`, `securityPolicy`.
   - Trigger QR generation for old and new tools to ensure behavior matches expectations.

4. **Rollback Procedure**
   - If issues arise, `prisma migrate resolve --rolled-back <migration_id>` and redeploy previous commit. Reintroduce legacy settings from backups if needed.

## Regression Test Plan

1. **Unit Tests (Vitest)**
   - `QRToolConfigService`
     - `ensureToolForAdmin` creates tool & config when missing.
     - `getAppearance` returns defaults and parses overrides.
     - `updateConfig` persists format, appearance, fallback URL, security policy.
   - `QRFormatResolver`
     - Pattern substitution for user data, tags, custom fields, metadata.
     - Random/timestamp/date tokens produce expected shapes (mock randomness).

2. **Integration Tests (API)**
   - `POST /api/v1/qr/tool-settings`
     - Saves format, appearance, fallback URL, security policy.
   - `POST /api/v1/qr/format-preview`
     - Accepts `toolId`, `metadata`, returns resolved pattern.
   - `POST /api/v1/qr/field-mapping`
     - Persists ManyChat field mappings and retrieval matches payload.

3. **E2E Smoke Tests (Playwright)**
   - Visit `/engagement/qr-tools`
     - Ensure tabs render and initial data loads.
     - Update format & appearance, refresh page, confirm persistence.
     - If ManyChat connected, modify mapping and confirm update success toast.

4. **Analytics & Webhook Checks**
   - Generate a QR code via `/api/v1/qr` and confirm analytics entries still created.
   - Scan endpoint emits webhooks and ManyChat sync runs with migrated config.

## Deployment Checklist

- [ ] Apply migration in staging and validate backfill.
- [ ] Run `npm run test` and targeted API tests.
- [ ] Smoke test the QR Tools UI.
- [ ] Communicate rollout plan to customer success (highlight new QR Tools page).
