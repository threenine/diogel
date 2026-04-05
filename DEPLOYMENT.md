### Deploying to the Chrome Web Store

To automate the publishing of the **diogel** extension to the Chrome Web Store using GitHub Actions, you need to configure several repository secrets.

#### 1. Required GitHub Secrets

Navigate to your repository on GitHub:
**Settings** > **Secrets and variables** > **Actions** > **New repository secret**

Add the following four secrets:

| Secret Name | Description |
| :--- | :--- |
| `CWS_EXTENSION_ID` | The 32-character ID of your extension in the Chrome Web Store. |
| `CWS_CLIENT_ID` | OAuth2 Client ID from the Google Cloud Console. |
| `CWS_CLIENT_SECRET` | OAuth2 Client Secret from the Google Cloud Console. |
| `CWS_REFRESH_TOKEN` | OAuth2 Refresh Token used to generate access tokens for the API. |

---

#### 2. How to Obtain the Credentials

##### A. Get the Extension ID (`CWS_EXTENSION_ID`)
1. Log in to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. If you haven't already, create a new item and upload a draft version of the extension.
3. Once the item is created, the **Item ID** (32 characters) will be visible in the dashboard or the URL.

##### B. Create Google Cloud Project & API Credentials (`CLIENT_ID` & `CLIENT_SECRET`)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "Diogel Extension").
3. Search for and enable the **Chrome Web Store API**.
4. Configure the **OAuth Consent Screen**:
   - Choose **External** (unless you have a Google Workspace org).
   - Fill in required app information.
   - Add the scope: `https://www.googleapis.com/auth/chromewebstore`.
   - **Crucial:** Add your own email as a **Test User** while the app is in "Testing" mode.
5. Go to **Credentials** > **Create Credentials** > **OAuth Client ID**.
   - Select **Desktop App** as the Application Type.
   - Name it "GitHub Actions Publisher".
   - Copy the generated `Client ID` and `Client Secret`.

##### C. Generate the Refresh Token (`CWS_REFRESH_TOKEN`)
The easiest way is to use a manual authorization flow in your browser:

1. Replace `YOUR_CLIENT_ID` in the following URL and open it in your browser:
   `https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob`
2. Log in with the Google account used for the Developer Dashboard.
3. Authorize the app and copy the **Authorization Code** provided.
4. Use `curl` to exchange the code for a refresh token (replace the placeholders):

```bash
curl "https://accounts.google.com/o/oauth2/token" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=YOUR_AUTHORIZATION_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

5. The response will contain a `refresh_token`. Save this as your GitHub secret.

---

#### 3. Automatic Publishing
Once these secrets are set, the `.github/workflows/chrome-publish.yml` workflow will automatically:
- Trigger on every new Git **Tag** (e.g., `v0.0.18`).
- Build the Quasar BEX.
- Create a GitHub Release with the ZIP artifact.
- Upload and publish the ZIP to the Chrome Web Store.

---

### Deploying to Firefox Add-ons (AMO)

To automate the publishing of the **diogel** extension to the Firefox Add-on Hub (AMO) using GitHub Actions, you need to configure three additional repository secrets.

#### 1. Required GitHub Secrets

Navigate to your repository on GitHub:
**Settings** > **Secrets and variables** > **Actions** > **New repository secret**

Add the following three secrets:

| Secret Name | Description |
| :--- | :--- |
| `AMO_ADDON_ID` | The unique ID of your add-on (usually a UUID or an email-like ID). |
| `AMO_API_ISSUER` | Your JWT issuer key from the AMO credentials page. |
| `AMO_API_SECRET` | Your JWT secret key from the AMO credentials page. |

---

#### 2. How to Obtain the Credentials

##### A. Get the Add-on ID (`AMO_ADDON_ID`)
1. Log in to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/en-US/developers/).
2. Submit your extension as a new add-on (or use an existing one).
3. Once submitted, navigate to the **Edit Product Page**.
4. The **Add-on ID** can be found under the "Technical Details" section (e.g., `{1234abcd-1234-abcd-1234-abcd1234abcd}` or `diogel@your-domain.com`).

##### B. Create API Credentials (`AMO_API_ISSUER` & `AMO_API_SECRET`)
1. Go to the [API Credentials Page](https://addons.mozilla.org/en-US/developers/addon/api/key/) in the Developer Hub.
2. Read and accept the agreement if prompted.
3. Your **JWT Issuer** and **JWT Secret** will be displayed.
4. Copy these into your GitHub repository secrets.

---

#### 3. Automatic Publishing
Once these secrets are set, the `.github/workflows/firefox-publish.yml` workflow will automatically:
- Trigger on every new Git **Tag** (e.g., `v0.0.18`).
- Build the Quasar BEX specifically for Firefox.
- Create or update a GitHub Release with the Firefox-compatible ZIP artifact.
- Upload the extension to Firefox Add-ons (AMO) for signing and publication.
