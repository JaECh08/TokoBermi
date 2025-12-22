# Fitur Edit Nota di Print Nota

## Deskripsi
Fitur baru yang memungkinkan user untuk mengedit data di nota secara langsung dari bagian "Print Nota" tanpa mengubah data asli di database.

## Cara Menggunakan

1. **Buka Print Nota**
   - Navigasi ke menu "Print Nota"
   - Klik pada salah satu nota untuk melihat detailnya

2. **Edit Data**
   - Double-click pada data apapun yang ingin diubah (nama customer, kota, no HP, ekspedisi, tanggal, nama barang, qty, harga, dll)
   - Input field akan muncul
   - Ketik nilai baru yang diinginkan
   - Tekan Enter atau klik di luar field untuk menyimpan

3. **Download PDF**
   - Setelah mengedit data sesuai keinginan, klik tombol "Download Nota PDF"
   - PDF yang di-download akan menggunakan data yang telah diedit

## Fitur Utama

### ✅ Yang Bisa Diedit:
- **Data Pemesan:**
  - Tanggal
  - Nama Customer
  - Kota
  - No. HP
  - Ekspedisi

- **Detail Barang:**
  - Nama Barang
  - Quantity (Qty)
  - Harga Satuan
  - Jumlah (Subtotal)

### 🔒 Keamanan Data:
- **TIDAK mengubah data asli** di database
- Editan hanya tersimpan sementara di cache browser
- Data asli di "Stock Barang", "Data Customer", dan database tetap aman
- Editan akan hilang jika halaman di-refresh atau nota ditutup

### 🎨 Visual Feedback:
- Field yang bisa di-edit akan highlight saat di-hover
- Tooltip "Double-click untuk edit" muncul saat hover
- Border biru muncul saat sedang mengedit
- Auto-calculate total saat harga atau qty diubah

## Contoh Penggunaan

**Skenario:** Customer minta harga khusus untuk print nota, tapi tidak ingin mengubah harga di sistem

1. Buka nota customer tersebut di "Print Nota"
2. Double-click pada harga barang yang ingin diubah
3. Masukkan harga khusus (misal: 50000)
4. Tekan Enter
5. Total akan otomatis terupdate
6. Klik "Download Nota PDF"
7. PDF yang di-download akan menampilkan harga khusus
8. Harga di "Stock Barang" tetap tidak berubah

## Technical Details

### File yang Dimodifikasi:
1. **script.js**
   - Menambahkan `invoiceEditCache` untuk menyimpan editan sementara
   - Fungsi `getInvoiceData()` - mengambil data dari cache atau database
   - Fungsi `makeInvoiceFieldEditable()` - membuat field bisa di-edit
   - Fungsi `generateEditableInvoiceContent()` - generate HTML editable
   - Fungsi `refreshInvoiceDisplay()` - refresh tampilan setelah edit
   - Update `printToPDF()` - menggunakan data dari cache

2. **style.css**
   - Styling untuk `.editable-field`
   - Hover effects
   - Dark mode support

### Data Flow:
```
Database (Original) 
    ↓
getInvoiceData() 
    ↓
invoiceEditCache (Temporary)
    ↓
generateEditableInvoiceContent()
    ↓
User Double-Click Edit
    ↓
makeInvoiceFieldEditable()
    ↓
Update invoiceEditCache
    ↓
refreshInvoiceDisplay()
    ↓
printToPDF() uses cached data
```

## Catatan Penting

⚠️ **Editan bersifat sementara** - Jika ingin mengubah data permanen, gunakan fitur "Edit Nota" yang sudah ada.

💡 **Tips:** Fitur ini sangat berguna untuk:
- Membuat harga khusus untuk customer tertentu
- Menyesuaikan nama barang untuk print
- Koreksi typo sementara sebelum print
- Testing tampilan nota dengan data berbeda
