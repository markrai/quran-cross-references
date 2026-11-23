import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';
import { QuranApp } from './QuranApp.tsx';
import { loadQuranReaderData, type QuranReaderData } from './model.ts';

vi.mock('./model.ts', () => ({ loadQuranReaderData: vi.fn() }));

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
      { source: { start: 7, end: 7 }, target: { start: 261, end: 261 }, contextAfter: 0 },
      { source: { start: 261, end: 261 }, target: { start: 7, end: 7 }, contextAfter: 2 },
    ],
  }),
};

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/?ref=2%3A1');
  vi.mocked(loadQuranReaderData).mockReset();
  vi.mocked(loadQuranReaderData).mockResolvedValue(data);
});

function findSelectedVerse(reader: Element): HTMLButtonElement {
  const selected = reader.querySelector<HTMLButtonElement>('ol button[aria-current="true"]');
  if (selected === null) throw new Error('Selected ayah button not found');
  return selected;
}

describe('Quran-first reader', () => {
  it('renders verified Arabic and English text with an isolated Quran header', async () => {
    render(<QuranApp />);
    expect(await screen.findByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeTruthy();
    expect(screen.getByLabelText('Selected ayah').querySelector('[lang="ar"]')).not.toBeNull();
    expect(screen.getByLabelText('Selected ayah').querySelector('[dir="ltr"]')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Bible Explorer' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Quran Cross-References' }).getAttribute('href')).toBe(
      '/?ref=2%3A1',
    );
    expect(screen.getByText(/2 visible links/)).toBeTruthy();
  });

  it('opens a related arc, then reads it in the threads view', async () => {
    render(<QuranApp />);
    const arc = await screen.findByRole('button', {
      name: 'Al-Baqarah 2:1 to Al-Baqarah 2:255',
    });
    fireEvent.click(arc);
    expect(screen.getByRole('heading', { name: 'Selected relationship' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Read in Threads' }));
    expect(await screen.findByRole('heading', { name: 'Threads from 2:1' })).toBeTruthy();
    expect(window.location.search).toContain('view=threads');
    expect(screen.getByRole('combobox', { name: 'Surah' })).toHaveProperty('value', '2');
  });

  it('supports reference search, selection and browser back navigation', async () => {
    render(<QuranApp />);
    await screen.findByRole('heading', { name: /Al-Baqarah.*2:1/ });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Ayah reference' }), {
      target: { value: '114:6' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('heading', { name: /An-Nas.*114:6/ })).toBeTruthy();
    expect(window.location.search).toContain('114%3A6');

    window.history.replaceState(null, '', '/?ref=2%3A1&view=threads');
    fireEvent(window, new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Threads from 2:1' })).toBeTruthy();
    });
    expect(screen.getAllByRole('button', { name: /2:255/ }).length).toBeGreaterThan(0);
  });

  it('reports invalid references and supports filtered threads', async () => {
    render(<QuranApp />);
    await screen.findByRole('heading', { name: /Al-Baqarah.*2:1/ });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Ayah reference' }), {
      target: { value: '2:999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('alert').textContent).toContain('valid reference');

    fireEvent.click(screen.getByRole('button', { name: 'Threads & Reader' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Relationship direction' }), {
      target: { value: 'incoming' },
    });
    expect(screen.getByText('1 curated connections · incoming')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Relationship scope' }), {
      target: { value: 'cross-surah' },
    });
    expect(screen.getByText(/No relationships in this dataset/)).toBeTruthy();
  });

  it('selects a passage range, stores the selected relationship in the URL, and restores history', async () => {
    render(<QuranApp />);
    await screen.findByRole('heading', { name: /Al-Baqarah.*2:1/ });
    fireEvent.change(screen.getByRole('combobox', { name: 'Graph focus end ayah' }), {
      target: { value: '3' },
    });
    expect(window.location.search).toContain('end=2%3A3');
    expect(screen.getByText(/Focused passage: Al-Baqarah 2:1–3/)).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Al-Baqarah 2:1 to Al-Baqarah 2:255',
      }),
    );
    expect(window.location.search).toContain('link=0');
    expect(screen.getByRole('heading', { name: 'Selected relationship' })).toBeTruthy();

    window.history.replaceState(null, '', '/?ref=2%3A1&end=2%3A4&link=1');
    fireEvent(window, new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Graph focus end ayah' })).toHaveProperty(
        'value',
        '4',
      );
    });
    expect(screen.getByRole('heading', { name: 'Selected relationship' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next ayah' }));
    expect(window.location.search).toContain('ref=2%3A2');
    expect(window.location.search).not.toContain('end=');
    expect(window.location.search).not.toContain('link=');
  });

  it('ignores malformed and out-of-range relationship selections', async () => {
    window.history.replaceState(null, '', '/?ref=2%3A1&link=999999999');
    render(<QuranApp />);
    await screen.findByRole('heading', { name: /Al-Baqarah.*2:1/ });
    expect(screen.queryByRole('heading', { name: 'Selected relationship' })).toBeNull();
    expect(screen.getByText(/visible links/)).toBeTruthy();
  });

  it('switches to text-only reading without altering URLs, then restores research tools', async () => {
    window.history.replaceState(null, '', '/?ref=2%3A255&view=threads');
    render(<QuranApp />);
    await screen.findByRole('heading', { name: /Al-Baqarah.*2:255/ });
    const original = window.location.search;
    expect(screen.getByRole('heading', { name: 'Threads from 2:255' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Enter reading mode' }));
    expect(screen.getByRole('region', { name: 'Distraction-free Quran reader' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Threads from 2:255' })).toBeNull();
    expect(screen.queryByRole('searchbox', { name: 'Verse text' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Arcs' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Surah' })).toBeTruthy();
    expect(window.location.search).toBe(original);
    fireEvent.click(screen.getByRole('button', { name: 'Next ayah' }));
    expect(window.location.search).toContain('ref=2%3A256');
    fireEvent.click(screen.getByRole('button', { name: 'Exit reading mode' }));
    expect(screen.getByRole('heading', { name: 'Threads from 2:256' })).toBeTruthy();
    expect(screen.getByRole('searchbox', { name: 'Verse text' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Arcs' })).toBeTruthy();
  });

  it('applies bilingual display settings and restores them across remounts', async () => {
    window.history.replaceState(null, '', '/?ref=2%3A1&view=threads');
    const rendered = render(<QuranApp />);
    await screen.findByRole('heading', { name: 'Threads from 2:1' });
    fireEvent.click(screen.getByText('Reading settings'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Reader language' }), {
      target: { value: 'english' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Arabic text size' }), {
      target: { value: '140' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Reader line spacing' }), {
      target: { value: 'spacious' },
    });
    const reader = screen.getByRole('region', { name: 'Quran text and relationship threads' });
    expect(reader.querySelector('[lang="ar"]')).toBeNull();
    expect(reader.querySelector('[lang="en"]')).not.toBeNull();
    expect(
      document.getElementById('quran-main')?.style.getPropertyValue('--reading-arabic-size'),
    ).toBe('2.45rem');
    expect(window.location.search).toBe('?ref=2%3A1&view=threads');
    rendered.unmount();
    render(<QuranApp />);
    await screen.findByRole('heading', { name: 'Threads from 2:1' });
    fireEvent.click(screen.getByText('Reading settings'));
    expect(screen.getByRole('combobox', { name: 'Reader language' })).toHaveProperty(
      'value',
      'english',
    );
    expect(screen.getByRole('combobox', { name: 'Reader line spacing' })).toHaveProperty(
      'value',
      'spacious',
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Reader language' }), {
      target: { value: 'arabic' },
    });
    const arabic = screen.getByRole('region', { name: 'Quran text and relationship threads' });
    expect(arabic.querySelector('ol')?.querySelector('[lang="en"]')).toBeNull();
    expect(arabic.querySelector('[lang="ar"][dir="rtl"]')).not.toBeNull();
  });

  it('uses a single tab stop and arrow-key focus across canonical surah boundaries', async () => {
    window.history.replaceState(null, '', '/?ref=1%3A7&view=threads');
    render(<QuranApp />);
    const reader = await screen.findByRole('region', {
      name: 'Quran text and relationship threads',
    });
    const selected = () => findSelectedVerse(reader);
    expect(reader.querySelectorAll('ol button[tabindex="0"]')).toHaveLength(1);
    expect(reader.querySelectorAll('ol button[tabindex="-1"]')).toHaveLength(6);
    expect(reader.querySelector('#quran-verse-keyboard-help')?.textContent).toContain('Up/Down');

    selected().focus();
    fireEvent.keyDown(selected(), { key: 'ArrowDown' });
    expect(window.location.search).toContain('ref=2%3A1');
    expect(reader.querySelectorAll('ol button[tabindex="0"]')).toHaveLength(1);
    expect(document.activeElement).toBe(selected());
    expect(screen.getByText('Selected Al-Baqarah 2:1 of 286 ayahs')).toBeTruthy();

    fireEvent.keyDown(selected(), { key: 'End' });
    expect(window.location.search).toContain('ref=2%3A286');
    expect(document.activeElement).toBe(selected());

    fireEvent.keyDown(selected(), { key: 'ArrowDown' });
    expect(window.location.search).toContain('ref=3%3A1');
    expect(document.activeElement).toBe(selected());

    fireEvent.keyDown(selected(), { key: 'ArrowUp' });
    expect(window.location.search).toContain('ref=2%3A286');
    fireEvent.keyDown(selected(), { key: 'Home' });
    expect(window.location.search).toContain('ref=2%3A1');
  });

  it('does not capture modified keys or form keyboard actions', async () => {
    window.history.replaceState(null, '', '/?ref=2%3A1&view=threads');
    render(<QuranApp />);
    const reader = await screen.findByRole('region', {
      name: 'Quran text and relationship threads',
    });
    const selected = findSelectedVerse(reader);
    const original = window.location.search;
    fireEvent.keyDown(selected, { key: 'ArrowDown', ctrlKey: true });
    fireEvent.keyDown(selected, { key: 'ArrowUp', shiftKey: true });
    expect(window.location.search).toBe(original);

    const refInput = screen.getByRole('searchbox', { name: 'Ayah reference' });
    refInput.focus();
    fireEvent.keyDown(refInput, { key: 'ArrowDown' });
    fireEvent.keyDown(refInput, { key: 'End' });
    expect(window.location.search).toBe(original);

    selected.focus();
    fireEvent.keyDown(selected, { key: 'ArrowUp' });
    expect(window.location.search).toContain('ref=1%3A7');
    expect(document.activeElement).toBe(reader.querySelector('ol button[aria-current="true"]'));
  });

  it('provides surah navigation in reading mode with reachable selected-ayah focus', async () => {
    window.history.replaceState(null, '', '/?ref=1%3A1&view=threads');
    render(<QuranApp />);
    await screen.findByRole('region', { name: 'Quran text and relationship threads' });
    fireEvent.click(screen.getByRole('button', { name: 'Enter reading mode' }));
    const nav = screen.getByRole('navigation', { name: 'Surah navigation' });
    expect(nav.querySelectorAll('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Previous surah' }).hasAttribute('disabled')).toBe(
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next surah' }));
    expect(window.location.search).toContain('ref=2%3A1');
    fireEvent.click(screen.getByRole('button', { name: 'Focus selected ayah' }));
    expect(document.activeElement).toBe(
      screen
        .getByRole('region', { name: 'Distraction-free Quran reader' })
        .querySelector('ol button[aria-current="true"]'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous surah' }));
    expect(window.location.search).toContain('ref=1%3A1');
  });

  it('moves keyboard focus to the main landmark after a primary view transition', async () => {
    render(<QuranApp />);
    await screen.findByRole('heading', { name: /Al-Baqarah.*2:1/ });
    const main = document.getElementById('quran-main');
    fireEvent.click(screen.getByRole('button', { name: 'Threads & Reader' }));
    await screen.findByRole('region', { name: 'Quran text and relationship threads' });
    expect(document.activeElement).toBe(main);
    fireEvent.click(screen.getByRole('button', { name: 'Arcs' }));
    expect(document.activeElement).toBe(main);
  });

  it('offers a retry if the dataset load fails', async () => {
    vi.mocked(loadQuranReaderData)
      .mockRejectedValueOnce(new Error('Dataset unavailable'))
      .mockResolvedValue(data);
    render(<QuranApp />);
    expect((await screen.findByRole('alert')).textContent).toContain('Dataset unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeTruthy();
  });
});
