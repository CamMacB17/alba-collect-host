# V7 Smoke Tests

**Purpose:** Manual verification checklist for V7 confirmation page actions  
**When:** After deploy, before marking V7 complete

---

## Pre-Test Setup

1. **Environment check:**
   - `RESEND_API_KEY` set (or unset to test skip path)
   - `APP_URL` set correctly
   - `ALBA_OPS_EMAIL` set (optional, for refund request CC)

2. **Test event:**
   - Create event with organiser email
   - Note admin token for refund link verification

---

## Test 1: Payment Success Flow (End-to-End)

**Steps:**
1. Visit `/e/[slug]` for test event
2. Fill join form (name + email)
3. Submit → Redirects to Stripe Checkout
4. Complete payment in Stripe
5. Redirected to `/e/[slug]?session_id=...`

**Expected:**
- Confirmation alert shows "You're in."
- Payment details displayed (email, amount, date)
- Actions section visible: "Contact organiser" + "Request a refund"

**Verify:**
- Payment status is PAID in admin dashboard
- Receipt email sent (check Resend logs if `RESEND_API_KEY` set)

---

## Test 2: Confirmation Actions Visibility

**Test 2a: Valid session_id**
- Visit `/e/[slug]?session_id=<valid_session_id>`
- **Expected:** Actions visible ("Contact organiser", "Request a refund")

**Test 2b: Invalid session_id**
- Visit `/e/[slug]?session_id=invalid123`
- **Expected:** Normal join form shown (no confirmation, no actions)

**Test 2c: No session_id**
- Visit `/e/[slug]`
- **Expected:** Normal join form shown (no confirmation, no actions)

---

## Test 3: Contact Organiser Mailto

**Steps:**
1. On confirmation page with valid `session_id`
2. Click "Contact organiser"

**Expected:**
- Email client opens
- To: organiser email
- Subject: "Question about {event.title}"
- Body includes:
  - Event name
  - Attendee email
  - Payment reference (Payment.id)

**Verify:**
- Mailto link format correct
- All fields populated

---

## Test 4: Request Refund Email

**Steps:**
1. On confirmation page with valid `session_id`
2. Click "Request a refund"
3. Wait for confirmation message

**Expected:**
- Button shows "Sending..." then "Request a refund"
- Success message: "Refund request sent. The organiser will process it."
- Email sent to organiser (check Resend logs)
- Email CCs `ALBA_OPS_EMAIL` if set

**Email content check:**
- Subject: "Refund requested – {event.title}"
- Body includes:
  - Event name
  - Attendee name + email
  - Payment ID
  - Amount
  - Admin refund link: `/admin/{adminToken}`

**Verify:**
- Admin link is correct (matches admin token from event creation)
- Email uses `APP_URL` for admin link
- If `RESEND_API_KEY` missing: Success message still shows, email skipped, logs show warning

---

## Test 5: Email Configuration

**Test 5a: RESEND_API_KEY set**
- Complete payment flow
- **Expected:** Receipt email sent, refund request email sent
- **Verify:** Check Resend dashboard for sent emails

**Test 5b: RESEND_API_KEY missing**
- Unset `RESEND_API_KEY`
- Complete payment flow
- Click "Request a refund"
- **Expected:**
  - Payment flow succeeds (no errors)
  - Refund request shows success message
  - No emails sent
  - Logs show: "RESEND_API_KEY not set, skipping email"

**Verify:**
- Railway logs show email skip warnings
- No errors thrown, flows complete successfully

---

## Test 6: Email Headers

**Verify in sent emails (Resend dashboard):**
- **From:** `EMAIL_FROM` env var (or default `onboarding@resend.dev`)
- **Reply-To:** Organiser email (for payment confirmation)
- **Reply-To:** Not set for refund request (uses organiser email as recipient)

---

## Test 7: PLEDGED Status Actions

**Steps:**
1. Create payment but don't complete Stripe checkout
2. Visit `/e/[slug]?session_id=<session_id>` (session exists but payment PLEDGED)
3. **Expected:** Confirmation shows "Confirming payment..." + "Contact organiser" link only
4. **Verify:** "Request a refund" not shown (only for PAID status)

---

## Log Verification

**Check Railway logs for:**
- `"Payment confirmation email sent"` - Receipt email sent
- `"Refund request email sent"` - Refund request email sent
- `"RESEND_API_KEY not set, skipping email"` - Email skipped (if key missing)
- `"Failed to send refund request email"` - Email send error (if any)

**Correlation IDs:** All email logs include `correlationId` - use to trace single request

---

## Rollback Criteria

**Stop and investigate if:**
- Payment flow breaks (can't create checkout)
- Confirmation page errors (500 or blank)
- Actions don't appear with valid `session_id`
- Refund request throws error (not graceful skip)
- Emails sent with wrong `APP_URL` or missing admin link

**Rollback:** Revert commits, redeploy previous version

---

## Notes

- **No automated tests:** All tests are manual
- **Test in production:** Use test event, small amount (£1)
- **Email testing:** Use Resend test mode or real emails
- **Admin token:** Verify admin link works (click through to admin dashboard)
