
const nostr = {
  name: 'Diogel',
  getPublicKey: async () => {
    return nostr.call('getPublicKey', {});
  },
  signEvent: async (event) => {
    return nostr.call('signEvent', { event });
  },
  getRelays: async () => {
    return nostr.call('getRelays', {});
  },
  nip04: {
    encrypt: async (pubkey, plaintext) => {
      return nostr.call('nip04.encrypt', { pubkey, plaintext });
    },
    decrypt: async (pubkey, ciphertext) => {
      return nostr.call('nip04.decrypt', { pubkey, ciphertext });
    }
  },

  // Internal call helper
  call: (type, payload) => {
    console.log('[BEX] Provider calling:', type, payload);
    const id = Math.random().toString(36).substring(2);
    try {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener('message', handler);
          console.error(`[BEX] Request timed out for ID ${id}: ${type}`);
          reject(new Error(`Request timed out: ${type}`));
        }, 30000); // 30 second timeout

        const handler = (event) => {
          if (
            event.source === window &&
            event.data &&
            event.data.id === id &&
            event.data.response
          ) {
            console.log(`[BEX] Provider received response for ID ${id}:`, event.data);
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data.result);
            }
          }
        };
        window.addEventListener('message', handler);
        console.log(`[BEX] Provider posting message for ID ${id}:`, type);
        window.postMessage(
          {
            id,
            type: 'nostr-ext-request',
            method: type,
            payload
          },
          '*'
        );
      });
    } catch (e) {
      console.error(`[BEX] Error in nostr.call for ID ${id}:`, e);
      throw e;
    }
  },

  // Ping method to verify communication
  ping: () => {
    return nostr.call('ping', {}).catch(() => {
      // Internal ping to content script
      return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(2);
        const timeout = setTimeout(() => {
          window.removeEventListener('message', handler);
          reject(new Error('Ping timed out'));
        }, 5000);
        const handler = (event) => {
          if (event.source === window && event.data && event.data.id === id && event.data.response) {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            resolve(event.data.result);
          }
        };
        window.addEventListener('message', handler);
        window.postMessage({ id, type: 'nostr-ext-ping' }, '*');
      });
    });
  }
};

window.nostr = nostr;
window.dispatchEvent(new CustomEvent('nostr-provider-ready'));
console.log('[BEX] Nostr provider ready and events dispatched');
window.dispatchEvent(
  new CustomEvent('nostr:registration', {
    detail: {
      name: 'Diogel',
      methods: ['getPublicKey', 'signEvent', 'getRelays', 'nip04.encrypt', 'nip04.decrypt']
    }
  })
);
