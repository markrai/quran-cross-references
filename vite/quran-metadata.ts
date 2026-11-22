import type { HtmlTagDescriptor, Plugin } from 'vite';

const TITLE = 'Quran Cross-References';
const DESCRIPTION =
  'Explore curated connections across all 114 surahs with verified Arabic, Pickthall English, arcs and threads.';

export function quranMetadata(): Plugin {
  let base = '/';
  return {
    name: 'quran:metadata',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml(_, context) {
      if (
        context.path !== '/' &&
        context.path !== '/index.html' &&
        context.path !== '/quran/' &&
        context.path !== '/quran/index.html'
      ) {
        return [];
      }
      const origin = process.env['SITE_ORIGIN'] ?? 'https://markrai.github.io';
      const canonical = new URL(base, origin).href;
      const image = new URL(base + 'social-preview.png', origin).href;
      const tags: HtmlTagDescriptor[] = [
        { tag: 'link', attrs: { rel: 'canonical', href: canonical } },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        { tag: 'meta', attrs: { property: 'og:site_name', content: TITLE } },
        { tag: 'meta', attrs: { property: 'og:title', content: TITLE } },
        { tag: 'meta', attrs: { property: 'og:description', content: DESCRIPTION } },
        { tag: 'meta', attrs: { property: 'og:url', content: canonical } },
        { tag: 'meta', attrs: { property: 'og:image', content: image } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        {
          tag: 'meta',
          attrs: { property: 'og:image:alt', content: 'Quran Cross-References passage explorer' },
        },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:title', content: TITLE } },
        { tag: 'meta', attrs: { name: 'twitter:description', content: DESCRIPTION } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
      ];
      return tags.map((tag) => ({ ...tag, injectTo: 'head' as const }));
    },
  };
}
