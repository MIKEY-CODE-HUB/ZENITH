const cabinImage = 'https://images.unsplash.com/photo-1470748085385-5fbb3018c796?auto=format&fit=crop&w=1920&q=80';
const cabinPhotoPage = /^\/photos\/(?:reflective-photography-of-cabin-in-forest-)?s-k-2N90yuY\/?$/;

function isGoogleImageResult(url: URL) {
  return url.pathname === '/imgres' && /^(www\.)?google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(url.hostname);
}

export function parseSceneryUrl(value: string) {
  if (!value.trim() || value.length > 4096) return null;
  try {
    let url = new URL(value.trim());
    if (isGoogleImageResult(url)) url = new URL(url.searchParams.get('imgurl') ?? '');
    if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048) return null;
    if ((url.hostname === 'unsplash.com' || url.hostname === 'www.unsplash.com') && cabinPhotoPage.test(url.pathname)) {
      url = new URL(cabinImage);
    }
    return { url: url.href, kind: /\.(mp4|webm|mov)$/i.test(url.pathname) ? 'video' as const : 'image' as const };
  } catch {
    return null;
  }
}

export function sceneryLinkError(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.hostname === 'unsplash.com' || url.hostname === 'www.unsplash.com' || url.hostname === 'share.google' ||
        /^(www\.)?google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(url.hostname)) {
      return 'Open the original image, right-click it, and choose Copy image address. Paste that address here.';
    }
  } catch {}
  return 'Use a public HTTPS image address or an MP4/WebM file.';
}

export function loadSceneryMedia(url: string, kind: 'image' | 'video') {
  return new Promise<void>((resolve, reject) => {
    const element = kind === 'video' ? document.createElement('video') : new Image();
    const readyEvent = kind === 'video' ? 'loadeddata' : 'load';
    const finish = (success: boolean) => {
      clearTimeout(timeout);
      element.removeEventListener(readyEvent, loaded);
      element.removeEventListener('error', failed);
      element.removeAttribute('src');
      if (element instanceof HTMLVideoElement) element.load();
      if (success) resolve();
      else reject(new Error('Could not load this media. ' + sceneryLinkError(url)));
    };
    const loaded = () => finish(true);
    const failed = () => finish(false);
    const timeout = window.setTimeout(failed, 8000);
    element.addEventListener(readyEvent, loaded);
    element.addEventListener('error', failed);
    if (element instanceof HTMLVideoElement) {
      element.muted = true;
      element.preload = 'auto';
    } else {
      element.referrerPolicy = 'no-referrer';
    }
    element.src = url;
  });
}

export const MOTION_SCENERIES = [
  { id: 'rain-window-motion', name: 'Rain on the Window', art: 'rain', tint: '#a77650' },
  { id: 'snow-cabin-motion', name: 'Snow Outside the Cabin', art: 'snow', tint: '#7596a2' },
] as const;
