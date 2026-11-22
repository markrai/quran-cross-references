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
  window.history.replaceState(null, '', '/?ref=2%3A1');
  vi.mocked(loadQuranReaderData).mockReset();
  vi.mocked(loadQuranReaderData).mockResolvedValue(data);
});

describe('Quran-first reader', () => {
  it('renders verified Arabic and English text with an isolated Quran header', async () => {
    render(<QuranApp />);
    expect(await screen.findByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeTruthy();
    expect(screen.getByLabelText('Selected ayah').querySelector('[lang="ar"]')).not.toBeNull();
    expect(screen.getByLabelText('Selected ayah').querySelector('[dir="ltr"]')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Bible Explorer' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Quran Cross-References' }).getAttribute('href'))
      .toBe('/?ref=2%3A1');
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

    fireEvent.click(screen.getByRole('button', {
      name: 'Al-Baqarah 2:1 to Al-Baqarah 2:255',
    }));
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
