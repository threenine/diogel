
const currentScript = document.currentScript;
const name = currentScript?.dataset.name || 'Diogel';
const icon = currentScript?.dataset.icon;

const nostr = {
  name,
  icon,
  getPublicKey: async () => {
    return window.nostr.call('getPublicKey', {});
  },
  signEvent: async (event) => {
    return window.nostr.call('signEvent', { event });
  },
  getRelays: async () => {
    return window.nostr.call('getRelays', {});
  },
  nip04: {
    encrypt: async (pubkey, plaintext) => {
      return window.nostr.call('nip04.encrypt', { pubkey, plaintext });
    },
    decrypt: async (pubkey, ciphertext) => {
      return window.nostr.call('nip04.decrypt', { pubkey, ciphertext });
    }
  },

  // Internal call helper
  call: (type, payload) => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2);
      const handler = (event) => {
        if (
          event.source === window &&
          event.data &&
          event.data.id === id &&
          event.data.response
        ) {
          window.removeEventListener('message', handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };
      window.addEventListener('message', handler);
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
  }
};

window.nostr = nostr;
window.dispatchEvent(new CustomEvent('nostr-provider-ready'));
window.dispatchEvent(
  new CustomEvent('nostr:registration', {
    detail: {
      name,
      icon,
      methods: ['getPublicKey', 'signEvent', 'getRelays', 'nip04.encrypt', 'nip04.decrypt']
    }
  })
);
