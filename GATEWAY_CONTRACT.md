# Multybyte Gateway Contract

The Apps Script gateway is a protected core dependency.

## Production endpoint

There is exactly one allowed frontend Apps Script Web App endpoint:

`https://script.google.com/macros/s/AKfycbwCGKZiV57bzmspcr5W2aVF5R7SpbwEqCs911boTjJbkPYvFEZJ-QNL0iD42qrxXfT9/exec`

This exact `/exec` URL is the production endpoint supplied by the deployed Apps Script Web App. Do not alter, regenerate, shorten, or replace it during feature work.

## Rules

1. There is exactly one frontend Apps Script URL: `window.__MB_CANONICAL_API`.
2. `gateway-guard.js` is the first-line transport guard and rewrites any Apps Script JSONP request to the production endpoint above.
3. `app.js` must use the shared `api()` transport for normal portal calls.
4. `fix.js` may use `window.__MB_GATEWAY` for protected login/PO recovery paths.
5. Never paste a second Apps Script `/exec` URL into a feature file.
6. Never replace `api()` with `fetch()`/CORS for Apps Script JSONP actions without a deliberate architecture change.
7. Feature work must be isolated from transport changes. A product/PDF/vendor feature must not modify gateway behavior.
8. Backend action names must remain compatible with `Code.gs` unless the frontend and backend are changed together.
9. Before changing the gateway, test login first, then admin products, vendor data, and purchase orders.
10. If login reports `Gateway unavailable`, do not add another frontend workaround blindly. Verify the deployed Apps Script Web App/version/access and its `/exec` URL first.

## Current backend contract

The backend `doGet(e)` supports JSONP through the `callback` parameter and currently exposes `login`, `logout`, `data`, `vendorData`, `vendorPurchaseOrders`, `adminVendors`, `adminProducts`, `purchaseLookup`, `savePurchaseOrder`, and `purchaseOrders` among its portal actions.

## Deployment rule

GitHub changes do not automatically publish a new Apps Script Web App deployment. After changing `Code.gs`, update the existing Apps Script deployment/version while keeping the production `/exec` URL above. Do not silently create a different URL.

## Change-control rule

**Do not modify gateway transport as part of ordinary feature work.** Product listing, vendor, PDF, CSV, PO, dashboard, command, and UI changes must remain outside the protected gateway layer. If a gateway change is genuinely required, update this contract and test the complete login → products → vendors → PO flow before merging.
