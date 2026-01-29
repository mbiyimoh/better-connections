/**
 * Shared font loading utilities for OG image generation.
 *
 * next/og ImageResponse only supports woff and ttf font formats (not woff2).
 * We fetch from Google Fonts with an IE user agent to get woff instead of woff2.
 */

let cachedInstrumentSerif: ArrayBuffer | null = null;

export async function loadInstrumentSerif(): Promise<ArrayBuffer> {
  if (cachedInstrumentSerif) return cachedInstrumentSerif;

  const cssResponse = await fetch(
    'https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap',
    {
      headers: {
        // Use IE user agent to get woff format (older browser doesn't support woff2)
        'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
      },
    }
  );
  const css = await cssResponse.text();

  const fontUrlMatch = css.match(/url\(([^)]+)\)\s*format\(['"]woff['"]\)/);
  if (!fontUrlMatch?.[1]) {
    throw new Error('Could not find Instrument Serif woff URL in Google Fonts CSS');
  }

  const fontResponse = await fetch(fontUrlMatch[1]);
  const data = fontResponse.arrayBuffer();
  cachedInstrumentSerif = await data;
  return cachedInstrumentSerif;
}
