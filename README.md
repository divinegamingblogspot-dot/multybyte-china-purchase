# Multybyte Universal Partner Portal

A generic, reusable partner/vendor portal connected to Google Sheets through Google Apps Script and served from GitHub Pages. It is **not tied to China, purchasing, or any specific supplier type**.

## Included

- Secure user login + admin login
- Each user is assigned to one Google Sheet tab
- Users only receive rows from their assigned tab
- Admin can create, edit, enable and disable users
- Passwords are hashed server-side
- Session persistence
- SKU, product name, quantity, supplier, price, remarks, links and images
- Fast client-side search
- Lazy-loaded product images
- Manual refresh + automatic refresh
- Mobile and desktop responsive UI
- Existing `action=data` sync compatibility

## Fast data flow

`Google Sheet → Apps Script → short server cache → GitHub Pages`

The portal uses a short server-side cache to avoid repeatedly reading the same sheet on every refresh. This makes repeat loads much faster while keeping normal updates nearly real-time. The frontend also avoids unnecessary DOM work and loads product images lazily.

## Security model

GitHub Pages is only the frontend. It does not contain passwords or the full production dataset. The Apps Script backend authenticates the user and returns only the data from the sheet assigned to that session.

## Backend

`apps-script/Code.gs` contains the portal backend configuration and logic. It uses the existing spreadsheet ID:

`1kMUUpS6sRUTvmb5lR0Lav2AGHLlaeETy-H0Jisx7Sn4`

The `VENDORS` tab contains:

`User ID | User Name | Sheet Name | Enabled | Password Hash`

## Important integration note

The existing spreadsheet project already contains image-sync/data-sync code. Do **not** blindly delete that existing Apps Script project. Integrate the portal backend into the existing project and make its existing `doGet(e)` route portal actions (`login`, `vendorData`, `adminVendors`, `saveVendor`, `logout`) while preserving the existing `action=data` behavior.

Run `setupVendorPortal()` once after integration. It creates the `VENDORS` tab and configures the admin account. Use `resetAdminPassword()` to change the admin password later.

Deploy/update the Apps Script Web App and keep the deployed URL the same as the `AUTH_API_URL` in `app.js`.

## Preview

Add `?preview=1` to the GitHub Pages URL to preview the product interface using `data.json`. Preview mode is for testing only and is not the production access-control mechanism.

## GitHub Pages

Enable GitHub Pages from **Settings → Pages → Deploy from branch → main → / (root)**.
