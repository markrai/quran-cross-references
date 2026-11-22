export type ShareResult = 'shared' | 'copied' | 'unavailable';

export async function shareQuranReference(url: string, title: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return 'unavailable';
    }
  }
  try {
    if (!navigator.clipboard?.writeText) return 'unavailable';
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'unavailable';
  }
}
