# Quran Phase 1D.3 release acceptance

The Quran reader remains `noindex` until these gates are completed on the actual
deployment. The presence of an app manifest and service worker is not a substitute
for testing installation, offline reading, accessibility and source rights.

## Automated gates

```powershell
npm ci
npm run format:check
npm run check
npm run build
npm run test:e2e
```

The release build must publish `index.html`, `quran/index.html`,
`manifest.webmanifest`, `sw.js`, 192/512/maskable PNG icons,
`social-preview.png`, and all three validated Quran JSON datasets.

Playwright verifies desktop and phone browsing, actual offline navigation,
install metadata, manifest icons, accessible keyboard entry points, and sharing.
GitHub Actions must be enabled and green before merging or deploying.

## Real-device acceptance

- [ ] On Android Chrome, install the Quran app; launch from the home screen
  without browser chrome, including from the `/quran/` compatibility page.
- [ ] On iOS Safari, use Add to Home Screen and verify that the app icon,
  launch URL, and bilingual reader display correctly.
- [ ] Open the site while online, allow its first full offline download to finish,
  then disable connectivity. Refresh both `/?ref=2%3A255` and
  `/quran/?ref=114%3A6&view=threads`; verify both scripts, Quran texts
  and relationship dataset are available without network access.
- [ ] Deploy an updated version and verify the previous offline cache is not
  discarded until the replacement has been downloaded successfully.
- [ ] Check Arabic shaping, diacritics, RTL direction, English LTR direction,
  small phones (320–375px), 200% text scaling, portrait/landscape and pinch zoom.
- [ ] Use only a keyboard: focus the Skip to Quran content link, move among
  tabs, select a surah, search, and activate verse/arc controls with visible focus.
- [ ] Use VoiceOver and NVDA/TalkBack to check labels, reading order,
  language changes, heading levels, aria-live states and contrast.
- [ ] Confirm the exact ayah URL survives browser history, native sharing
  and copy-to-clipboard fallback.
- [ ] Verify a link preview in at least one major messaging application.
  Static hosting provides a site-wide OG image, not dynamic per-ayah card images.

## Source-rights and provenance gate

- [ ] Compare `data/quran/sources.json` against the pinned reviewed snapshots.
  Confirm the generated `text.json` contains the full Tanzil copyright notice
  without modifying its Arabic ayah data.
- [ ] Confirm the app and the generated dataset preserve a clear link to
  Tanzil and comply with the terms at https://tanzil.net/docs/Text_License.
- [ ] Confirm rights for the **specific Tanzil digital transcription** of
  Pickthall, not merely the 1930 original translation in US public domain.
- [ ] Verify the CC0 license and proper upstream attribution for the
  Waqar144 Mutashabihat corpus. It represents curated textual similarity,
  not certified tafsir and not a complete Quran cross-reference index.
- [ ] Ensure original inherited code attribution and MIT notice remain intact.

## Domain and indexing

The production base defaults to `/quran-cross-references/` and the site
origin defaults to `https://markrai.github.io`. For a custom deployment,
configure both `BASE_PATH` and `SITE_ORIGIN` when building. Check the
canonical URL and absolute social image URL after deployment.

Only after the automated and manual gates pass should a separate release PR
remove `noindex`, publish a Quran-specific sitemap, and enable indexing.
This milestone does **not** silently authorize public indexing.
