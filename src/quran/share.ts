export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';

export async function shareQuranReference(url: string, title: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    const clipboard = (navigator as Partial<Navigator>).clipboard;
    if (typeof clipboard?.writeText !== 'function') return 'unavailable';
    await clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'unavailable';
  }
}
