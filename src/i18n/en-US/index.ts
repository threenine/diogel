// This is just an example,
// so you can safely delete all default props below

export default {
  failed: 'Action failed',
  success: 'Action was successful',
  validation: {
    profileNameRequired: 'Profile Name is required',
    invalidNsec: 'Please enter a valid nsec private key',
    keyPairExists: 'A key pair with this public key or alias already exists',
  },
  createAccount: {
    title: 'Create Nostr Account',
    tabs: {
      create: 'Create New Account',
      import: 'Import Existing Account',
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
    created: 'Created',
  },
  profile: {
    title: 'Profile Settings',
    name: 'Name',
    displayName: 'Display Name',
    about: 'About',
    picture: 'Picture URL',
    banner: 'Banner URL',
    website: 'Website',
    nip05: 'NIP-05 Identifier',
    lud16: 'Lightning Address (LUD-16)',
    save: 'Update Profile',
    fetchError: 'Failed to fetch profile from relays',
    saveSuccess: 'Profile updated successfully',
    saveError: 'Failed to update profile',
    noRelays: 'No relays configured to fetch/publish profile',
  },
  approval: {
    title: 'Approval Request',
    description: 'A website is requesting to access your public key.',
    origin: 'Request from:',
    approve: 'Approve',
    reject: 'Reject',
  },
};
