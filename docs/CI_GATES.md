# CI enforcement for Quran Cross-References

The `CI` workflow in `.github/workflows/ci.yml` is intended to run for
every pull request targeting `main`, every push to `main` and manual dispatch.
Do not merge feature or maintenance PRs until it has succeeded.

## Activate GitHub Actions on this fork

This repository is a GitHub **fork**, and the GitHub API currently reports
**zero workflow runs**. Committing a workflow file alone does not ensure that
GitHub is executing it. Fork workflows may be disabled by default.

1. Open **https://github.com/markrai/quran-cross-references/actions**.
2. If GitHub offers **I understand my workflows, go ahead and enable them**,
   select it. Otherwise check **Settings → Actions → General** and confirm
   that actions are permitted for this repository.
3. Open this repository's `CI` workflow and use **Run workflow** on `main`.
   Verify a real run appears and completes. If GitHub asks for approval,
   approve the run under the repository's security policies.
4. Before requiring status checks, open a new PR so that GitHub records
   the check names. GitHub only allows selecting checks that have run recently.

## Protect main

In **Settings → Rules → Rulesets** (or **Settings → Branches** when using
branch protection rules), create or update a rule for `main`:

- Require a pull request before merging.
- Require successful status checks before merging, specifically:
  - **Type check, lint, format, test**
  - **Quran source integrity (Windows)**
  - **Build Quran-only site**
  - **Quran reader (ubuntu-latest)**
  - **Quran reader (windows-latest)**
- Do not enable bypasses for these checks. If appropriate, apply the
  rules to administrators and disallow force pushes.

GitHub's ruleset configuration is an administrative repository setting, not
something a pull request can enforce by changing workflow YAML. The first
run and rule activation must be verified in the GitHub UI.

## What CI executes

1. **Checks (Ubuntu):** Node 24, type checking, type coverage, strict lint,
   Prettier, unit coverage, SHA-256 source validation and the graph benchmark.
2. **Pinned sources (Windows):** importer validation and source-integrity tests.
3. **Build (Ubuntu):** create the actual release artifact, verify Arabic and
   English Quran datasets and app assets, and reject legacy Bible files.
4. **Browser acceptance (Ubuntu + Windows):** download that **exact same
   production `dist/` artifact**, install the matching Playwright Chromium
   and exercise both desktop and Pixel 7 browser profiles. These include
   service-worker offline reload, full Quran data availability, graph
   pointer dragging and URL/history assertions.
5. **Pages deployment:** permitted only after every required job above succeeds
   on a push to `main`.

The runner fails if a test passes only after retry. Production preview starts
on the required 4173 port and cannot silently reuse a stale server.
The browser jobs retain HTML reports, JUnit results, screenshots and traces
in separate `playwright-Linux` and `playwright-Windows` artifacts.

## Reproduce a failure locally

```powershell
npm ci
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

Use `npx playwright show-report` for browser results or open the corresponding
workflow artifact's `trace.zip` with `npx playwright show-trace`.

When offline tests fail, the test attaches extra diagnostics including failed
requests, the page's content and the responses returned by the offline cache.
It is **not** acceptable to skip failing offline or graph tests to make the
deployment gate green.

Even after workflow checks pass, the real-device and source-rights acceptance
in `docs/RELEASE_CHECKLIST.md` must be completed before removing `noindex`.
