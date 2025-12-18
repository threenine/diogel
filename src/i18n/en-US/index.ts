// This is just an example,
// so you can safely delete all default props below

export default {
  failed: 'Action failed',
  success: 'Action was successful',
  validation: {
    profileNameRequired: 'Profile Name is required',
    invalidNsec: 'Please enter a valid nsec private key',
  },
  createAccount: {
    title: 'Create Nostr Account',
    tabs: {
      create: 'Create New Account',
      import: 'Import Account',
    },
    generateKeys: 'Generate Keys',
    importNsecLabel: 'NSEC Private Key',
    importButton: 'Import',
    save: 'Save',
  },
  account: {
    profileName: 'Profile Name',
    aliasToolTip: "Enter a short name you'll use to identify these keys.",
    publicKey: 'Public Key',
    privateKey: 'Private Key',
    copySuccess: 'Copied to clipboard',
  },
};
