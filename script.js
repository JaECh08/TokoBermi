// --- FIREBASE CONFIGURATION ---
// No imports needed for Compat version

// Emergency Error Tracking
// --- GLOBALS & STATE ---
var currentStockSortOrder = 'az';
var currentCustomerSortOrder = 'az';
var currentSupplierSortOrder = 'az';
var currentSortOrder = 'newest';
var itemRowCounter = 0;
var editingInvoiceId = null;

// EMERGENCY ERROR TRACKING
window.onerror = function (msg, url, line) {
    alert("EROR SISTEM: " + msg + "\nBaris: " + line);
};

const firebaseConfig = {
    apiKey: "AIzaSyBxXkli2cEbqnbJToLNgTQtaRVodg6VLHE",
    authDomain: "toko-bermi.firebaseapp.com",
    databaseURL: "https://toko-bermi-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "toko-bermi",
    storageBucket: "toko-bermi.firebasestorage.app",
    messagingSenderId: "647490190912",
    appId: "1:647490190912:web:31aa8592664ad6e2a9a9a5",
    measurementId: "G-R6XXPKKGB3"
};

// Initialize Firebase
// Initialize Firebase (Compat)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Global State (Local Cache of Firebase Data)
let dbData = {
    customers: {},
    suppliers: {},
    stock: [],
    invoices: []
};

// Status Login
// Status Login
auth.onAuthStateChanged((user) => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');

    if (user) {
        console.log("Logged in as:", user.email);
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'flex';

        startDataSync();
        initializeData();
        updateDateDisplay();
        updateInvoiceDate(); // Set tanggal nota saat login

        // Render screen
        setTimeout(() => {
            if (window.showScreen) window.showScreen('home-screen');
        }, 200);
    } else {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (mainApp) mainApp.style.display = 'none';

        // Bersihkan data login dan pesan status saat logout
        const emailInput = document.getElementById('login-email');
        const passInput = document.getElementById('login-password');
        const errorMsg = document.getElementById('login-error');

        if (emailInput) emailInput.value = '';
        if (passInput) passInput.value = '';
        if (errorMsg) errorMsg.textContent = '';
    }
});

// Handle Login Form (Ultra Robust)
const setupLogin = () => {
    const form = document.getElementById('login-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-password').value;
            const errorMsg = document.getElementById('login-error');

            if (errorMsg) {
                errorMsg.style.color = "blue";
                errorMsg.textContent = "Sedang mencoba masuk... Mohon tunggu.";
            }

            try {
                await auth.signInWithEmailAndPassword(email, pass);
            } catch (error) {
                console.error("Login Error:", error.code);
                if (errorMsg) {
                    errorMsg.style.color = "red";
                    errorMsg.textContent = "GAGAL: " + error.message;
                }
                alert("Login Gagal: " + error.message);
            }
        };
    } else {
        setTimeout(setupLogin, 500);
    }
};
setupLogin();

// Logout Function
// Logout Function
function logout() {
    showConfirm(
        "Apakah Anda yakin ingin keluar?",
        () => {
            auth.signOut();
            closeConfirmModal();
        }
    );
}
window.logout = logout;

function showConfirm(message, onConfirm, okText = "Ya, Lanjutkan", title = "Konfirmasi") {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes');

    if (modal && messageEl && yesBtn) {
        if (titleEl) titleEl.textContent = title;
        messageEl.textContent = message;
        yesBtn.textContent = okText;

        // Ensure modal uses flex for centering
        modal.style.display = 'flex';

        yesBtn.onclick = () => {
            onConfirm();
            closeConfirmModal();
        };
    }
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}
window.closeConfirmModal = closeConfirmModal;

// --- DATA SYNC LOGIC (Firebase Realtime) ---

function startDataSync() {
    // Sync Stock
    db.ref('stock').on('value', (snapshot) => {
        dbData.stock = snapshot.val() || [];
        syncUI();
    });

    // Sync Customers
    db.ref('customers').on('value', (snapshot) => {
        dbData.customers = snapshot.val() || {};
        syncUI();
    });

    // Sync Invoices
    db.ref('invoices').on('value', (snapshot) => {
        dbData.invoices = snapshot.val() || [];
        syncUI();
    });

    // Sync Suppliers
    db.ref('suppliers').on('value', (snapshot) => {
        dbData.suppliers = snapshot.val() || {};
        syncUI();
    });
}

function syncUI() {
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;

    if (activeScreen.id === 'stock-management') renderStockTable();
    if (activeScreen.id === 'customer-data') renderCustomerTable();
    if (activeScreen.id === 'supplier-data') renderSupplierTable();
    if (activeScreen.id === 'print-invoice') renderInvoicesList();
    if (activeScreen.id === 'create-invoice') {
        loadCustomerOptions();
        loadStockDatalist();
    }
}

// --- UTILITY FUNCTIONS (Adapted for Firebase) ---

function getData(key) {
    return dbData[key];
}
window.getData = getData;

function saveData(key, data) {
    dbData[key] = data;
    db.ref(key).set(data);
}
window.saveData = saveData;

function toggleSidebar() {
    console.log("Toggle Sidebar clicked");
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}
window.toggleSidebar = toggleSidebar;

function scrollToTop() {
    const container = document.querySelector('.content-container');
    if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
window.scrollToTop = scrollToTop;

// Initial data logic (only run if db is empty)
async function initializeData() {
    const stockSnap = await db.ref('stock').once('value');
    if (!stockSnap.exists()) {
        saveData('stock', []);
    }

    const custSnap = await db.ref('customers').once('value');
    if (!custSnap.exists()) {
        saveData('customers', {});
    }

    const invSnap = await db.ref('invoices').once('value');
    if (!invSnap.exists()) {
        saveData('invoices', []);
    }

    const supSnap = await db.ref('suppliers').once('value');
    if (!supSnap.exists()) {
        saveData('suppliers', {});
    }
}


function formatRupiah(number) {
    return 'Rp ' + (new Intl.NumberFormat('id-ID').format(number));
}

function saveDraftInvoice() {
    const form = document.getElementById('invoice-form');
    const draft = {
        customerName: form['customer-name'].value,
        expedition: form['expedition'].value,
        items: []
    };

    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const itemName = row.querySelector('input[list="stock-items-list"]').value;
        const qty = row.querySelector('input[type="number"]').value;
        if (itemName && qty > 0) {
            draft.items.push({ name: itemName, qty: parseInt(qty) });
        }
    });

    saveData('draftInvoice', draft);
}

function loadDraftInvoice() {
    const draft = getData('draftInvoice');
    if (!draft) return;

    const form = document.getElementById('invoice-form');
    if (draft.customerName) {
        form['customer-name'].value = draft.customerName;
        updateCustomerDetails(); // Load detail customer
    }
    if (draft.expedition) {
        form['expedition'].value = draft.expedition;
    }

    // Clear existing items
    const container = document.getElementById('items-list');
    container.innerHTML = '';

    // Add draft items
    draft.items.forEach(item => {
        addItemRow();
        const lastRow = container.lastElementChild;
        const input = lastRow.querySelector('input[list="stock-items-list"]');
        input.value = item.name;
        lastRow.querySelector('input[type="number"]').value = item.qty;
        updateItemDetails(input);
    });

    // If no items, add one empty
    if (draft.items.length === 0) {
        addItemRow();
    }
}

function showAlert(message) {
    document.getElementById('modal-message').textContent = message;
    document.getElementById('alert-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('alert-modal').style.display = 'none';
}

window.showAlert = showAlert;
window.closeModal = closeModal;
window.showConfirm = showConfirm;

// --- FUNGSI NAVIGASI ---

function showScreen(screenId) {
    // Save current form data if leaving create-invoice
    if (document.getElementById('create-invoice').classList.contains('active') && screenId !== 'create-invoice') {
        saveFormData();
    }

    // 1. Manage Screen Visibility
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
        screen.classList.remove('fade-in'); // Reset animation
    });

    const activeScreen = document.getElementById(screenId);
    activeScreen.classList.add('active');

    // Trigger Reflow to restart animation is tricky in vanilla JS without removing class, but strictly adding it is enough if it was removed.
    // To properly restart animation every time:
    void activeScreen.offsetWidth;
    activeScreen.classList.add('fade-in');

    // 2. Manage Sidebar Navigation State
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // Find the button that calls this screen
    const activeButton = Array.from(navItems).find(btn => btn.getAttribute('onclick').includes(screenId));
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // 3. Load Specific Data
    if (screenId === 'create-invoice') {
        loadCustomerOptions();
        loadStockDatalist();
        updateInvoiceDate(); // Update tanggal nota
        restoreFormData();
        updateCustomerDetails();
        calculateTotalAmount();
    } else if (screenId === 'stock-management') {
        renderStockTable();
        checkLowStock();
    } else if (screenId === 'customer-data') {
        renderCustomerTable();
    } else if (screenId === 'supplier-data') {
        renderSupplierTable();
    } else if (screenId === 'print-invoice') {
        currentSortOrder = 'newest';
        document.getElementById('sort-toggle').textContent = 'Urutkan: Terbaru';
        renderInvoicesList();
    }
}


function updateDateDisplay() {
    const dateElement = document.getElementById('current-date-display');
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date().toLocaleDateString('id-ID', options);
        dateElement.textContent = today;
    }
}

function updateInvoiceDate() {
    const invoiceDateElement = document.getElementById('invoice-date');
    if (invoiceDateElement) {
        const today = new Date().toLocaleDateString('id-ID');
        invoiceDateElement.value = today;
    }
}

function checkLowStock() {
    const stock = getData('stock');
    const lowStockItems = stock.filter(item => item.stock <= (item.minStock || 0));

    if (lowStockItems.length > 0) {
        const itemNames = lowStockItems.map(item => item.name).join(', ');
        showAlert(`Peringatan: Stock menipis untuk barang: ${itemNames}`);
    }
}

// --- FUNGSI MEMBUAT NOTA ---

function loadCustomerOptions() {
    const customers = getData('customers');
    const datalist = document.getElementById('customer-list');
    datalist.innerHTML = '';

    // Ambil semua key (compound key) dan urutkan
    const sortedKeys = Object.keys(customers).sort();

    sortedKeys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        datalist.appendChild(option);
    });
}

function loadStockDatalist() {
    const stock = getData('stock');
    const datalist = document.getElementById('stock-items-list');
    if (!datalist) return;
    datalist.innerHTML = '';

    // Urutkan barang A-Z
    const sortedStock = [...stock].sort((a, b) => a.name.localeCompare(b.name));

    sortedStock.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name;
        datalist.appendChild(option);
    });
}

function updateCustomerDetails() {
    const id = document.getElementById('customer-name').value;
    const cityInput = document.getElementById('customer-city');
    const phoneInput = document.getElementById('customer-phone');
    const expeditionInput = document.getElementById('expedition');
    const customers = getData('customers');

    if (id && customers[id]) {
        cityInput.value = customers[id].city;
        phoneInput.value = customers[id].phone;
        expeditionInput.value = customers[id].expedition || '';
    }
}

function loadItemOptions(selectElement) {
    const stock = getData('stock');
    selectElement.innerHTML = '<option value="">-- Pilih Barang --</option>';

    stock.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        selectElement.appendChild(option);
    });
}

function addItemRow() {
    itemRowCounter++;
    const container = document.getElementById('items-list');

    const row = document.createElement('div');
    row.className = 'item-row';
    row.setAttribute('data-id', itemRowCounter);
    row.innerHTML = `
        <div class="form-group">
            <label>Nama Barang:</label>
            <input list="stock-items-list" name="item-name-${itemRowCounter}" placeholder="Cari barang..." required onchange="updateItemDetails(this)" onfocus="this.value=''" autocomplete="off">
        </div>
        <div class="form-group">
            <label>Banyaknya:</label>
            <input type="number" name="item-qty-${itemRowCounter}" min="0" step="any" required value="1" oninput="calculateTotalAmount()">
        </div>
        <div class="form-group">
            <label>Harga Barang:</label>
            <input type="text" name="item-price-${itemRowCounter}" readonly class="item-price-display" value="${formatRupiah(0)}">
        </div>
        <div class="form-group">
            <label>Jumlah:</label>
            <input type="text" name="item-subtotal-${itemRowCounter}" readonly class="item-subtotal-display" value="${formatRupiah(0)}">
        </div>
        <button type="button" class="row-btn btn-remove" onclick="removeItemRow(this)" style="margin-top: 25px; align-self: flex-start;" title="Hapus Baris">×</button>
    `;
    container.appendChild(row);

    // Hide delete button if only 1 row
    updateRemoveButtonsVisibility();

    calculateTotalAmount();
}

function removeItemRow(button) {
    const row = button.closest('.item-row');
    row.remove();
    updateRemoveButtonsVisibility();
    calculateTotalAmount();
}

function updateRemoveButtonsVisibility() {
    const container = document.getElementById('items-list');
    const rows = container.querySelectorAll('.item-row');
    const removeButtons = container.querySelectorAll('.btn-remove');

    if (rows.length <= 1) {
        removeButtons.forEach(btn => btn.style.display = 'none');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'flex');
    }
}




function updateItemDetails(inputElement) {
    const row = inputElement.closest('.item-row');
    const itemName = inputElement.value.trim();
    if (!itemName) return;

    // FITUR: CEK BARANG DUPLIKAT
    const allItemInputs = document.querySelectorAll('input[list="stock-items-list"]');
    for (let otherInput of allItemInputs) {
        if (otherInput !== inputElement && otherInput.value.trim().toLowerCase() === itemName.toLowerCase()) {
            showAlert('⚠️ Barang ini sudah ada di daftar pesanan! Harap edit jumlahnya saja.');
            inputElement.value = '';
            row.querySelector('.item-price-display').value = formatRupiah(0);
            row.setAttribute('data-price', 0);
            calculateTotalAmount();
            return;
        }
    }

    const stock = getData('stock');
    // Cari yang namanya sama persis (case insensitive)
    const selectedItem = stock.find(item => item.name.toLowerCase() === itemName.toLowerCase());

    if (selectedItem) {
        // Jika ditemukan, paksa gunakan nama resmi agar seragam
        inputElement.value = selectedItem.name;
        const price = selectedItem.price;
        row.querySelector('.item-price-display').value = formatRupiah(price);
        row.setAttribute('data-price', price);
    } else {
        // Jika tidak ditemukan, beri peringatan dan kosongkan
        showAlert('⚠️ Barang tidak tersedia di stok barang!');
        inputElement.value = '';
        row.querySelector('.item-price-display').value = formatRupiah(0);
        row.setAttribute('data-price', 0);
    }

    calculateTotalAmount();
}



function calculateTotalAmount() {
    const rows = document.querySelectorAll('.item-row');
    let grandTotal = 0;

    rows.forEach(row => {
        const price = parseFloat(row.getAttribute('data-price') || '0');
        const qty = parseFloat(row.querySelector('input[type="number"]').value || '0');
        const subtotal = price * qty;
        grandTotal += subtotal;

        row.querySelector('.item-subtotal-display').value = formatRupiah(subtotal);
    });

    document.getElementById('total-amount').textContent = `Total: ${formatRupiah(grandTotal)}`;
}

document.getElementById('invoice-form').addEventListener('submit', function (event) {
    event.preventDefault();
    processInvoice();
});

// Tambahkan pencegah Enter di form nota
document.getElementById('invoice-form').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        const target = e.target;
        // Jika bukan di textarea atau tombol, cegah Enter mensubmit form
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
            e.preventDefault();
            return false;
        }
    }
});

function processInvoice() {
    const form = document.getElementById('invoice-form');
    const customerName = form['customer-name'].value;
    const expedition = form['expedition'].value;
    const errorDiv = document.getElementById('stock-error');
    errorDiv.textContent = ''; // Clear previous error

    // 1. Validasi Input Data Pemesan dan Ekspedisi
    if (!customerName || !expedition) {
        showAlert('Tolong input semua data Pemesan dan Ekspedisi.');
        return;
    }

    const items = [];
    const itemRows = document.querySelectorAll('.item-row');
    let grandTotal = 0;
    let isStockSufficient = true;
    const newStockUpdates = {}; // Untuk menyimpan perubahan stok jika valid

    // 2. Validasi dan Pengumpulan Data Barang
    itemRows.forEach(row => {
        const itemName = row.querySelector('input[list="stock-items-list"]').value;
        const qty = parseFloat(row.querySelector('input[type="number"]').value);
        const price = parseFloat(row.getAttribute('data-price'));

        const currentStock = getData('stock').find(s => s.name === itemName);

        if (!currentStock) {
            isStockSufficient = false;
            showAlert(`⚠️ Barang "${itemName}" tidak tersedia di program. Harap pilih dari daftar yang ada.`);
            return;
        }

        if (!itemName || qty <= 0 || isNaN(price)) {
            isStockSufficient = false;
            showAlert('Tolong lengkapi semua data barang dengan benar (Nama Barang, Jumlah, Harga).');
            return;
        }

        // Validasi Stok
        if (currentStock && currentStock.stock < qty) {
            isStockSufficient = false;
            errorDiv.textContent = `Stock barang "${itemName}" tidak mencukupi. (Stok: ${currentStock.stock})`;
            showAlert(`Stock barang "${itemName}" tidak mencukupi. (Stok: ${currentStock.stock})`);
            return;
        }

        const subtotal = qty * price;
        grandTotal += subtotal;

        items.push({
            name: itemName,
            qty: qty,
            price: price,
            subtotal: subtotal,
            unit: currentStock.unit
        });

        // Simpan update stok untuk dieksekusi setelah semua validasi
        newStockUpdates[itemName] = (newStockUpdates[itemName] || 0) + qty;
    });

    if (!isStockSufficient || items.length === 0) {
        if (items.length === 0) showAlert('Periksa kembali pesanan Anda, pastikan stock cukup dan semua field terisi.');
        return; // Hentikan proses jika stok tidak cukup atau data barang tidak lengkap
    }

    // 3. Kurangi Stok Barang
    let stock = getData('stock');

    // Kurangi stok berdasarkan item baru
    stock = stock.map(item => {
        if (newStockUpdates[item.name]) {
            item.stock -= newStockUpdates[item.name];
        }
        return item;
    });
    saveData('stock', stock);

    // 4. Simpan Nota
    const invoices = getData('invoices');
    const city = document.getElementById('customer-city').value;
    const phone = document.getElementById('customer-phone').value;

    if (editingInvoiceId !== null) {
        // MODE EDIT: Update existing invoice
        const invoiceIndex = invoices.findIndex(inv => inv.id === editingInvoiceId);

        if (invoiceIndex !== -1) {
            invoices[invoiceIndex] = {
                ...invoices[invoiceIndex],
                customer: customerName,
                city: city,
                phone: phone,
                expedition: expedition,
                items: items,
                total: grandTotal
            };

            saveData('invoices', invoices);
            showAlert(`Nota ${customerName} berhasil diperbarui!`);

            // Reset editing mode
            editingInvoiceId = null;
        } else {
            showAlert('Error: Nota yang diedit tidak ditemukan!');
            return;
        }
    } else {
        // MODE BUAT BARU: Create new invoice
        const invoiceNumber = invoices.length + 1;
        const newInvoice = {
            id: invoiceNumber,
            date: new Date().toLocaleDateString('id-ID'),
            customer: customerName,
            city: city,
            phone: phone,
            expedition: expedition,
            items: items,
            total: grandTotal
        };

        invoices.push(newInvoice);
        saveData('invoices', invoices);
        showAlert(`Pesanan ${customerName} ${newInvoice.date} berhasil disimpan!`);
    }

    // 5. Reset Form dan Kembali ke Home
    form.reset();
    document.getElementById('items-list').innerHTML = ''; // Hapus semua baris item

    // Hide cancel edit button
    document.getElementById('cancel-edit-button').style.display = 'none';
    document.getElementById('total-amount').textContent = 'Total: Rp 0';
    localStorage.removeItem('invoiceFormData'); // Hapus saved form data
    showScreen('home-screen');
}

// --- FUNGSI STOK BARANG ---

function toggleStockSort() {
    const button = document.getElementById('stock-sort-button');
    if (currentStockSortOrder === 'az') {
        currentStockSortOrder = 'za';
        button.textContent = 'Abjad Z-A';
    } else {
        currentStockSortOrder = 'az';
        button.textContent = 'Abjad A-Z';
    }
    renderStockTable();
}

function renderStockTable() {
    const stock = getData('stock');
    const tbody = document.getElementById('stock-table').querySelector('tbody');
    tbody.innerHTML = '';

    // Ambil nilai search dan filter
    const searchMode = document.getElementById('stock-search-mode') ? document.getElementById('stock-search-mode').value : 'name';
    const searchValue = document.getElementById('stock-search-input') ? document.getElementById('stock-search-input').value.toLowerCase() : '';

    // Map stok dengan index aslinya agar edit/hapus tetap akurat
    let displayStock = stock.map((item, index) => ({ ...item, originalIndex: index }));

    // 1. Filter
    if (searchValue) {
        displayStock = displayStock.filter(item => {
            if (searchMode === 'name') {
                return item.name.toLowerCase().includes(searchValue);
            } else if (searchMode === 'supplier') {
                return item.supplier.toLowerCase().includes(searchValue);
            }
            return true;
        });
    }

    // 2. Sort
    displayStock.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (currentStockSortOrder === 'az') {
            return nameA.localeCompare(nameB);
        } else {
            return nameB.localeCompare(nameA);
        }
    });

    displayStock.forEach((item, visualIndex) => {
        // Gunakan item.originalIndex untuk data-index (supaya edit/hapus tetap ke item yang benar)
        const originalIndex = item.originalIndex;

        // Hitung persentase keuntungan
        const profit = item.price - item.hpp;
        const profitPercentage = item.hpp > 0 ? ((profit / item.hpp) * 100).toFixed(2) : 0;

        const row = tbody.insertRow();

        // No (Nomor Urut Tampilan) - Gunakan visualIndex
        row.insertCell().textContent = visualIndex + 1;

        // Nama Barang (dapat diedit)
        row.insertCell().innerHTML = `<span data-field="name" data-type="text" data-index="${originalIndex}" data-editable="true">${item.name}</span>`;

        // Satuan (dapat diedit teks)
        row.insertCell().innerHTML = `<span data-field="unit" data-type="text" data-index="${originalIndex}" data-editable="true">${item.unit}</span>`;

        // Supplier (dapat diedit teks)
        row.insertCell().innerHTML = `<span data-field="supplier" data-type="text" data-index="${originalIndex}" data-editable="true">${item.supplier}</span>`;

        // Jumlah Stock (dapat diedit angka)
        row.insertCell().innerHTML = `<span data-field="stock" data-type="number" data-index="${originalIndex}" data-editable="true">${item.stock}</span>`;

        // Minimum Order
        row.insertCell().innerHTML = `<span data-field="minOrder" data-type="text" data-index="${originalIndex}" data-editable="true">${item.minOrder || ''}</span>`;

        // Minimum Stock
        row.insertCell().innerHTML = `<span data-field="minStock" data-type="number" data-index="${originalIndex}" data-editable="true">${item.minStock || 0}</span>`;

        // HPP
        row.insertCell().innerHTML = `<span data-field="hpp" data-type="currency" data-index="${originalIndex}" data-editable="true">${formatRupiah(item.hpp)}</span>`;

        // Harga Jual
        row.insertCell().innerHTML = `<span data-field="price" data-type="currency" data-index="${originalIndex}" data-editable="true">${formatRupiah(item.price)}</span>`;

        // Keuntungan
        row.insertCell().textContent = `${profitPercentage}%`;

        // Aksi
        row.insertCell().innerHTML = `<button onclick="deleteItem(${originalIndex})" class="delete-button">Hapus</button>`;
    });
}

// --- FUNGSI HAPUS BARANG ---

function deleteItem(index) {
    showConfirm('Apakah Anda yakin ingin menghapus barang ini?', () => {
        const stock = getData('stock');
        stock.splice(index, 1);
        saveData('stock', stock);
        renderStockTable();
        showAlert('Barang berhasil dihapus!');
    }, "Ya, Hapus");
}

function addItem(event) {
    event.preventDefault();
    const name = document.getElementById('new-item-name').value.trim();
    const unit = document.getElementById('new-item-unit').value.trim();
    const supplier = document.getElementById('new-item-supplier').value.trim();
    const stockQty = parseFloat(document.getElementById('new-item-stock').value) || 0;
    // minOrder is now text (string)
    const minOrder = document.getElementById('new-item-min-order').value.trim();
    const minStock = parseFloat(document.getElementById('new-item-min-stock').value) || 0;
    const hpp = parseFloat(document.getElementById('new-item-hpp').value) || 0;
    const price = parseFloat(document.getElementById('new-item-price').value) || 0;

    if (!name || !unit || !supplier || isNaN(stockQty) || isNaN(hpp) || isNaN(price) || isNaN(minStock) || stockQty < 0 || hpp < 0 || price < 0 || minStock < 0) {
        showAlert('Semua field harus diisi dengan benar!');
        return;
    }

    const stock = getData('stock');
    if (stock.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        showAlert('Barang dengan nama tersebut sudah ada!');
        return;
    }

    stock.push({ name, unit, supplier, stock: stockQty, minOrder, minStock, hpp, price });
    saveData('stock', stock);

    // Reset form
    document.getElementById('add-item-form').reset();

    // Render ulang tabel
    renderStockTable();

    showAlert('Barang berhasil ditambahkan!');
}

// Event listener untuk membuat sel tabel menjadi input (Edit Inline)
document.getElementById('stock-table').addEventListener('click', function (event) {
    const target = event.target;
    if (target.tagName === 'SPAN' && target.getAttribute('data-editable') === 'true') {
        makeEditable(target);
    }
});

function makeEditable(spanElement) {
    const field = spanElement.getAttribute('data-field');
    const type = spanElement.getAttribute('data-type');
    const index = spanElement.getAttribute('data-index');

    const stock = getData('stock');
    const item = stock[index];
    const originalValueRaw = item[field];

    // Buat elemen input
    const input = document.createElement('input');
    input.className = 'edit-input';
    input.value = originalValueRaw;
    input.type = (type === 'number' || type === 'currency') ? 'number' : 'text';
    if (input.type === 'number') {
        input.min = 0;
        input.step = "any";
    }

    // Ganti span dengan input
    spanElement.parentElement.replaceChild(input, spanElement);
    input.focus();

    // Event saat input kehilangan fokus (blur) atau Enter
    let isSaving = false;
    const saveChanges = () => {
        if (isSaving) return;
        isSaving = true;

        let newValue = input.value;
        if (type === 'number' || type === 'currency') {
            newValue = parseFloat(newValue) || 0;
            if (newValue < 0) newValue = 0;
        }

        let stock = getData('stock');
        stock[index][field] = newValue;
        saveData('stock', stock);

        // Jika parent masih ada (berarti tabel belum di-render ulang oleh sinkronisasi Firebase)
        if (input.parentElement) {
            const newSpan = document.createElement('span');
            newSpan.setAttribute('data-field', field);
            newSpan.setAttribute('data-type', type);
            newSpan.setAttribute('data-index', index);
            newSpan.setAttribute('data-editable', 'true');
            newSpan.textContent = (type === 'currency') ? formatRupiah(newValue) : newValue;

            input.parentElement.replaceChild(newSpan, input);
        }

        // Render ulang tabel (opsional jika sudah dihandle oleh onValue, tapi aman untuk memastikan)
        renderStockTable();
    };

    input.addEventListener('blur', saveChanges);
    input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur(); // Memicu event blur untuk menyimpan
        }
    });
}


function downloadStockExcel() {
    const stock = getData('stock');
    if (!stock || stock.length === 0) {
        showAlert('Tidak ada data stok untuk didownload.');
        return;
    }

    // Format data untuk Excel
    const excelData = stock.map((item, index) => ({
        'No': index + 1,
        'Nama Barang': item.name,
        'Satuan': item.unit,
        'Supplier': item.supplier,
        'Jumlah Stock': item.stock,
        'Min Order': item.minOrder,
        'Min Stock': item.minStock,
        'HPP': item.hpp,
        'Harga Jual': item.price
    }));

    // Buat worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Atur lebar kolom (opsional tapi bagus untuk estetika)
    const wscols = [
        { wch: 5 },  // No
        { wch: 30 }, // Nama Barang
        { wch: 10 }, // Satuan
        { wch: 20 }, // Supplier
        { wch: 15 }, // Jumlah Stock
        { wch: 15 }, // Min Order
        { wch: 15 }, // Min Stock
        { wch: 15 }, // HPP
        { wch: 15 }  // Harga Jual
    ];
    worksheet['!cols'] = wscols;

    // Buat workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stok Barang");

    // Download file
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Data_Stok_Bermi_${date}.xlsx`);
}

function saveFormData() {
    const formData = {
        customerName: document.getElementById('customer-name').value,
        expedition: document.getElementById('expedition').value,
        date: document.getElementById('invoice-date').value,
        items: []
    };

    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const itemNameInput = row.querySelector('input[list="stock-items-list"]');
        const itemName = itemNameInput ? itemNameInput.value : '';
        const qtyInput = row.querySelector('input[name^="item-qty-"]');
        const qty = qtyInput ? qtyInput.value : 0;
        formData.items.push({ itemName, qty });
    });

    localStorage.setItem('invoiceFormData', JSON.stringify(formData));
}

function restoreFormData() {
    const savedData = localStorage.getItem('invoiceFormData');
    if (!savedData) {
        // Jika tidak ada saved, set default
        const today = new Date();
        const dateStr = today.toLocaleDateString('id-ID');
        document.getElementById('invoice-date').value = dateStr;
        addItemRow();
        return;
    }

    const formData = JSON.parse(savedData);
    document.getElementById('customer-name').value = formData.customerName || '';
    document.getElementById('expedition').value = formData.expedition || '';
    document.getElementById('invoice-date').value = formData.date || '';

    // Update customer details
    updateCustomerDetails();

    // Clear existing rows
    const container = document.getElementById('items-list');
    container.innerHTML = '';

    // Add saved rows
    formData.items.forEach(item => {
        addItemRow();
        const lastRow = container.lastElementChild;
        const input = lastRow.querySelector('input[list="stock-items-list"]');
        if (input) {
            input.value = item.itemName;
            lastRow.querySelector('input[name^="item-qty-"]').value = item.qty;
            updateItemDetails(input);
        }
    });

    // Jika tidak ada items, add satu
    if (formData.items.length === 0) {
        addItemRow();
    }
}

// --- FUNGSI DATA PELANGGAN ---

function toggleCustomerSort() {
    const button = document.getElementById('customer-sort-button');
    if (currentCustomerSortOrder === 'az') {
        currentCustomerSortOrder = 'za';
        button.textContent = 'Abjad Z-A';
    } else {
        currentCustomerSortOrder = 'az';
        button.textContent = 'Abjad A-Z';
    }
    renderCustomerTable();
}

function renderCustomerTable() {
    const customers = getData('customers');
    const tbody = document.getElementById('customer-table').querySelector('tbody');
    tbody.innerHTML = '';

    const searchValue = document.getElementById('customer-search-input') ? document.getElementById('customer-search-input').value.toLowerCase() : '';

    // Convert object to array for sorting/filtering
    let customerList = [];
    for (const key in customers) {
        customerList.push({ key: key, ...customers[key] });
    }

    // 1. Filter
    if (searchValue) {
        customerList = customerList.filter(c => {
            const name = (c.name || c.key.split(' (')[0]).toLowerCase();
            return name.includes(searchValue);
        });
    }

    // 2. Sort
    customerList.sort((a, b) => {
        const nameA = (a.name || a.key.split(' (')[0]).toLowerCase();
        const nameB = (b.name || b.key.split(' (')[0]).toLowerCase();
        if (currentCustomerSortOrder === 'az') {
            return nameA.localeCompare(nameB);
        } else {
            return nameB.localeCompare(nameA);
        }
    });

    customerList.forEach(customer => {
        const row = tbody.insertRow();
        // Fallback: Jika data lama tidak punya properti .name, ambil dari .key
        const displayName = customer.name || customer.key.split(' (')[0];
        const displayCity = customer.city || "";
        const displayPhone = customer.phone || "";

        row.insertCell().textContent = displayName;
        row.insertCell().textContent = displayCity;
        row.insertCell().textContent = displayPhone;
        row.insertCell().textContent = customer.expedition || '';
        row.insertCell().textContent = customer.note || '';
        row.insertCell().innerHTML = `<button onclick="deleteCustomer('${customer.key}')" class="delete-button">Hapus</button>`;
    });
}


function addCustomer(event) {
    event.preventDefault();
    const name = document.getElementById('new-customer-name').value.trim();
    const city = document.getElementById('new-customer-city').value.trim();
    const phone = document.getElementById('new-customer-phone').value.trim();
    const expedition = document.getElementById('new-customer-expedition').value.trim();
    const note = document.getElementById('new-customer-note').value.trim();

    if (!name || !city || !phone || !expedition) {
        showAlert('Semua field utama harus diisi!');
        return;
    }

    const customers = getData('customers');

    // Fitur: Cek Duplikat Persis (Nama, Kota, HP)
    const isExactDuplicate = Object.values(customers).some(c =>
        c.name === name && c.city === city && c.phone === phone && c.expedition === expedition
    );

    if (isExactDuplicate) {
        showAlert('⚠️ Pelanggan dengan detail yang sama persis sudah ada!');
        return;
    }

    // Gunakan compound key (Nama + Kota + HP) agar benar-benar unik
    const customerKey = `${name} (${city}) - HP: ${phone}`;

    // Simpan data
    customers[customerKey] = { name, city, phone, expedition, note };
    saveData('customers', customers);

    document.getElementById('add-customer-form').reset();
    renderCustomerTable();
    showAlert('Pelanggan berhasil ditambahkan!');
}

function deleteCustomer(key) {
    // Extract name from compound key (format: "Name (City) - HP: phone")
    const displayName = key.split(' (')[0];

    showConfirm(`Apakah Anda yakin ingin menghapus pelanggan "${displayName}"?`, () => {
        const customers = getData('customers');
        delete customers[key];
        saveData('customers', customers);
        renderCustomerTable();
        showAlert('Pelanggan berhasil dihapus!');
    }, "Ya, Hapus");
}

// --- FUNGSI DATA SUPPLIER ---

function toggleSupplierSort() {
    const button = document.getElementById('supplier-sort-button');
    if (currentSupplierSortOrder === 'az') {
        currentSupplierSortOrder = 'za';
        button.textContent = 'Abjad Z-A';
    } else {
        currentSupplierSortOrder = 'az';
        button.textContent = 'Abjad A-Z';
    }
    renderSupplierTable();
}

function renderSupplierTable() {
    const suppliers = getData('suppliers');
    const tbody = document.getElementById('supplier-table').querySelector('tbody');
    tbody.innerHTML = '';

    const searchValue = document.getElementById('supplier-search-input') ? document.getElementById('supplier-search-input').value.toLowerCase() : '';

    let supplierList = [];
    for (const key in suppliers) {
        supplierList.push({ key: key, ...suppliers[key] });
    }

    if (searchValue) {
        supplierList = supplierList.filter(s => {
            const name = (s.name || s.key.split(' (')[0]).toLowerCase();
            return name.includes(searchValue);
        });
    }

    supplierList.sort((a, b) => {
        const nameA = (a.name || a.key.split(' (')[0]).toLowerCase();
        const nameB = (b.name || b.key.split(' (')[0]).toLowerCase();
        if (currentSupplierSortOrder === 'az') {
            return nameA.localeCompare(nameB);
        } else {
            return nameB.localeCompare(nameA);
        }
    });

    supplierList.forEach(supplier => {
        const row = tbody.insertRow();
        const displayName = supplier.name || supplier.key.split(' (')[0];

        row.insertCell().textContent = displayName;
        row.insertCell().textContent = supplier.phone || "";
        row.insertCell().textContent = supplier.address || "";
        row.insertCell().textContent = supplier.note || '';
        row.insertCell().innerHTML = `<button onclick="deleteSupplier('${supplier.key}')" class="delete-button">Hapus</button>`;
    });
}

function addSupplier(event) {
    event.preventDefault();
    const name = document.getElementById('new-supplier-name').value.trim();
    const phone = document.getElementById('new-supplier-phone').value.trim();
    const address = document.getElementById('new-supplier-address').value.trim();
    const note = document.getElementById('new-supplier-note').value.trim();

    if (!name || !phone || !address) {
        showAlert('Nama, No HP, dan Alamat harus diisi!');
        return;
    }

    const suppliers = getData('suppliers');

    const isExactDuplicate = Object.values(suppliers).some(s =>
        s.name === name && s.phone === phone && s.address === address
    );

    if (isExactDuplicate) {
        showAlert('⚠️ Supplier dengan detail yang sama persis sudah ada!');
        return;
    }

    const supplierKey = `${name} (${address}) - HP: ${phone}`;
    suppliers[supplierKey] = { name, phone, address, note };
    saveData('suppliers', suppliers);

    document.getElementById('add-supplier-form').reset();
    renderSupplierTable();
    showAlert('Supplier berhasil ditambahkan!');
}

function deleteSupplier(key) {
    // Extract name from compound key (format: "Name (Address) - HP: phone")
    const displayName = key.split(' (')[0];

    showConfirm(`Apakah Anda yakin ingin menghapus supplier "${displayName}"?`, () => {
        const suppliers = getData('suppliers');
        delete suppliers[key];
        saveData('suppliers', suppliers);
        renderSupplierTable();
        showAlert('Supplier berhasil dihapus!');
    }, "Ya, Hapus");
}

// --- FUNGSI PRINT NOTA ---

function toggleSort() {
    const button = document.getElementById('sort-toggle');
    if (currentSortOrder === 'newest') {
        currentSortOrder = 'oldest';
        button.textContent = 'Urutkan: Terlama';
    } else {
        currentSortOrder = 'newest';
        button.textContent = 'Urutkan: Terbaru';
    }
    renderInvoicesList();
}

function renderInvoicesList() {
    const invoices = getData('invoices');
    // Urutkan berdasarkan sortOrder
    const sortedInvoices = [...invoices].sort((a, b) => {
        if (currentSortOrder === 'newest') {
            return b.id - a.id; // ID terbesar dulu
        } else {
            return a.id - b.id; // ID terkecil dulu
        }
    });

    const listDiv = document.getElementById('invoices-list');
    listDiv.innerHTML = '';

    sortedInvoices.forEach(invoice => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'invoice-item';

        const button = document.createElement('button');
        button.className = 'invoice-button';
        button.textContent = `${invoice.customer} - ${invoice.date}`;
        button.onclick = () => toggleInvoiceDetail(invoice.id, itemDiv);

        const detailDiv = document.createElement('div');
        detailDiv.className = 'invoice-detail';
        detailDiv.style.display = 'none';

        itemDiv.appendChild(button);
        itemDiv.appendChild(detailDiv);
        listDiv.appendChild(itemDiv);
    });
}

// --- GANTI FUNGSI INI DI SCRIPT.JS ---

// --- GANTI TOTAL FUNGSI deleteInvoice DENGAN INI ---

// Redundansi dihapus

// --- FUNGSI PRINT PDF (UPDATE UTAMA) ---

function printToPDF(invoiceId) {
    const { jsPDF } = window.jspdf;

    const invoices = getData('invoices') || [];
    const invoice = invoices.find(inv => inv.id === invoiceId);

    if (!invoice) {
        alert("Data nota tidak ditemukan!");
        return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const img = new Image();
    img.src = 'NOTA.png';

    img.onload = function () {
        const ITEMS_PER_PAGE = 17;
        const totalItems = invoice.items.length;

        for (let i = 0; i < totalItems; i += ITEMS_PER_PAGE) {
            if (i > 0) {
                doc.addPage();
            }

            // 1. GAMBAR BACKGROUND
            doc.addImage(img, 'PNG', 0, 0, 210, 297);

            const pageNumber = Math.floor(i / ITEMS_PER_PAGE) + 1;
            const pageItems = invoice.items.slice(i, i + ITEMS_PER_PAGE);

            // ============================================
            // HEADER (KOORDINAT ASLI)
            // ============================================
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);

            doc.text(`${invoice.date}`, 125, 34);
            const cleanCustomerName = invoice.customer.split(' (')[0];
            doc.text(`${cleanCustomerName}`, 125, 42);
            doc.text(`${invoice.city}`, 125, 51);
            doc.text(`${pageNumber}`, 70, 51);

            // ============================================
            // ISI TABEL & SUB TOTAL PER HALAMAN
            // ============================================
            let startY = 77;
            const lineHeight = 10.55;
            let subtotalPerHalaman = 0;

            doc.setFontSize(12);

            pageItems.forEach((item, index) => {
                const globalIndex = i + index + 1;
                subtotalPerHalaman += item.subtotal;

                let unitLabel = item.unit;
                if (!unitLabel) {
                    const allStock = getData('stock') || [];
                    const stockItem = allStock.find(s => s.name === item.name);
                    unitLabel = stockItem ? stockItem.unit : '';
                }
                const qtyDisplay = `${item.qty} ${unitLabel}`;

                doc.text(`${globalIndex}`, 11, startY, { align: "center" });
                doc.text(item.name, 50, startY);

                // Kecilkan font khusus untuk QTY agar muat
                doc.setFontSize(11);
                doc.text(qtyDisplay, 17, startY);
                doc.setFontSize(12);

                doc.text(formatRupiahSimple(item.price), 153, startY, { align: "right" });
                doc.text(formatRupiahSimple(item.subtotal), 191, startY, { align: "right" });

                startY += lineHeight;
            });

            // ============================================
            // BAGIAN TOTAL
            // ============================================
            doc.setFont("helvetica", "bold");

            // 1. Angka Subtotal Halaman (Selalu muncul di posisi asli)
            doc.setFontSize(15);
            doc.text(formatRupiahSimple(subtotalPerHalaman), 192, 258, { align: "right" });

            // 2. Jika Halaman Terakhir, Munculkan Total Keseluruhan di bawahnya
            if (i + ITEMS_PER_PAGE >= totalItems) {
                doc.setFontSize(16);
                doc.text("TOTAL RP:", 160, 270, { align: "right" }); // Label Total

                doc.setFontSize(16);
                doc.text(formatRupiahSimple(invoice.total), 192, 270, { align: "right" }); // Angka Total digeser ke kanan
            }
        }

        doc.save(`Nota-${invoice.customer}-${invoice.date}.pdf`);
    };

    img.onerror = function () {
        alert("Gagal memuat gambar NOTA.png.");
    };
}

function formatRupiahSimple(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

// Helper kecil untuk menghilangkan 'Rp' dan ',00' agar muat di kolom kecil
function formatRupiahSimple(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

// --- FUNGSI BANTUAN ---

// Mengubah angka menjadi Romawi (1 -> I, 2 -> II)
function toRoman(num) {
    if (typeof num !== 'number') return num;
    const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let roman = '', i;
    for (i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

// Format Rupiah Simpel untuk PDF (tanpa Rp, pakai titik)
function formatRupiahSimple(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

// --- FUNGSI BARU: HAPUS NOTA DAN KEMBALIKAN STOK ---

// --- GANTI FUNGSI INI ---

// --- GANTI FUNGSI deleteInvoice DENGAN INI ---

function editInvoice(invoiceId) {
    const invoices = getData('invoices');
    const invoice = invoices.find(inv => inv.id === invoiceId);

    if (!invoice) {
        showAlert('Nota tidak ditemukan!');
        return;
    }

    // Set editing mode
    editingInvoiceId = invoiceId;

    // Navigate to create-invoice screen
    showScreen('create-invoice');

    // Populate form with invoice data
    const form = document.getElementById('invoice-form');
    form['customer-name'].value = invoice.customer;
    document.getElementById('customer-city').value = invoice.city || '';
    document.getElementById('customer-phone').value = invoice.phone || '';
    form['expedition'].value = invoice.expedition;

    // Update customer details display
    updateCustomerDetails();

    // Clear existing item rows
    document.getElementById('items-list').innerHTML = '';
    itemRowCounter = 0;

    // Add item rows with invoice data
    invoice.items.forEach(item => {
        addItemRow();
        const lastRow = document.getElementById('items-list').lastElementChild;
        const itemInput = lastRow.querySelector('input[list="stock-items-list"]');
        const qtyInput = lastRow.querySelector('input[type="number"]');

        itemInput.value = item.name;
        qtyInput.value = item.qty;

        // Set price data attribute
        lastRow.setAttribute('data-price', item.price);

        // Update item details to populate unit and subtotal
        updateItemDetails(itemInput);
    });

    // Calculate total
    calculateTotalAmount();

    // Show cancel edit button
    document.getElementById('cancel-edit-button').style.display = 'inline-block';

    showAlert('Mode Edit Nota: Silakan ubah data yang diperlukan, lalu klik "Pesanan Selesai" untuk menyimpan perubahan.');
}

function cancelEdit() {
    showConfirm('Apakah Anda yakin ingin membatalkan edit nota?', () => {
        // Reset editing mode
        editingInvoiceId = null;

        // Hide cancel button
        document.getElementById('cancel-edit-button').style.display = 'none';

        // Clear form
        const form = document.getElementById('invoice-form');
        form.reset();
        document.getElementById('items-list').innerHTML = '';
        addItemRow();
        calculateTotalAmount();

        showAlert('Edit nota dibatalkan.');
    }, 'Ya, Batalkan');
}

function deleteInvoice(invoiceId) {
    const invoices = getData('invoices');
    const invoiceIndex = invoices.findIndex(inv => inv.id === invoiceId);

    if (invoiceIndex === -1) {
        showAlert('Nota tidak ditemukan!');
        return;
    }

    const invoice = invoices[invoiceIndex];

    showConfirm(`Apakah Anda yakin ingin menghapus nota milik ${invoice.customer}?`, () => {
        invoices.splice(invoiceIndex, 1);
        saveData('invoices', invoices);
        renderInvoicesList();

        try {
            const detailView = document.getElementById('invoice-detail-view');
            if (detailView) detailView.innerHTML = 'Pilih nota untuk melihat detail.';
        } catch (e) { }

        showAlert('Nota berhasil dihapus!');
    }, "Ya, Hapus");
}


function toggleInvoiceDetail(invoiceId, itemDiv) {
    const detailDiv = itemDiv.querySelector('.invoice-detail');
    const isVisible = detailDiv.style.display !== 'none';

    // Hide all other details
    document.querySelectorAll('.invoice-detail').forEach(div => div.style.display = 'none');

    if (!isVisible) {
        const invoices = getData('invoices');
        const invoice = invoices.find(inv => inv.id === invoiceId);
        const detailDiv = itemDiv.querySelector('.invoice-detail');

        if (!invoice) {
            detailDiv.innerHTML = 'Nota tidak ditemukan.';
            return;
        }

        // Generate content
        let detailContent = generateInvoiceContent(invoice);

        // Di dalam function showInvoiceDetail(invoiceId) di script.js

        // ... (kode sebelumnya tetap sama)

        detailDiv.innerHTML = `
    <div class="detail-view">
        <pre>${detailContent}</pre>
        <div class="detail-buttons">
            <button class="print-button" onclick="printToPDF(${invoice.id})">Download Nota PDF</button>
            <button class="edit-button" onclick="editInvoice(${invoice.id})">Edit Nota</button>
            <button class="delete-button" onclick="deleteInvoice(${invoice.id})">Hapus Nota</button>
        </div>
    </div>
`;
        detailDiv.style.display = 'block';
    }
}

function generateInvoiceContent(invoice) {
    return `
Tanggal: ${invoice.date}
---
DATA PEMESAN
Nama: ${invoice.customer}
Kota: ${invoice.city}
No. HP: ${invoice.phone}
Ekspedisi: ${invoice.expedition}

DETAIL BARANG
| No | Nama Barang | Qty | Harga Satuan | Jumlah |
${invoice.items.map((item, index) =>
        `| ${index + 1} | ${item.name} | ${item.qty} | ${formatRupiah(item.price)} | ${formatRupiah(item.subtotal)} |`
    ).join('\n')}

TOTAL AKHIR: ${formatRupiah(invoice.total)}
`;
}


// --- INISIALISASI ---
// Inisialisasi sekarang ditangani oleh onAuthStateChanged di bagian atas script


// --- FUNGSI IMPORT EXCEL ---

function updateFileName() {
    const input = document.getElementById('excel-input');
    const display = document.getElementById('file-name-display');
    if (input.files && input.files.length > 0) {
        display.textContent = input.files[0].name;
        display.style.color = '#334155'; // Darker text when selected
    } else {
        display.textContent = 'Pilih File Excel Anda...';
        display.style.color = '#64748b'; // Gray text when empty
    }
}

function handleExcelUpload() {
    const input = document.getElementById('excel-input');
    if (!input.files || input.files.length === 0) {
        showAlert('Silakan pilih file Excel terlebih dahulu!');
        return;
    }

    const file = input.files[0];

    // Cek apakah library XLSX sudah terload
    if (typeof XLSX === 'undefined') {
        showAlert('Library Excel belum siap. Mohon refresh halaman dan tunggu sebentar (pastikan internet aktif).');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Ambil sheet pertama
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Konversi ke JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (jsonData.length === 0) {
                showAlert('File Excel kosong atau tidak terbaca.');
                return;
            }

            processExcelData(jsonData);
        } catch (error) {
            console.error('Error reading Excel:', error);
            showAlert('Gagal membaca file Excel. Pastikan format file benar (.xlsx atau .xls).');
        }
    };

    reader.readAsArrayBuffer(file);
}

function processExcelData(data) {
    let stock = getData('stock') || [];
    let updatedCount = 0;
    let addedCount = 0;
    let skippedCount = 0;

    // Helper: Normalisasi Key (Hapus spasi, lowercase, simbol) untuk pencarian kolom
    const normalizeKey = (key) => key.toString().replace(/[\s_\-]+/g, '').toLowerCase();

    // Mapping Keyword yang dicari
    const KEYWORDS = {
        name: ['namabarang', 'nama', 'name', 'barang', 'item', 'produk', 'description', 'keterangan', 'obat'],

        stock: ['jumlahstok', 'jumlahstock', 'stok', 'stock', 'jumlah', 'qty', 'quantity', 'sisa', 'stokakhir'],
        price: ['hargajual', 'harga', 'price', 'jual', 'hargajual'],
        hpp: ['hargabeli', 'hpp', 'modal', 'beli', 'hargabeli', 'pokok'],
        unit: ['satuan', 'unit', 'uom', 'pcs'],
        supplier: ['suplier', 'supplier', 'vendor', 'pabrik', 'distributor'],
        minStock: ['minstock', 'minimumstock', 'stokminimal', 'stokmin'],
        minOrder: ['minorder', 'minimumorder', 'orderminimal']
    };

    // Cari key aktual dari row header dengan prioritas
    const findActualKey = (row, type) => {
        const rowKeys = Object.keys(row);
        const candidates = KEYWORDS[type];

        // Prioritas 1: Exact Normalized Match
        for (const candidate of candidates) {
            const exactMatch = rowKeys.find(k => normalizeKey(k) === candidate);
            if (exactMatch) return exactMatch;
        }

        // Prioritas 2: Partial Match
        for (const candidate of candidates) {
            const partialMatch = rowKeys.find(k => normalizeKey(k).includes(candidate));
            if (partialMatch) return partialMatch;
        }
        return null;
    };

    data.forEach((row) => {
        const nameKey = findActualKey(row, 'name');

        // Skip jika tidak ada kolom nama atau nama kosong
        if (!nameKey || !row[nameKey] || row[nameKey].toString().trim() === "") {
            // Log for debugging if name column is missing
            if (!nameKey && skippedCount === 0) {
                console.warn("Kolom 'Nama Barang' tidak ditemukan. Harap pastikan header Excel mengandung salah satu dari: " + KEYWORDS.name.join(", "));
            }
            skippedCount++;
            return;
        }


        const itemName = row[nameKey].toString().trim();

        // Ambil Value
        const getVal = (type) => {
            const key = findActualKey(row, type);
            if (!key) return undefined;

            let val = row[key];
            if (val === undefined || val === null || val === '') {
                return (type === 'minOrder') ? '0' : 0;
            }

            // Kolom teks
            if (type === 'minOrder' || type === 'unit' || type === 'supplier') {
                return val.toString().trim();
            }

            // Kolom angka
            if (typeof val === 'string') {
                val = val.replace(/[Rp.\s]/g, '').replace(/,/g, '.'); // Ganti koma dengan titik untuk parsing float
            }
            return parseFloat(val) || 0;
        };

        const itemStock = getVal('stock');
        const itemPrice = getVal('price');
        const itemHpp = getVal('hpp');
        const itemMinStock = getVal('minStock');
        const itemMinOrder = getVal('minOrder');
        const itemUnit = getVal('unit');
        const itemSupplier = getVal('supplier');

        const existingItemIndex = stock.findIndex(item => item.name.trim().toLowerCase() === itemName.toLowerCase());

        if (existingItemIndex > -1) {
            const current = stock[existingItemIndex];
            stock[existingItemIndex] = {
                ...current,
                stock: itemStock !== undefined ? itemStock : current.stock,
                minStock: itemMinStock !== undefined ? itemMinStock : current.minStock,
                minOrder: itemMinOrder !== undefined ? itemMinOrder : current.minOrder,
                price: itemPrice !== undefined && itemPrice > 0 ? itemPrice : current.price,
                hpp: itemHpp !== undefined && itemHpp > 0 ? itemHpp : current.hpp,
                unit: itemUnit !== undefined ? itemUnit : current.unit,
                supplier: itemSupplier !== undefined ? itemSupplier : current.supplier
            };
            updatedCount++;
        } else {
            stock.push({
                name: itemName,
                stock: itemStock !== undefined ? itemStock : 0,
                minStock: itemMinStock !== undefined ? itemMinStock : 0,
                minOrder: itemMinOrder !== undefined ? itemMinOrder : '0',
                price: itemPrice !== undefined ? itemPrice : 0,
                hpp: itemHpp !== undefined ? itemHpp : 0,
                unit: itemUnit !== undefined ? itemUnit : 'Pcs',
                supplier: itemSupplier !== undefined ? itemSupplier : '-'
            });
            addedCount++;
        }
    });

    saveData('stock', stock);
    renderStockTable();

    let msg = `Proses Selesai!\n==================\nUpdate: ${updatedCount}\nBaru: ${addedCount}`;
    if (skippedCount > 0) msg += `\nBaris Dilewati: ${skippedCount}`;

    showAlert(msg);
    document.getElementById('excel-input').value = '';
    updateFileName(); // Panggil ini agar teks label mereset
}

// Attach functions to window for access from HTML
window.showScreen = showScreen;
window.updateCustomerDetails = updateCustomerDetails;
window.addItemRow = addItemRow;
window.processInvoice = processInvoice;
window.addItem = addItem;
window.toggleStockSort = toggleStockSort;
window.handleExcelUpload = handleExcelUpload;
window.renderStockTable = renderStockTable;
window.updateFileName = updateFileName;
window.downloadStockExcel = downloadStockExcel;
window.addCustomer = addCustomer;
window.toggleCustomerSort = toggleCustomerSort;
window.renderCustomerTable = renderCustomerTable;
window.toggleSort = toggleSort;
window.closeModal = closeModal;
window.removeItemRow = removeItemRow;
window.updateItemDetails = updateItemDetails;
window.deleteItem = deleteItem;
window.deleteCustomer = deleteCustomer;
window.toggleInvoiceDetail = toggleInvoiceDetail;
window.deleteInvoice = deleteInvoice;
window.editInvoice = editInvoice;
window.cancelEdit = cancelEdit;
window.printToPDF = printToPDF;
window.calculateTotalAmount = calculateTotalAmount;
window.loadCustomerOptions = loadCustomerOptions;
window.loadStockDatalist = loadStockDatalist;
window.addSupplier = addSupplier;
window.deleteSupplier = deleteSupplier;
window.toggleSupplierSort = toggleSupplierSort;
window.renderSupplierTable = renderSupplierTable;