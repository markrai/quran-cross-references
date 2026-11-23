# Phase 3B.1: Reader-first Quran UX

## Scope

This phase refines the existing **Threads & Reader** view and does not create a seventh navigation tab. It keeps the Tanzil Uthmani Arabic and Pickthall English text untouched, and leaves the curated, computed, and external annotation evidence classes unchanged.

## Reader mode

The Enter reading mode toggle presents the full surah at a comfortable width and suppresses the verse-search panel, selected-passage duplication, relationship sidebar, and evidence/linguistics panels. The research navigation and relationship filters are hidden while reading. Canonical surah and ayah-reference controls remain available, and the Exit reading mode button is always visible. Exiting returns to the existing research UI without discarding the selected ayah, evidence type, verse query, theme, or inspector URL parameters.

In regular Threads & Reader, the reading settings also apply to the original reader and selected passage. Research tabs and Arcs typography are unaffected.

## Display preferences

Versioned, locally stored device preferences set Arabic only, English only, or bilingual display; independent Arabic and English font sizes (90–160%); and compact, comfortable, or spacious leading. The defaults are bilingual and comfortable with research visible. Text-size changes use relative CSS units so browser zoom and user font scaling continue to work. Unrecognized settings and malformed storage data fall back to bounded defaults; inaccessible local storage does not break reading.

Preferences are device-specific and are **not encoded in shared URLs**, synchronized to an account, or uploaded. This ensures a shared ayah reference restores content and evidence independently of personal typography settings.

## Navigation and acceptance

The selected verse in the full-surah reader is brought into view on initial loading, deep-link navigation, surah/reference changes, and search-result selection without taking keyboard focus away from the active control. The full source verse retains its original Arabic/English Unicode text and correct language and direction attributes.

Acceptance includes unit tests for preferences, invalid local-storage content, and storage restrictions; desktop/phone browser tests for mode changes, independent typography, reload persistence, URL/history stability, search restoration, accessibility/RTL and selected-ayah scrolling. Full source-integrity, deterministic regeneration, offline-install, and release gates remain unchanged.
