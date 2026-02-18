---
name: playwright
description: Build, run, and debug Playwright end-to-end tests for web apps. Use when creating new E2E coverage, fixing flaky browser tests, validating user flows, interacting with dynamic UI elements, or capturing traces/screenshots for failures.
---

# Playwright Skill

Use this workflow for reliable browser automation and E2E testing.

## Create tests

1. Prefer stable selectors in this order:
   `getByRole` -> `getByLabel` -> `getByTestId` -> CSS selectors.
2. Keep tests user-focused and scenario-based:

- Setup
- Action
- Assertion

3. Use explicit assertions after each meaningful UI action.
4. Avoid fixed sleeps. Use Playwright waits and web-first assertions.

## Selector and action rules

1. Prefer:
   `await page.getByRole('button', { name: 'Save' }).click();`
2. For forms:

- Fill by role/label
- Assert validation text and success states

3. For navigation:

- Assert URL and page heading after route changes

4. For collections:

- Filter to visible items and assert counts/labels

## Flake prevention

1. Use `await expect(locator).toBeVisible()` before interaction if UI timing is uncertain.
2. Keep each test independent; avoid order coupling.
3. Reset state in `beforeEach` when needed.
4. Mock network only when deterministic backend behavior is required.

## Debugging failures

1. Re-run a failing test alone first.
2. Enable trace/video for retries and inspect failure timing.
3. Add targeted assertions to detect where state diverges.
4. If selector instability is the cause, replace with semantic locators.

## Suggested baseline config

Use these defaults unless project constraints require otherwise:

- Retries in CI: `2`
- Reporter: `html`
- Trace: `on-first-retry`
- Screenshot: `only-on-failure`
- Video: `retain-on-failure`

## Quick acceptance checklist

1. Test is readable and user-flow oriented.
2. No fixed-time sleeps.
3. Assertions verify visible outcomes, not implementation details.
4. Test passes in isolation and in full suite.
