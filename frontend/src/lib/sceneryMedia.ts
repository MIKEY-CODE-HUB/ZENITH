export function parseSceneryUrl(value: string) {
  if (!value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return { url: url.href, kind: /\.(mp4|webm|mov)$/i.test(url.pathname) ? 'video' as const : 'image' as const };
  } catch {
    return null;
  }
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
      else reject(new Error('That link could not be opened. Use a public link to the image or an MP4/WebM file.'));
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
