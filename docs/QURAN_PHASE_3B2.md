# Phase 3B.2: Reading navigation and accessibility

## Reader navigation

The original full-surah Threads & Reader view keeps canonical Quran URLs, textual evidence, and the Phase 3B.1 display preferences. Each surah is an ordered list with only its selected ayah button in the regular Tab sequence. The remaining ayah buttons remain pointer-activatable and have their own text and language attributes.

While a verse button is focused:

- **ArrowDown** selects the next canonical ayah. At a surah boundary, it proceeds to the following surah; at the final ayah of the Quran it stops.
- **ArrowUp** selects the preceding canonical ayah, including across the previous surah boundary, without wrapping past 1:1.
- **Home** and **End** select the first and final ayah of the current surah. Unmodified shortcuts work only on focused verse buttons, never in a form, search field, or elsewhere in the application.
- The newly selected verse receives keyboard focus only following the explicit verse keyboard action. Changing the reference by deep link, search, surah selector, or browser history scrolls it into view without forcibly taking keyboard focus.

Within distraction-free reading, **Previous surah**, **Next surah**, and **Focus selected ayah** buttons support touch and keyboard navigation. First/last surah controls disable appropriately. Passage and surah stepping continue to use the existing canonical URL serializer and browser history.

## Accessibility and mobile constraints

- Ordered verse list, one tab stop for the selected verse, `aria-current` on that verse, concise visible keyboard instructions, and screen-reader live status for the selected canonical reference.
- Existing scripture spans preserve explicit `lang="ar" dir="rtl"` and `lang="en" dir="ltr"` independently of UI language preferences.
- When switching between Arcs, Threads & Reader, and other primary views, focus moves to the main landmark; toggling reading mode does not discard focus on the toggle button.
- Verse step buttons and new surah controls have at least 44×44 CSS-pixel touch targets. Surah controls wrap on narrow phones. Browser-native zoom and reduced-motion preferences remain respected.
- No document-wide keyboard handler, global focus trap, new server endpoint, optional dataset request, font download, or new data product.

## Acceptance

Automated tests cover keyboard focus and one-tab-stop behavior, modifier-key and form isolation, surah boundary navigation, Home/End behavior, URL/history preservation, live selected-reference semantics, mobile controls and button dimensions, and focused reading. CI must pass TypeScript, formatting, lint, type coverage, unit coverage, source integrity, and Playwright on desktop/phone under Linux and Windows.

Actual VoiceOver, TalkBack, NVDA, 200% OS text scaling, installation and offline operation still require manual device acceptance before lifting the existing `noindex` gate. These tests do not replace those reviews.
