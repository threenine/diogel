<img alt="Diogel" src="https://res.cloudinary.com/threenine-co-uk/image/upload/v1733252921/github-banner_rtnvqv.png" width="800"/>

A Nostr Account and Signer browser extension, enabling you to manage and switch between multiple identities while
interacting with Nostr apps.

Diogel signer is a secure browser extension for managing your Nostr identities without exposing your private keys to
web applications.

**Key Features:**

##### Multiple Identity Management

- Manage multiple identities
- Switch between identities
- Sign messages and posts
- Import existing keys or generate new ones
- Customize profiles with display names and metadata

##### Secure Key Storage

- Keys are stored in a password protected encrypted vault with automatic locking.
- Keys never leave the extension because apps only receive signatures

#### NIP-07 Signing

- Full NIP-07 implementation (window.nostr interface)
- Review event details before signing
- Granular permission controls per site and event kind
- One-click approve or reject with "always" options

#### Privacy Focused

- No data collection or analytics
- Fully open source

### Development

The project has been bootstrapped with Quasar Framework. [Learn More](https://quasar.dev/introduction-to-quasar)

### Installation 
To install a browser extension from the GitHub repository, follow these steps:

1. Download the extension code
   Go to the e[releases page](https://github.com/threenine/diogel/releases) , select the latest release, and  expand the "Assets" section.
   Select "Download ZIP" to get the source files.

2. Extract the ZIP file
   Unzip the downloaded file to a folder on your computer. Make sure the folder contains a manifest.json file, which is required for Chrome extensions.

3. Enable Developer Mode in Chrome
   Open Chrome and go to chrome://extensions. Toggle on "Developer mode" in the top right corner.

4. Load the extension
   Click "Load unpacked", then navigate to the folder where you extracted the files.  Select it and click "Open".

The extension will now appear in your extensions list and be active.

⚠️ Security Note:  Although extensions from GitHub are not vetted like those in the Chrome Web Store, they can access 
your browsing data, including passwords and personal information. Only install extensions from trusted sources.

