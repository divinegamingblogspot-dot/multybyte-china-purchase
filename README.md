# Multybyte China Purchase

Mobile-friendly purchase dashboard for China suppliers/employees.

## Architecture

Google Sheet → Google Apps Script API → GitHub Pages PWA

The frontend reads the purchase data through the deployed Apps Script endpoint. Users do not need direct access to the Google Sheet.

## Sheet columns

A SKU  
B Product Name  
C Quantity  
D Supplier Name  
E Product link  
F Image

## GitHub Pages

Repository: `divinegamingblogspot-dot/multybyte-china-purchase`

After enabling Pages from **Settings → Pages → Deploy from branch → main → / (root)**, the site will be available at:

`https://divinegamingblogspot-dot.github.io/multybyte-china-purchase/`

## Important

The Apps Script endpoint must be deployed as a Web App with **Execute as: Me** and **Who has access: Anyone**. The frontend uses JSONP to reduce browser CORS problems.

The current frontend displays image URLs stored in column F directly. The Apps Script `action=image` endpoint is not used as an `<img>` proxy because Apps Script ContentService does not provide a normal arbitrary binary image response.
