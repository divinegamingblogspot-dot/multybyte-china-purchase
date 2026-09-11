# Multybyte Vendor Portal

Generic vendor management and product portal. The website is intentionally **not China-specific**.

## What is included

- Vendor login
- Admin login
- Vendor-specific sheet assignment
- Create/update vendor accounts
- Enable/disable vendors
- Change vendor passwords
- Session persistence in the browser
- Vendor-only product data
- SKU, product name, quantity, supplier, price and remarks
- Product images and product links
- Search
- Manual refresh and automatic refresh
- Responsive desktop/mobile UI
- Existing GitHub image/data sync remains compatible through `action=data`

## Architecture

`Google Sheet → Apps Script backend → GitHub Pages frontend`

GitHub Pages is only the public frontend. Passwords and vendor authorization are handled by Apps Script, not by public GitHub files.

## Backend file

`apps-script/Code.gs` contains the complete vendor-portal backend. It uses the existing spreadsheet:

`1kMUUpS6sRUTvmb5lR0Lav2AGHLlaeETy-H0Jisx7Sn4`

The backend creates/uses a `VENDORS` tab with:

`Vendor ID | Vendor Name | Sheet Name | Enabled | Password Hash`

It also keeps the existing `action=data` endpoint for the current GitHub image/data synchronization workflow.

## One-time backend connection

The only part GitHub cannot perform on its own is publishing the Apps Script code into the user's Google Apps Script deployment. Put `apps-script/Code.gs` into the existing Apps Script project that already powers the spreadsheet, preserving the existing image-sync functions and routing the existing `doGet(e)` to the portal actions (`login`, `vendorData`, `adminVendors`, `saveVendor`, `logout`) while keeping `action=data`.

Then deploy/update the Web App using the same endpoint configured in `app.js`.

Run `setupVendorPortal()` once from Apps Script. It creates the `VENDORS` tab and asks for the Admin ID/password. Run `resetAdminPassword()` later to change the admin password.

For the Web App, use the normal Apps Script web-app deployment with the script executing under the owner account and public access enabled as required by the frontend. Google documents that web-app deployments have an explicit access/execute-as configuration. citeturn0search3

## Preview

Before backend authentication is connected, open the GitHub Pages site with `?preview=1` to preview the product dashboard using the existing synced `data.json`.

## GitHub Pages

Repository: `divinegamingblogspot-dot/multybyte-china-purchase`

Enable Pages from **Settings → Pages → Deploy from branch → main → / (root)**.
