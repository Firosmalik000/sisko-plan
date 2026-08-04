# UI and UX Standards

## Audience

Primary users may not understand accounting terminology.

Use direct Indonesian labels:

- Tambah Modal
- Ambil Modal
- Barang Masuk
- Barang Keluar
- Pembelian
- Utang Supplier
- Kas Masuk
- Kas Keluar
- Biaya Toko
- Nilai Stok
- Laba Kotor
- Estimasi Laba Usaha

## General interface

- Responsive.
- Consistent page headers and actions.
- Search, filters, pagination.
- Empty states with next action.
- Clear validation errors.
- Confirm destructive actions.
- Status badges with text, not color alone.
- Accessible labels and keyboard focus.

## POS interface

Desktop POS should prioritize speed:

- Product search focused by default.
- Barcode entry works without mouse.
- Product result grid or list.
- Cart visible.
- Fast quantity controls.
- Clear subtotal, discount, total, paid, and change.
- Disable submit while posting.
- Prevent accidental duplicate submission.
- Printable receipt after success.

Mobile POS may simplify layout, but it must preserve the core flow.

## Money and quantity display

- Use Indonesian number formatting.
- Preserve decimal quantities when required.
- Never round stored authoritative values only for UI convenience.
- Clearly distinguish selling price, cost, and profit.

## Dashboard language

Avoid claiming formal audited accounting.

Use:

- Estimasi Laba Usaha
- Nilai Persediaan
- Saldo Kas dan Bank
- Utang Supplier

## Error handling

User-facing errors should say:

- What failed.
- Why, when it is safe to explain.
- What the user can do next.

Do not display raw exceptions.
