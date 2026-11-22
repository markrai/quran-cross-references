import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';
import { QuranApp } from './QuranApp.tsx';
import { loadQuranReaderData, type QuranReaderData } from './model.ts';

vi.mock('./model.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('./model.ts')>();
  return { ...original, loadQuranReaderData: vi.fn() };
});

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
  window.history.replaceState(null, '', '/quran/?ref=2%3A1');
  vi.mocked(loadQuranReaderData).mockReset();
  vi.mocked(loadQuranReaderData).mockResolvedValue(data);
});

describe('Quran Phase 1C reader', () => {
  it('renders verified Arabic and English text with an isolated Quran header', async () => {
    render(<QuranApp />);
    expect(await screen.findByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeTruthy();
    expect(screen.getByLabelText('Selected ayah').querySelector('[lang="ar"]')).not.toBeNull();
    expect(screen.getByLabelText('Selected ayah').querySelector('[dir="ltr"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Bible Explorer' })).toHaveAttribute('href', '/');
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
    expect(screen.getByText('2. Al-Baqarah')).toBeTruthy();
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

    window.history.replaceState(null, '', '/quran/?ref=2%3A1&view=threads');
    fireEvent(window, new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Threads from 2:1' })).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /2:255/ })).toBeTruthy();
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

  it('offers a retry if the dataset load fails', async () => {
    vi.mocked(loadQuranReaderData)
      .mockRejectedValueOnce(new Error('Dataset unavailable'))
      .mockResolvedValue(data);
    render(<QuranApp />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Dataset unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeTruthy();
  });
});
