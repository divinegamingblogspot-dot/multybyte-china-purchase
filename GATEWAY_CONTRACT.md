# Multybyte Gateway Contract

The Apps Script gateway is a protected core dependency.

## Rules

1. There is exactly one frontend Apps Script URL: `window.__MB_CANONICAL_API`.
2. `app.js` must use the shared `api()` transport for normal portal calls.
3. `fix.js` may use `window.__MB_GATEWAY` for protected login/PO recovery paths.
4. Never paste a second Apps Script `/exec` URL into a feature file.
5. Never replace `api()` with `fetch()`/CORS for Apps Script JSONP actions without a deliberate architecture change.
6. Feature work must be isolated from transport changes. A product/PDF/vendor feature must not modify gateway behavior.
7. Backend action names must remain compatible with `Code.gs` unless the frontend and backend are changed together.
8. Before changing the gateway, test login first, then admin products, vendor data, and purchase orders.
9. If login reports `Gateway unavailable`, do not add another frontend workaround blindly. Verify the deployed Apps Script Web App/version/access and its `/exec` URL first.

## Current backend contract

The backend `doGet(e)` supports JSONP through the `callback` parameter and currently exposes `login`, `logout`, `data`, `vendorData`, `vendorPurchaseOrders`, `adminVendors`, `adminProducts`, `purchaseLookup`, `savePurchaseOrder`, and `purchaseOrders` among its portal actions.

## Deployment rule

GitHub changes do not automatically publish a new Apps Script Web App deployment. After changing `Code.gs`, update the existing Apps Script deployment/version while keeping the `/exec` URL used by the portal. Do not silently create a different URL.
