# Multybyte Vendor Portal

Generic vendor product portal for Multybyte.

## Current architecture

Google Sheet → Apps Script/data sync → GitHub Pages → Vendor Portal

The frontend is designed to show vendor-assigned product data with images, quantity, supplier, RMB price, remarks and product links.

## Portal structure

- Vendor login
- Vendor-specific dashboard
- Search/filter products
- Product images
- Quantity
- Supplier
- RMB price
- Remarks
- Product link
- Refresh/live data updates
- Logout/session handling

## Security

GitHub Pages is only the frontend. Real vendor authentication must be performed by a backend. Vendor passwords must **not** be stored in `app.js`, `data.json`, or any public GitHub file.

The current frontend contains a backend-ready authentication interface. Until the authentication backend is connected, `?preview=1` can be used to preview the existing product dashboard.

## GitHub Pages

Repository: `divinegamingblogspot-dot/multybyte-china-purchase`

Enable Pages from **Settings → Pages → Deploy from branch → main → / (root)**.

## Next implementation stage

Connect the login API and vendor authorization layer so each vendor receives only the rows assigned to that vendor. The same backend will support admin functions such as creating vendors, changing passwords, enabling/disabling vendors and assigning sheets.
