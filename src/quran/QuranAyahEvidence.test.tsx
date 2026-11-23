import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';
import type { QuranThemeIndex } from '../core/quran/theme-index.ts';
import type { QuranEmotionIndex } from '../core/quran/emotion-index.ts';
import type { QuranReaderData } from './model.ts';
import { QuranAyahEvidence } from './QuranAyahEvidence.tsx';

const data: QuranReaderData = {
  text: {
    arabic: Array.from({ length: 6236 }, () => 'بِسْمِ ٱللَّهِ'),
    english: Array.from({ length: 6236 }, () => 'In the name of Allah.'),
  },
  relationships: new QuranRelationshipIndex({
    format: 'quran-similar-passages',
    schemaVersion: 1,
    versification: 'hafs-kufan-6236',
    sourceRowCount: 2,
    duplicateCount: 0,
    repeatedRangeMemberCount: 0,
    links: [
      { source: { start: 0, end: 0 }, target: { start: 7, end: 7 }, contextAfter: 0 },
      { source: { start: 7, end: 7 }, target: { start: 0, end: 0 }, contextAfter: 0 },
    ],
  }),
};

const themes = {
  forAyah: () => [
    { name: 'Divine Mercy', domain: 'Theology', category: 'Attributes', description: 'Source-defined annotation', count: 25 },
  ],
} as unknown as QuranThemeIndex;
const emotions = {
  forAyah: (ayah: number) => ayah === 0 ? [] : ['fear', 'joy'],
} as unknown as QuranEmotionIndex;

function props() {
  return {
    data,
    ayahIndex: 0,
    section: null as 'all' | 'curated' | 'exact' | 'morphology' | 'themes' | 'emotions' | null,
    expressions: { status: 'idle' as const },
    morphology: { status: 'idle' as const },
    themes: { status: 'idle' as const },
    emotions: { status: 'idle' as const },
    onSection: vi.fn(),
    onRetry: vi.fn(),
    onCuratedLink: vi.fn(),
    onExactExpression: vi.fn(),
    onMorphologyWord: vi.fn(),
    onTheme: vi.fn(),
    onEmotion: vi.fn(),
  };
}

describe('Unified per-ayah evidence inspector', () => {
  it('starts collapsed and requests one source without claiming optional coverage', () => {
    const input = props();
    render(<QuranAyahEvidence {...input} />);
    const toggle = screen.getByRole('button', { name: /Evidence for this ayah/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText('Choose an ayah evidence source')).toBeNull();
    fireEvent.click(toggle);
    expect(input.onSection).toHaveBeenCalledWith('curated');
  });

  it('keeps original outgoing and incoming curated relationship IDs distinct', () => {
    const input = props();
    render(<QuranAyahEvidence {...input} section="curated" />);
    const inspector = screen.getByLabelText('Ayah evidence inspector');
    expect(inspector.textContent).toContain('1 of 1 checked sources');
    expect(inspector.textContent).toContain('2 distinct original source link IDs');
    expect(inspector.textContent).toContain('Not checked');
    const panel = screen.getByLabelText('Inspector curated passage evidence');
    fireEvent.click(within(panel).getByRole('button', { name: /Link #0/ }));
    expect(input.onCuratedLink).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByRole('button', { name: 'Check all five sources' }));
    expect(input.onSection).toHaveBeenCalledWith('all');
    fireEvent.click(screen.getByRole('button', { name: /Evidence for this ayah/ }));
    expect(input.onSection).toHaveBeenCalledWith(null);
  });

  it('separates externally assigned topics from expert emotion coverage', () => {
    const input = props();
    render(
      <QuranAyahEvidence
        {...input}
        section="all"
        themes={{ status: 'ready', index: themes }}
        emotions={{ status: 'ready', index: emotions }}
      />,
    );
    expect(screen.getByLabelText('Ayah evidence inspector').textContent).toContain('2 of 3 checked sources');
    expect(screen.getByLabelText('Inspector QSAC thematic evidence').textContent).toContain('Divine Mercy');
    const theme = within(screen.getByLabelText('Inspector QSAC thematic evidence'))
      .getByRole('button', { name: /Divine Mercy/ });
    fireEvent.click(theme);
    expect(input.onTheme).toHaveBeenCalledWith('Divine Mercy');
    const emotionPanel = screen.getByLabelText('Inspector ELQV emotion evidence');
    expect(emotionPanel.textContent).toContain('Not covered by the ELQV sample');
    expect(emotionPanel.textContent).toContain('not classified as neutral or emotionless');
  });

  it('does not hide conflicting labels or hide independent verification failures', () => {
    const input = props();
    const view = render(
      <QuranAyahEvidence
        {...input}
        ayahIndex={7}
        section="emotions"
        emotions={{ status: 'ready', index: emotions }}
      />,
    );
    const panel = screen.getByLabelText('Inspector ELQV emotion evidence');
    expect(panel.textContent).toContain('Multiple conflicting categories are preserved');
    fireEvent.click(within(panel).getByRole('button', { name: /Fear/ }));
    expect(input.onEmotion).toHaveBeenCalledWith('fear');
    view.rerender(
      <QuranAyahEvidence
        {...input}
        section="themes"
        themes={{ status: 'error', message: 'Checksum mismatch' }}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Checksum mismatch');
    fireEvent.click(screen.getByRole('button', { name: 'Retry this source' }));
    expect(input.onRetry).toHaveBeenCalledWith('themes');
  });
});
