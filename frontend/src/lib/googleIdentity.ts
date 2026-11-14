type CredentialHandler = (response: { credential?: string }) => void;

type GoogleIdentity = {
  initialize(config: {
    client_id: string;
    use_fedcm_for_button: boolean;
    callback: CredentialHandler;
  }): void;
  renderButton(container: HTMLElement, options: {
    theme: 'outline';
    size: 'large';
    text: 'continue_with';
  }): void;
};

const clientUrl = 'https://accounts.google.com/gsi/client';
const loadTimeout = 7000;
let pendingClient: Promise<GoogleIdentity> | undefined;
let initializedClient: GoogleIdentity | undefined;
let receiveCredential: CredentialHandler | undefined;

function getIdentity() {
  return (window as Window & { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id;
}

function loadIdentity() {
  const identity = getIdentity();
  if (identity) return Promise.resolve(identity);
  if (pendingClient) return pendingClient;

  pendingClient = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = clientUrl;
    script.async = true;

    function finish(client?: GoogleIdentity) {
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (client) {
        resolve(client);
      } else {
        script.remove();
        reject(new Error('Google sign-in could not load.'));
      }
    }

    const timer = window.setTimeout(() => finish(), loadTimeout);
    script.onload = () => finish(getIdentity());
    script.onerror = () => finish();
    document.head.appendChild(script);
  }).finally(() => { pendingClient = undefined; });

  return pendingClient;
}

export function mountGoogleButton(container: HTMLElement, clientId: string, onCredential: CredentialHandler,
  onReady: () => void, onUnavailable: () => void) {
  let cancelled = false;
  let frameTimer: number | undefined;

  const ready = (event: Event) => {
    if (!(event.target instanceof HTMLIFrameElement)) return;
    window.clearTimeout(frameTimer);
    container.removeEventListener('load', ready, true);
    onReady();
  };

  function unavailable() {
    window.clearTimeout(frameTimer);
    container.removeEventListener('load', ready, true);
    container.replaceChildren();
    onUnavailable();
  }

  void loadIdentity().then(identity => {
    if (cancelled) return;
    if (initializedClient !== identity) {
      identity.initialize({
        client_id: clientId,
        use_fedcm_for_button: true,
        callback: response => receiveCredential?.(response),
      });
      initializedClient = identity;
    }
    receiveCredential = onCredential;
    container.addEventListener('load', ready, true);
    frameTimer = window.setTimeout(unavailable, loadTimeout);
    identity.renderButton(container, { theme: 'outline', size: 'large', text: 'continue_with' });
  }).catch(() => {
    if (!cancelled) unavailable();
  });

  return () => {
    cancelled = true;
    window.clearTimeout(frameTimer);
    container.removeEventListener('load', ready, true);
    if (receiveCredential === onCredential) receiveCredential = undefined;
    container.replaceChildren();
  };
}
