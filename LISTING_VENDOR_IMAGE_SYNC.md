# Website Listing vendor + image sync

The portal's Website Listing is the product source of truth.

Required mapping:
- SKU = `SKU_ID`
- Product = `Product Name`
- Website URL = `Multybyte Link`
- Supplier = `Supplier Name`
- Vendor = `Vendor Name`

Vendor records must be derived from `Website Listing` and existing VENDORS records must be preserved. Product cards must use the image resolved from each row's `Multybyte Link`.

This marker file documents the intended deployment target without modifying production spreadsheet data.