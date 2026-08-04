# Business Rules

## 1. Store ownership and isolation

- Satu user dapat memiliki atau bergabung dengan beberapa toko.
- Setiap data operasional hanya milik satu toko.
- Laporan tidak boleh mencampur toko kecuali sebuah fitur agregasi pemilik secara eksplisit dibuat pada tahap berikutnya.
- Semua akses toko harus melalui membership dan Store Context yang sah.

## 2. Capital, cash, and inventory

Modal, kas, dan stok bukan angka yang sama.

### Modal tunai

Owner memasukkan Rp10.000.000:

- Kas +Rp10.000.000
- Modal owner +Rp10.000.000
- Pendapatan Rp0
- Laba Rp0

### Pembelian stok tunai

Toko membeli stok Rp4.000.000:

- Kas -Rp4.000.000
- Nilai persediaan +Rp4.000.000
- Modal owner tidak berubah langsung
- Laba tidak berubah langsung

### Modal berupa barang

Owner memasukkan barang Rp3.000.000:

- Persediaan +Rp3.000.000
- Modal owner +Rp3.000.000
- Kas tidak berubah
- Pendapatan dan laba tidak berubah

### Penarikan owner

Owner mengambil kas Rp1.000.000:

- Kas -Rp1.000.000
- Modal owner -Rp1.000.000
- Bukan biaya operasional

## 3. Inventory cost

Tahap 1 menggunakan moving weighted average cost.

Rumus setelah pembelian:

```text
(new inventory value) / (new quantity)
```

Biaya perolehan dapat mencakup:

- Harga beli.
- Ongkir masuk yang dialokasikan.
- Biaya penanganan langsung.
- Biaya perolehan langsung lainnya.
- Dikurangi diskon pembelian.

## 4. Profit

### Net sales

```text
gross sales - sales discounts - sales returns
```

### Gross profit

```text
net sales - cost of goods sold
```

Untuk kasus sederhana:

```text
quantity sold × (selling price - unit cost snapshot)
```

### Estimated operating profit

```text
gross profit - operating expenses - recognized inventory losses
```

Setoran modal bukan pendapatan.

Penarikan modal bukan biaya.

Pembelian persediaan bukan langsung biaya operasional.

## 5. Purchase

Pembelian dapat:

- Lunas.
- Dibayar sebagian.
- Belum dibayar.

Pembelian posted:

- Menambah stok.
- Memperbarui moving average cost.
- Mencatat pembayaran jika ada.
- Menambah utang supplier untuk sisa belum dibayar.
- Tidak dapat diedit bebas.

## 6. POS sale

POS posted harus:

- Memeriksa stok.
- Mengunci saldo stok yang relevan.
- Menghitung ulang semua harga dan total di server.
- Membuat sale dan sale items.
- Menyimpan snapshot nama, SKU, satuan, harga jual, unit cost, COGS, dan gross profit.
- Mengurangi stok.
- Membuat stock movements.
- Mencatat payment.
- Menambah financial-account balance melalui cash transaction.
- Menghasilkan nomor invoice unik.

## 7. Returns and reversals

- Retur penjualan merujuk transaksi asal.
- Retur pembelian merujuk transaksi asal.
- Cancellation tidak menghapus histori.
- Reversal membuat efek lawan yang dapat diaudit.
- Posted transaction tidak hard-delete.

## 8. Stock adjustment

Penyesuaian stok wajib memiliki:

- Alasan.
- Kuantitas sistem.
- Kuantitas aktual.
- Selisih.
- Unit cost yang digunakan.
- Actor dan waktu.

## 9. Financial-account transfer

Transfer antarakun:

- Mengurangi akun sumber.
- Menambah akun tujuan.
- Tidak mengubah total kas.
- Bukan pendapatan atau biaya.

## 10. Status principle

Dokumen bisnis minimal memiliki lifecycle:

- Draft.
- Posted.
- Cancelled atau reversed bila relevan.

Hanya draft yang dapat diedit bebas.
