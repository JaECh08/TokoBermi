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
// Disabled - using try-catch instead
// window.onerror = function (msg, url, line) {
//     alert("ERROR SYSTEM: " + msg + "\nBaris: " + line);
// };
window.onerror = function (msg, url, line, col, error) {
    console.error("Global Error:", msg, "at line", line, "col", col);
    console.error("Error object:", error);
    // Don't show alert - let try-catch handle it
    return true; // Prevent default error handling
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
    invoices: [],
    incoming: [],
    outgoing: []
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

            // Removed loading message as requested


            try {
                await auth.signInWithEmailAndPassword(email, pass);
            } catch (error) {
                console.error("Login Error:", error.code);
                if (errorMsg) {
                    errorMsg.style.color = "#ef4444"; // Modern red
                    let userMsg = "Email atau Password salah. Silakan coba lagi.";
                    if (error.code === 'auth/network-request-failed') {
                        userMsg = "Koneksi internet bermasalah. Cek koneksi Anda.";
                    }
                    errorMsg.textContent = userMsg;
                }
            }
        };
    } else {
        setTimeout(setupLogin, 500);
    }
};
// Initial Login Setup Call
setupLogin();

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('login-password');
    const eyeIcon = document.getElementById('eye-icon');

    if (passwordInput && eyeIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.textContent = '👁'; // Standard eye
        } else {
            passwordInput.type = 'password';
            eyeIcon.textContent = '👁'; // Keep same or use slash if preferred, but user wants "mata biasa"
        }
    }
}
window.togglePasswordVisibility = togglePasswordVisibility;

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

    // Sync Incoming Goods
    db.ref('incoming').on('value', (snapshot) => {
        dbData.incoming = snapshot.val() || [];
        syncUI();
    });

    // Sync Outgoing Goods
    db.ref('outgoing').on('value', (snapshot) => {
        dbData.outgoing = snapshot.val() || [];
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
    if (activeScreen.id === 'home-screen') {
        updateDashboardStats();
    }
    if (activeScreen.id === 'incoming-goods') renderIncomingTable();
    if (activeScreen.id === 'outgoing-goods') renderOutgoingTable();
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

// Handle Back to Top Button Visibility
function handleBackToTopButton() {
    const container = document.querySelector('.content-container');
    const backToTopBtn = document.getElementById('backToTopBtn');
    const stockFooter = document.querySelector('.stock-footer-actions');

    if (!container || !backToTopBtn) return;

    container.addEventListener('scroll', function () {
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;

        // Show button when scrolled down more than 300px
        if (scrollTop > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }

        // Check if user is near the bottom (within 200px of bottom)
        const isNearBottom = (scrollHeight - scrollTop - clientHeight) < 200;

        if (stockFooter && isNearBottom) {
            // When near bottom, make button static (not floating)
            backToTopBtn.style.position = 'static';
            backToTopBtn.style.float = 'right';
            backToTopBtn.style.marginTop = '0';
            backToTopBtn.style.marginLeft = '15px';
            backToTopBtn.style.bottom = '';
            backToTopBtn.style.right = '';
        } else {
            // When scrolling normally, make button fixed (floating)
            backToTopBtn.style.position = 'fixed';
            backToTopBtn.style.float = 'none';
            backToTopBtn.style.bottom = '30px';
            backToTopBtn.style.right = '30px';
            backToTopBtn.style.marginTop = '';
            backToTopBtn.style.marginLeft = '';
        }
    });
}

// Initialize back to top button handler when page loads
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(handleBackToTopButton, 500);
});


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

    const inSnap = await db.ref('incoming').once('value');
    if (!inSnap.exists()) {
        saveData('incoming', []);
    }

    const outSnap = await db.ref('outgoing').once('value');
    if (!outSnap.exists()) {
        saveData('outgoing', []);
    }
}


function formatRupiah(number) {
    return 'Rp ' + (new Intl.NumberFormat('id-ID').format(number));
}

function saveDraftInvoice() {
    const form = document.getElementById('invoice-form');
    const draft = {
        customerName: document.getElementById('customer-search-input').value,
        expedition: form['expedition'].value,
        items: []
    };

    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const itemName = row.querySelector('.item-search-input').value;
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
        document.getElementById('customer-search-input').value = draft.customerName;
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
        const input = lastRow.querySelector('.item-search-input');
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

    // SCROLL TO TOP FIX
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) {
        contentContainer.scrollTop = 0;
    }

    // 3. Load Specific Data
    if (screenId === 'create-invoice') {
        try {
            // loadCustomerOptions(); // Replaced
            setupCustomerAutocomplete(); // Initialize autocomplete
            loadStockDatalist();
            updateInvoiceDate(); // Update tanggal nota
            restoreFormData();
            updateCustomerDetails();
            calculateTotalAmount();
        } catch (error) {
            console.error('Error saat membuka halaman Buat Nota:', error);
            showAlert('Error saat membuka halaman: ' + error.message);
        }
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
    } else if (screenId === 'home-screen') {
        updateDashboardStats();
    } else if (screenId === 'incoming-goods') {
        document.getElementById('incoming-date').valueAsDate = new Date();
        setupGeneralAutocomplete('incoming-item-name', 'incoming-item-dropdown', (item) => {
            document.getElementById('incoming-supplier').value = item.supplier || '';
        });
        renderIncomingTable();
    } else if (screenId === 'outgoing-goods') {
        document.getElementById('outgoing-date').valueAsDate = new Date();
        setupGeneralAutocomplete('outgoing-item-name', 'outgoing-item-dropdown');
        renderOutgoingTable();
    }
}

// --- UPDATE DASHBOARD STATISTICS ---
function updateDashboardStats() {
    const stock = getData('stock') || [];
    const customers = getData('customers') || {};
    const invoices = getData('invoices') || [];

    // Count total products
    const totalProducts = stock.length;

    // Count total customers
    const totalCustomers = Object.keys(customers).length;

    // Count total transactions
    const totalTransactions = invoices.length;

    // Update DOM with animation
    animateNumber('total-products', totalProducts);
    animateNumber('total-customers', totalCustomers);
    animateNumber('total-transactions', totalTransactions);
}

// Animate number counting effect
function animateNumber(elementId, targetNumber) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const duration = 1000; // 1 second
    const startNumber = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(startNumber + (targetNumber - startNumber) * easeOutQuart);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = targetNumber;
        }
    }

    requestAnimationFrame(update);
}

window.updateDashboardStats = updateDashboardStats;


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

// function loadCustomerOptions() { ... } // Replaced by custom autocomplete
function setupCustomerAutocomplete() {
    const input = document.getElementById('customer-search-input');
    const hiddenInput = document.getElementById('customer-key');
    const dropdown = document.getElementById('customer-dropdown');

    if (!input || !dropdown) return;

    let currentFocus = -1;

    input.addEventListener('input', function () {
        const val = this.value;
        const customers = getData('customers');

        dropdown.innerHTML = '';
        currentFocus = -1;
        hiddenInput.value = ''; // Reset key on type

        if (!val) {
            dropdown.classList.remove('show');
            return;
        }

        let matchCount = 0;
        const keys = Object.keys(customers).sort();

        keys.forEach(key => {
            const cust = customers[key];
            // Sanitasi: Pastikan name tidak berisi format key (terkadang data lama error)
            let cleanName = cust.name;
            if (!cleanName || (cleanName.includes('(') && cleanName.includes(') - HP:'))) {
                cleanName = key.split(' (')[0];
            }

            // Search ONLY in Name as requested
            const searchStr = cleanName.toLowerCase();

            if (searchStr.includes(val.toLowerCase())) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'dropdown-item';

                const regex = new RegExp(`(${val})`, 'gi');
                const nameHtml = cleanName.replace(regex, '<span class="match-text">$1</span>');

                itemDiv.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600;">${nameHtml}</span>
                        <span style="font-size:0.8rem; color:gray;">${cust.city} - ${cust.phone}</span>
                    </div>
                `;

                itemDiv.addEventListener('click', function () {
                    input.value = cleanName; // Show only CLEAN name
                    hiddenInput.value = key;
                    closeAllDropdowns();
                    updateCustomerDetails(key);
                });

                dropdown.appendChild(itemDiv);
                matchCount++;
            }
        });

        if (matchCount > 0) {
            dropdown.classList.add('show');
        } else {
            dropdown.classList.remove('show');
        }
    });

    input.addEventListener('keydown', function (e) {
        let x = dropdown.querySelectorAll('.dropdown-item');
        if (e.keyCode == 40) { // Down
            currentFocus++;
            addActive(x);
        } else if (e.keyCode == 38) { // Up
            currentFocus--;
            addActive(x);
        } else if (e.keyCode == 13) { // Enter
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add('focused');
        x[currentFocus].scrollIntoView({ block: 'nearest' });
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove('focused');
        }
    }
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

function updateCustomerDetails(providedKey) {
    try {
        let key = providedKey;

        // If no key provided (manual type), try to find by hidden input or exact name match
        if (!key) {
            const customerKeyInput = document.getElementById('customer-key');
            if (customerKeyInput) {
                key = customerKeyInput.value;
            }
        }

        const customers = getData('customers');

        // If still no key, try to find by text if exact match exists (fallback)
        if (!key) {
            const customerSearchInput = document.getElementById('customer-search-input');
            if (customerSearchInput) {
                const nameVal = customerSearchInput.value.trim();
                if (nameVal) {
                    key = Object.keys(customers).find(k => {
                        const cName = customers[k].name;
                        return cName && cName.toLowerCase() === nameVal.toLowerCase();
                    });
                }
            }
        }

        const cityInput = document.getElementById('customer-city');
        const phoneInput = document.getElementById('customer-phone');
        const expeditionInput = document.getElementById('expedition');

        if (key && customers[key]) {
            if (cityInput) cityInput.value = customers[key].city || '';
            if (phoneInput) phoneInput.value = customers[key].phone || '';
            if (expeditionInput) expeditionInput.value = customers[key].expedition || '';
        }
    } catch (error) {
        console.error('Error di updateCustomerDetails:', error);
        // Silent fail - tidak perlu alert karena ini bukan critical error
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
        <div class="form-group" style="position: relative;">
            <label>Nama Barang:</label>
            <div class="autocomplete-wrapper">
                <input type="text" name="item-name-${itemRowCounter}" placeholder="Cari barang..." required autocomplete="off" class="item-search-input">
                <div class="custom-dropdown" id="dropdown-${itemRowCounter}"></div>
            </div>
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

    // Initialize custom autocomplete
    const input = row.querySelector('.item-search-input');
    setupAutocomplete(input, itemRowCounter);

    // Hide delete button if only 1 row
    updateRemoveButtonsVisibility();

    calculateTotalAmount();
}

function setupAutocomplete(input, rowId) {
    const dropdown = document.getElementById(`dropdown-${rowId}`);
    let currentFocus = -1;

    input.addEventListener('input', function () {
        const val = this.value;
        const stock = getData('stock');

        // Sort stock A-Z
        const sortedStock = [...stock].sort((a, b) => a.name.localeCompare(b.name));

        dropdown.innerHTML = '';
        currentFocus = -1;

        if (!val) {
            // Show all if empty (optional, or just return)
            // sortedStock.forEach(...) 
            // allowing empty search usually isn't desired for invoice, but let's allow it to show A-Z list if clicked
        }

        let matchCount = 0;
        sortedStock.forEach(item => {
            // Check if matches or if input is empty (to show all on focus)
            if (item.name.toLowerCase().includes(val.toLowerCase()) || val === '') {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'dropdown-item';

                // Highlight matching text
                const regex = new RegExp(`(${val})`, 'gi');
                const nameHtml = item.name.replace(regex, '<span class="match-text">$1</span>');

                itemDiv.innerHTML = `<span>${nameHtml}</span>`;

                itemDiv.addEventListener('click', function () {
                    input.value = item.name;
                    closeAllDropdowns();
                    updateItemDetails(input); // Trigger update
                });

                dropdown.appendChild(itemDiv);
                matchCount++;
            }
        });

        if (matchCount > 0) {
            dropdown.classList.add('show');
        } else {
            dropdown.classList.remove('show');
        }
    });

    input.addEventListener('keydown', function (e) {
        let x = dropdown.querySelectorAll('.dropdown-item');
        if (e.keyCode == 40) { // Down
            currentFocus++;
            addActive(x);
        } else if (e.keyCode == 38) { // Up
            currentFocus--;
            addActive(x);
        } else if (e.keyCode == 13) { // Enter
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        }
    });

    // Show list on focus
    input.addEventListener('focus', function () {
        const event = new Event('input');
        this.dispatchEvent(event);
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add('focused');
        x[currentFocus].scrollIntoView({ block: 'nearest' });
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove('focused');
        }
    }
}

function closeAllDropdowns(elmnt) {
    const dropdowns = document.getElementsByClassName('custom-dropdown');
    for (let i = 0; i < dropdowns.length; i++) {
        if (elmnt != dropdowns[i] && elmnt != dropdowns[i].previousElementSibling) {
            dropdowns[i].classList.remove('show');
        }
    }
}

document.addEventListener('click', function (e) {
    closeAllDropdowns(e.target);
});

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
    const allItemInputs = document.querySelectorAll('.item-search-input');
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
    // Prevent Double-Click / Race Conditions
    if (window.isProcessingInvoice) return;
    window.isProcessingInvoice = true;

    const btn = document.querySelector('.finish-button');
    const originalText = btn ? btn.textContent : 'Pesanan Selesai';

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Memproses...';
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
    }

    // Use setTimeout to allow UI to update ("Memproses...") before heavy logic
    setTimeout(() => {
        try {
            processInvoiceInternal();
        } catch (error) {
            console.error("Critical Error in Invoice Processing:", error);
            showAlert("Terjadi kesalahan sistem: " + error.message);
        } finally {
            window.isProcessingInvoice = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        }
    }, 50);
}

function processInvoiceInternal() {
    try {
        const form = document.getElementById('invoice-form');
        const customerSearchInput = document.getElementById('customer-search-input');
        const expeditionInput = form ? form['expedition'] : null;
        const errorDiv = document.getElementById('stock-error');

        // Null checks
        if (!form) {
            console.error('Form tidak ditemukan');
            showAlert('Error: Form tidak ditemukan. Silakan refresh halaman.');
            return;
        }

        if (!customerSearchInput) {
            console.error('Customer search input tidak ditemukan');
            showAlert('Error: Input pelanggan tidak ditemukan. Silakan refresh halaman.');
            return;
        }

        if (!expeditionInput) {
            console.error('Expedition input tidak ditemukan');
            showAlert('Error: Input ekspedisi tidak ditemukan. Silakan refresh halaman.');
            return;
        }

        const customerName = customerSearchInput.value;
        const expedition = expeditionInput.value;

        if (errorDiv) {
            errorDiv.textContent = ''; // Clear previous error
        }

        // 1. Validasi Input Data Pemesan dan Ekspedisi
        if (!customerName || !expedition) {
            showAlert('Tolong input semua data Pemesan dan Ekspedisi.');
            return;
        }

        // --- PERSIAPAN VALIDASI STOK (Validation Stock) ---
        // Buat map sementara untuk validasi stok tanpa mengubah data asli dulu
        const stockData = getData('stock');
        const tempStockMap = {};
        stockData.forEach(item => {
            tempStockMap[item.name] = item.stock;
        });

        // Jika sedang EDIT, kembalikan stok lama ke tempStockMap untuk validasi
        if (editingInvoiceId !== null) {
            const existingInvoices = getData('invoices');
            const oldInvoice = existingInvoices.find(inv => inv.id === editingInvoiceId);
            if (oldInvoice && oldInvoice.items) {
                oldInvoice.items.forEach(oldItem => {
                    if (tempStockMap.hasOwnProperty(oldItem.name)) {
                        tempStockMap[oldItem.name] += oldItem.qty;
                    }
                });
            }
        }

        const items = [];
        const itemRows = document.querySelectorAll('.item-row');
        let grandTotal = 0;
        let isStockSufficient = true;
        const newStockUpdates = {}; // Untuk menyimpan perubahan stok jika valid

        // 2. Validasi dan Pengumpulan Data Barang
        itemRows.forEach(row => {
            const itemName = row.querySelector('.item-search-input').value;
            const qty = parseFloat(row.querySelector('input[type="number"]').value);
            const price = parseFloat(row.getAttribute('data-price'));

            const currentStockItem = stockData.find(s => s.name === itemName);

            if (!currentStockItem) {
                isStockSufficient = false;
                showAlert(`⚠️ Barang "${itemName}" tidak tersedia di program. Harap pilih dari daftar yang ada.`);
                return;
            }

            if (!itemName || qty <= 0 || isNaN(price)) {
                isStockSufficient = false;
                showAlert('Tolong lengkapi semua data barang dengan benar (Nama Barang, Jumlah, Harga).');
                return;
            }

            // Validasi Stok menggunakan tempStockMap (Estimasi stok setelah pengembalian barang lama)
            const availableStock = tempStockMap[itemName] || 0;

            // Cek apakah stok cukup (perhitungkan juga jika item yang sama muncul multiple kali di form baru)
            const currentUsage = (newStockUpdates[itemName] || 0) + qty;

            if (availableStock < currentUsage) {
                isStockSufficient = false;
                errorDiv.textContent = `Stock barang "${itemName}" tidak mencukupi. (Tersedia: ${availableStock})`;
                showAlert(`Stock barang "${itemName}" tidak mencukupi. (Tersedia: ${availableStock})`);
                return;
            }

            const subtotal = qty * price;
            grandTotal += subtotal;

            items.push({
                name: itemName,
                qty: qty,
                price: price,
                subtotal: subtotal,
                unit: currentStockItem.unit
            });

            // Simpan update stok untuk dieksekusi setelah semua validasi
            newStockUpdates[itemName] = currentUsage;
        });

        if (!isStockSufficient || items.length === 0) {
            if (items.length === 0) showAlert('Periksa kembali pesanan Anda, pastikan stock cukup dan semua field terisi.');
            return; // Hentikan proses jika stok tidak cukup atau data barang tidak lengkap
        }

        // 3. UPDATE STOK BARANG (Real Update)
        let finalStock = getData('stock');

        // SECURITY FIX: Lakukan pembersihan duplikat item di data persediaan
        // Ini mencegah "hilangnya 10" jika ada 5 item duplikat dengan nama sama.
        // Data dibersihkan dan akan disimpan kembali ke database.
        const uniqueStock = [];
        const seenNames = new Set();

        if (finalStock && Array.isArray(finalStock)) {
            finalStock.forEach(item => {
                // Gunakan nama sebagai kunci unik
                if (!seenNames.has(item.name)) {
                    seenNames.add(item.name);
                    uniqueStock.push(item);
                } else {
                    console.warn(`Duplicate stock item removed: ${item.name}`);
                }
            });
            finalStock = uniqueStock;
        }

        // A. Jika EDIT, kembalikan dulu stok lama ke database
        if (editingInvoiceId !== null) {
            const existingInvoices = getData('invoices');
            const oldInvoice = existingInvoices.find(inv => inv.id === editingInvoiceId);
            if (oldInvoice && oldInvoice.items) {
                finalStock = finalStock.map(stockItem => {
                    const oldItem = oldInvoice.items.find(i => i.name === stockItem.name);
                    if (oldItem) {
                        stockItem.stock += oldItem.qty;
                    }
                    return stockItem;
                });
            }
        }

        // B. Kurangi stok berdasarkan item baru (newStockUpdates)
        finalStock = finalStock.map(item => {
            if (newStockUpdates[item.name]) {
                item.stock -= newStockUpdates[item.name];
            }
            return item;
        });

        saveData('stock', finalStock);

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
        if (form) form.reset();

        const itemsList = document.getElementById('items-list');
        if (itemsList) itemsList.innerHTML = ''; // Hapus semua baris item

        // Hide cancel edit button
        const cancelBtn = document.getElementById('cancel-edit-button');
        if (cancelBtn) cancelBtn.style.display = 'none';

        const totalAmount = document.getElementById('total-amount');
        if (totalAmount) totalAmount.textContent = 'Total: Rp 0';

        localStorage.removeItem('invoiceFormData'); // Hapus saved form data
        showScreen('home-screen');
    } catch (error) {
        console.error('Error di processInvoice:', error);
        showAlert('Terjadi error saat memproses nota: ' + error.message);
    }
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
        row.insertCell().innerHTML = `<span data-field="name" data-type="text" data-index="${originalIndex}" data-editable="true">${item.name || '&nbsp;'}</span>`;

        // Satuan (dapat diedit teks)
        row.insertCell().innerHTML = `<span data-field="unit" data-type="text" data-index="${originalIndex}" data-editable="true">${item.unit || '&nbsp;'}</span>`;

        // Supplier (dapat diedit teks)
        row.insertCell().innerHTML = `<span data-field="supplier" data-type="text" data-index="${originalIndex}" data-editable="true">${item.supplier || '&nbsp;'}</span>`;

        // Jumlah Stock (dapat diedit angka)
        row.insertCell().innerHTML = `<span data-field="stock" data-type="number" data-index="${originalIndex}" data-editable="true">${(item.stock !== null && item.stock !== undefined && item.stock !== '') ? item.stock : '&nbsp;'}</span>`;

        // Minimum Stock
        row.insertCell().innerHTML = `<span data-field="minStock" data-type="number" data-index="${originalIndex}" data-editable="true">${(item.minStock !== null && item.minStock !== undefined && item.minStock !== '') ? item.minStock : '&nbsp;'}</span>`;

        // Minimum Order
        row.insertCell().innerHTML = `<span data-field="minOrder" data-type="text" data-index="${originalIndex}" data-editable="true">${item.minOrder || '&nbsp;'}</span>`;

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
            const displayValue = (type === 'currency') ? formatRupiah(newValue) : newValue;
            newSpan.textContent = (displayValue !== null && displayValue !== undefined && displayValue !== '') ? displayValue : '\u00A0';

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
        customerName: document.getElementById('customer-search-input').value, // Changed ID
        customerKey: document.getElementById('customer-key').value, // Save Key
        expedition: document.getElementById('expedition').value,
        date: document.getElementById('invoice-date').value,
        items: []
    };

    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const itemNameInput = row.querySelector('.item-search-input');
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
    document.getElementById('customer-search-input').value = formData.customerName || ''; // Changed ID
    if (formData.customerKey) document.getElementById('customer-key').value = formData.customerKey;
    document.getElementById('expedition').value = formData.expedition || '';
    // document.getElementById('invoice-date').value = formData.date || ''; // Jangan restore tanggal, biarkan tanggal hari ini

    // Update customer details
    updateCustomerDetails();

    // Clear existing rows
    const container = document.getElementById('items-list');
    container.innerHTML = '';

    // Add saved rows
    formData.items.forEach(item => {
        addItemRow();
        const lastRow = container.lastElementChild;
        const input = lastRow.querySelector('.item-search-input');
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

    const searchValue = document.getElementById('customer-table-search-input') ? document.getElementById('customer-table-search-input').value.toLowerCase() : '';


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

        // Nama Pelanggan - editable
        const nameCell = row.insertCell();
        const nameSpan = document.createElement('span');
        nameSpan.textContent = displayName || '\u00A0';
        nameSpan.setAttribute('data-field', 'name');
        nameSpan.setAttribute('data-key', customer.key);
        nameSpan.setAttribute('data-editable', 'true');
        nameSpan.style.cursor = 'pointer';
        nameSpan.onclick = function () { makeCustomerCellEditable(this); };
        nameCell.appendChild(nameSpan);

        // Kota - editable
        const cityCell = row.insertCell();
        const citySpan = document.createElement('span');
        citySpan.textContent = displayCity || '\u00A0';
        citySpan.setAttribute('data-field', 'city');
        citySpan.setAttribute('data-key', customer.key);
        citySpan.setAttribute('data-editable', 'true');
        citySpan.style.cursor = 'pointer';
        citySpan.onclick = function () { makeCustomerCellEditable(this); };
        cityCell.appendChild(citySpan);

        // No. HP - editable
        const phoneCell = row.insertCell();
        const phoneSpan = document.createElement('span');
        phoneSpan.textContent = displayPhone || '\u00A0';
        phoneSpan.setAttribute('data-field', 'phone');
        phoneSpan.setAttribute('data-key', customer.key);
        phoneSpan.setAttribute('data-editable', 'true');
        phoneSpan.style.cursor = 'pointer';
        phoneSpan.onclick = function () { makeCustomerCellEditable(this); };
        phoneCell.appendChild(phoneSpan);

        // Ekspedisi - editable
        const expeditionCell = row.insertCell();
        const expeditionSpan = document.createElement('span');
        expeditionSpan.textContent = customer.expedition || '\u00A0';
        expeditionSpan.setAttribute('data-field', 'expedition');
        expeditionSpan.setAttribute('data-key', customer.key);
        expeditionSpan.setAttribute('data-editable', 'true');
        expeditionSpan.style.cursor = 'pointer';
        expeditionSpan.onclick = function () { makeCustomerCellEditable(this); };
        expeditionCell.appendChild(expeditionSpan);

        // Catatan - editable
        const noteCell = row.insertCell();
        const noteSpan = document.createElement('span');
        noteSpan.textContent = customer.note || '\u00A0';
        noteSpan.setAttribute('data-field', 'note');
        noteSpan.setAttribute('data-key', customer.key);
        noteSpan.setAttribute('data-editable', 'true');
        noteSpan.style.cursor = 'pointer';
        noteSpan.onclick = function () { makeCustomerCellEditable(this); };
        noteCell.appendChild(noteSpan);

        // Aksi - tidak editable
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

// Fungsi untuk membuat cell customer bisa diedit
let isCustomerSaving = false;

function makeCustomerCellEditable(span) {
    if (isCustomerSaving) return;

    const field = span.getAttribute('data-field');
    const key = span.getAttribute('data-key');
    const currentValue = span.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = (currentValue === '\u00A0' || currentValue === '&nbsp;') ? '' : currentValue;
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';

    span.parentElement.replaceChild(input, span);
    input.focus();
    input.select();

    const saveChanges = () => {
        if (isCustomerSaving) return;
        isCustomerSaving = true;

        let newValue = input.value.trim();

        let customers = getData('customers');

        // Update the field
        if (customers[key]) {
            customers[key][field] = newValue;
            saveData('customers', customers);
        }

        // Replace input with span
        if (input.parentElement) {
            const newSpan = document.createElement('span');
            newSpan.setAttribute('data-field', field);
            newSpan.setAttribute('data-key', key);
            newSpan.setAttribute('data-editable', 'true');
            newSpan.style.cursor = 'pointer';
            newSpan.textContent = newValue || '\u00A0';
            newSpan.onclick = function () { makeCustomerCellEditable(this); };

            input.parentElement.replaceChild(newSpan, input);
        }

        // Re-render table
        renderCustomerTable();
        isCustomerSaving = false;
    };

    input.addEventListener('blur', saveChanges);
    input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
    });
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

        // Nama Supplier - editable
        const nameCell = row.insertCell();
        const nameSpan = document.createElement('span');
        nameSpan.textContent = displayName || '\u00A0';
        nameSpan.setAttribute('data-field', 'name');
        nameSpan.setAttribute('data-key', supplier.key);
        nameSpan.setAttribute('data-editable', 'true');
        nameSpan.style.cursor = 'pointer';
        nameSpan.onclick = function () { makeSupplierCellEditable(this); };
        nameCell.appendChild(nameSpan);

        // No. HP - editable
        const phoneCell = row.insertCell();
        const phoneSpan = document.createElement('span');
        phoneSpan.textContent = supplier.phone || '\u00A0';
        phoneSpan.setAttribute('data-field', 'phone');
        phoneSpan.setAttribute('data-key', supplier.key);
        phoneSpan.setAttribute('data-editable', 'true');
        phoneSpan.style.cursor = 'pointer';
        phoneSpan.onclick = function () { makeSupplierCellEditable(this); };
        phoneCell.appendChild(phoneSpan);

        // Alamat - editable
        const addressCell = row.insertCell();
        const addressSpan = document.createElement('span');
        addressSpan.textContent = supplier.address || '\u00A0';
        addressSpan.setAttribute('data-field', 'address');
        addressSpan.setAttribute('data-key', supplier.key);
        addressSpan.setAttribute('data-editable', 'true');
        addressSpan.style.cursor = 'pointer';
        addressSpan.onclick = function () { makeSupplierCellEditable(this); };
        addressCell.appendChild(addressSpan);

        // Catatan - editable
        const noteCell = row.insertCell();
        const noteSpan = document.createElement('span');
        noteSpan.textContent = supplier.note || '\u00A0';
        noteSpan.setAttribute('data-field', 'note');
        noteSpan.setAttribute('data-key', supplier.key);
        noteSpan.setAttribute('data-editable', 'true');
        noteSpan.style.cursor = 'pointer';
        noteSpan.onclick = function () { makeSupplierCellEditable(this); };
        noteCell.appendChild(noteSpan);

        // Aksi - tidak editable
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

// Fungsi untuk membuat cell supplier bisa diedit
let isSupplierSaving = false;

function makeSupplierCellEditable(span) {
    if (isSupplierSaving) return;

    const field = span.getAttribute('data-field');
    const key = span.getAttribute('data-key');
    const currentValue = span.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = (currentValue === '\u00A0' || currentValue === '&nbsp;') ? '' : currentValue;
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';

    span.parentElement.replaceChild(input, span);
    input.focus();
    input.select();

    const saveChanges = () => {
        if (isSupplierSaving) return;
        isSupplierSaving = true;

        let newValue = input.value.trim();

        let suppliers = getData('suppliers');

        // Update the field
        if (suppliers[key]) {
            suppliers[key][field] = newValue;
            saveData('suppliers', suppliers);
        }

        // Replace input with span
        if (input.parentElement) {
            const newSpan = document.createElement('span');
            newSpan.setAttribute('data-field', field);
            newSpan.setAttribute('data-key', key);
            newSpan.setAttribute('data-editable', 'true');
            newSpan.style.cursor = 'pointer';
            newSpan.textContent = newValue || '\u00A0';
            newSpan.onclick = function () { makeSupplierCellEditable(this); };

            input.parentElement.replaceChild(newSpan, input);
        }

        // Re-render table
        renderSupplierTable();
        isSupplierSaving = false;
    };

    input.addEventListener('blur', saveChanges);
    input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
    });
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

    // Gunakan data dari cache edit jika ada, jika tidak gunakan data asli
    let invoice = getInvoiceData(invoiceId);

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
            const lineHeight = 10.6;
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
                doc.text(formatRupiahSimple(invoice.total), 193.5, 270, { align: "right" }); // Angka Total digeser ke kanan
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

    // Wait for DOM to be ready before populating form
    setTimeout(() => {
        // Populate form with invoice data
        const form = document.getElementById('invoice-form');
        if (!form) {
            console.error('Form tidak ditemukan!');
            return;
        }

        // Set customer data
        const customerSearchInput = document.getElementById('customer-search-input');
        const customerCity = document.getElementById('customer-city');
        const customerPhone = document.getElementById('customer-phone');
        const expeditionInput = form['expedition'];

        if (customerSearchInput) customerSearchInput.value = invoice.customer;
        if (customerCity) customerCity.value = invoice.city || '';
        if (customerPhone) customerPhone.value = invoice.phone || '';
        if (expeditionInput) expeditionInput.value = invoice.expedition;

        // Update customer details display
        if (typeof updateCustomerDetails === 'function') {
            updateCustomerDetails();
        }

        // Clear existing item rows
        const itemsList = document.getElementById('items-list');
        if (itemsList) {
            itemsList.innerHTML = '';
            itemRowCounter = 0;
        }

        // Add item rows with invoice data
        if (invoice.items && invoice.items.length > 0) {
            // First, add all rows
            invoice.items.forEach(() => {
                addItemRow();
            });

            // Then, populate each row with data after a delay
            setTimeout(() => {
                const itemsList = document.getElementById('items-list');
                if (!itemsList) return;

                const allRows = itemsList.querySelectorAll('.item-row');

                invoice.items.forEach((item, index) => {
                    const currentRow = allRows[index];
                    if (!currentRow) {
                        console.error(`Row ${index} tidak ditemukan`);
                        return;
                    }

                    // Use correct selector for item input
                    const itemInput = currentRow.querySelector('.item-search-input');
                    const qtyInput = currentRow.querySelector('input[type="number"]');

                    if (itemInput && qtyInput) {
                        itemInput.value = item.name;
                        qtyInput.value = item.qty;

                        // Set price data attribute
                        currentRow.setAttribute('data-price', item.price);

                        // Update item details to populate unit and subtotal
                        if (typeof updateItemDetails === 'function') {
                            updateItemDetails(itemInput);
                        }
                    }
                });

                // Calculate total after all items are populated
                setTimeout(() => {
                    if (typeof calculateTotalAmount === 'function') {
                        calculateTotalAmount();
                    }
                }, 200);
            }, 300); // Wait for all rows to be created
        }

        // Show cancel edit button
        const cancelEditBtn = document.getElementById('cancel-edit-button');
        if (cancelEditBtn) {
            cancelEditBtn.style.display = 'inline-block';
        }

        showAlert('Mode Edit Nota: Silakan ubah data yang diperlukan, lalu klik "Pesanan Selesai" untuk menyimpan perubahan.');
    }, 200); // Wait 200ms for screen transition to complete
}
window.editInvoice = editInvoice;

function cancelEdit() {
    showConfirm('Apakah Anda yakin ingin membatalkan edit nota?', () => {
        // Reset editing mode
        editingInvoiceId = null;

        // Hide cancel button
        document.getElementById('cancel-edit-button').style.display = 'none';

        // Clear form
        const form = document.getElementById('invoice-form');
        form.reset();
        document.getElementById('customer-search-input').value = ''; // Ensure clear
        document.getElementById('customer-key').value = ''; // Ensure clear
        document.getElementById('items-list').innerHTML = '';
        addItemRow();
        calculateTotalAmount();

        localStorage.removeItem('invoiceFormData'); // Clear draft too

        showAlert('Edit nota dibatalkan.');
    }, 'Ya, Batalkan');
}
window.cancelEdit = cancelEdit;

function clearInvoiceForm() {
    showConfirm('Apakah Anda yakin ingin menghapus seluruh isi data di form ini?', () => {
        // Reset editing state if active
        editingInvoiceId = null;
        const cancelEditBtn = document.getElementById('cancel-edit-button');
        if (cancelEditBtn) cancelEditBtn.style.display = 'none';

        // Reset form inputs
        const form = document.getElementById('invoice-form');
        if (form) form.reset();

        // Clear specific fields
        const custSearch = document.getElementById('customer-search-input');
        if (custSearch) custSearch.value = '';
        const custKey = document.getElementById('customer-key');
        if (custKey) custKey.value = '';

        // Clear items list and add one fresh row
        const itemsList = document.getElementById('items-list');
        if (itemsList) {
            itemsList.innerHTML = '';
            if (typeof addItemRow === 'function') addItemRow();
        }

        // Recalculate total (should be 0)
        if (typeof calculateTotalAmount === 'function') calculateTotalAmount();

        // Clear local storage draft
        localStorage.removeItem('invoiceFormData');

        showAlert('Data form berhasil dibersihkan.');
    }, 'Ya, Bersihkan');
}
window.clearInvoiceForm = clearInvoiceForm;

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


// Global object untuk menyimpan editan sementara nota (tidak mempengaruhi database)
let invoiceEditCache = {};

function toggleInvoiceDetail(invoiceId, itemDiv) {
    const detailDiv = itemDiv.querySelector('.invoice-detail');
    const isVisible = detailDiv.style.display !== 'none';

    // Hide all other details
    document.querySelectorAll('.invoice-detail').forEach(div => div.style.display = 'none');

    if (!isVisible) {
        // PERBAIKAN: Gunakan getInvoiceData untuk load editan dari localStorage
        const invoice = getInvoiceData(invoiceId);
        console.log(`🔍 toggleInvoiceDetail untuk invoice ${invoiceId}:`, invoice);
        const detailDiv = itemDiv.querySelector('.invoice-detail');

        if (!invoice) {
            detailDiv.innerHTML = 'Nota tidak ditemukan.';
            return;
        }

        // Generate editable content
        let detailContent = generateEditableInvoiceContent(invoice);

        detailDiv.innerHTML = `
    <div class="detail-view">
        ${detailContent}
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

// Fungsi untuk mendapatkan data invoice (dari cache edit atau database asli)
function getInvoiceData(invoiceId) {
    // 1. Cek localStorage dulu (editan permanen)
    const savedEdit = localStorage.getItem(`invoice_edit_${invoiceId}`);
    if (savedEdit) {
        try {
            const parsed = JSON.parse(savedEdit);
            console.log(`📦 Load dari localStorage untuk invoice ${invoiceId}:`, parsed);
            return parsed;
        } catch (e) {
            console.error('Error parsing saved invoice edit:', e);
        }
    }

    // 2. Jika tidak ada di localStorage, cek cache sementara
    if (invoiceEditCache[invoiceId]) {
        console.log(`💾 Load dari cache untuk invoice ${invoiceId}`);
        return invoiceEditCache[invoiceId];
    }

    // 3. Jika tidak ada, ambil dari database dan buat copy untuk cache
    const invoices = getData('invoices');
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        // Deep copy agar tidak mengubah data asli
        invoiceEditCache[invoiceId] = JSON.parse(JSON.stringify(invoice));
        console.log(`🗄️ Load dari database untuk invoice ${invoiceId}`);
        return invoiceEditCache[invoiceId];
    }
    console.warn(`⚠️ Invoice ${invoiceId} tidak ditemukan`);
    return null;
}

// Fungsi untuk membuat field editable dengan double-click
function makeInvoiceFieldEditable(element, invoiceId, field, itemIndex = null) {
    const currentValue = element.textContent.trim();

    const input = document.createElement('input');
    input.type = 'text';

    // Untuk field harga, hilangkan format Rupiah agar lebih mudah diedit
    if (field === 'price' || field === 'subtotal') {
        // Hapus "Rp", titik, dan spasi
        input.value = currentValue.replace(/Rp\s*/g, '').replace(/\./g, '').trim();
    } else {
        input.value = currentValue;
    }
    input.style.width = '100%';
    input.style.padding = '2px 5px';
    input.style.border = '2px solid #3b82f6';
    input.style.borderRadius = '3px';
    input.style.fontSize = 'inherit';
    input.style.fontFamily = 'monospace';

    element.replaceWith(input);
    input.focus();
    input.select();

    const saveEdit = () => {
        const newValue = input.value.trim();
        const span = document.createElement('span');
        span.className = 'editable-field';
        span.style.cursor = 'pointer';
        span.style.padding = '2px 5px';
        span.style.borderRadius = '3px';
        span.title = 'Double-click untuk edit';

        // Update cache
        const cachedInvoice = getInvoiceData(invoiceId);
        if (cachedInvoice) {
            if (itemIndex !== null) {
                // Edit item field
                if (field === 'name') {
                    cachedInvoice.items[itemIndex].name = newValue;
                } else if (field === 'qty') {
                    const qty = parseInt(newValue) || 0;
                    cachedInvoice.items[itemIndex].qty = qty;
                    cachedInvoice.items[itemIndex].subtotal = qty * cachedInvoice.items[itemIndex].price;
                } else if (field === 'price') {
                    // Hapus "Rp", spasi, dan titik, lalu parse
                    const price = parseInt(newValue.replace(/Rp\s*/g, '').replace(/\./g, '').replace(/\s/g, '')) || 0;
                    cachedInvoice.items[itemIndex].price = price;
                    cachedInvoice.items[itemIndex].subtotal = price * cachedInvoice.items[itemIndex].qty;
                } else if (field === 'subtotal') {
                    // Hapus "Rp", spasi, dan titik, lalu parse
                    const subtotal = parseInt(newValue.replace(/Rp\s*/g, '').replace(/\./g, '').replace(/\s/g, '')) || 0;
                    cachedInvoice.items[itemIndex].subtotal = subtotal;
                }

                // Recalculate total
                cachedInvoice.total = cachedInvoice.items.reduce((sum, item) => sum + item.subtotal, 0);
            } else {
                // Edit customer field
                if (field === 'customer') {
                    cachedInvoice.customer = newValue;
                } else if (field === 'city') {
                    cachedInvoice.city = newValue;
                } else if (field === 'phone') {
                    cachedInvoice.phone = newValue;
                } else if (field === 'expedition') {
                    cachedInvoice.expedition = newValue;
                } else if (field === 'date') {
                    cachedInvoice.date = newValue;
                }
            }
        }

        // Simpan ke localStorage agar permanen
        if (cachedInvoice) {
            localStorage.setItem(`invoice_edit_${invoiceId}`, JSON.stringify(cachedInvoice));
            console.log(`✅ Editan tersimpan untuk invoice ${invoiceId}:`, cachedInvoice);
        } else {
            console.error('❌ cachedInvoice is null, tidak bisa simpan ke localStorage');
        }

        // Display formatted value
        if (field === 'price' || field === 'subtotal') {
            span.textContent = formatRupiah(parseInt(newValue.replace(/\./g, '')) || 0);
        } else {
            span.textContent = newValue;
        }

        span.ondblclick = () => makeInvoiceFieldEditable(span, invoiceId, field, itemIndex);
        input.replaceWith(span);

        // Refresh display to show updated totals
        refreshInvoiceDisplay(invoiceId);

        // Update dashboard stats jika ada perubahan harga
        if (field === 'price' || field === 'qty' || field === 'subtotal') {
            if (typeof updateDashboardStats === 'function') {
                updateDashboardStats();
            }
        }
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
    });
}

// Fungsi untuk refresh tampilan invoice setelah edit
function refreshInvoiceDisplay(invoiceId) {
    // Cari detail div yang sedang terbuka untuk invoice ini
    const allDetailDivs = document.querySelectorAll('.invoice-detail');

    allDetailDivs.forEach(detailDiv => {
        // Cek apakah detail div ini sedang ditampilkan
        if (detailDiv.style.display !== 'none' && detailDiv.innerHTML.includes(`printToPDF(${invoiceId})`)) {
            // Re-render the detail dengan data terbaru
            const cachedInvoice = getInvoiceData(invoiceId);
            if (cachedInvoice) {
                let detailContent = generateEditableInvoiceContent(cachedInvoice);
                detailDiv.innerHTML = `
                    <div class="detail-view">
                        ${detailContent}
                        <div class="detail-buttons">
                            <button class="print-button" onclick="printToPDF(${invoiceId})">Download Nota PDF</button>
                            <button class="edit-button" onclick="editInvoice(${invoiceId})">Edit Nota</button>
                            <button class="delete-button" onclick="deleteInvoice(${invoiceId})">Hapus Nota</button>
                        </div>
                    </div>
                `;
            }
        }
    });
}

// Generate konten invoice yang bisa di-edit
function generateEditableInvoiceContent(invoice) {
    const invoiceId = invoice.id;

    return `
<div style="font-family: monospace; white-space: pre-wrap; background: #f8f9fa; padding: 15px; border-radius: 8px;">
<strong>Tanggal:</strong> <span class="editable-field" style="cursor: pointer; padding: 2px 5px; border-radius: 3px;" title="Double-click untuk edit" ondblclick="makeInvoiceFieldEditable(this, ${invoiceId}, 'date')">${invoice.date}</span>
---
<strong>DATA PEMESAN</strong>
<strong>Nama:</strong> <span class="editable-field" style="cursor: pointer; padding: 2px 5px; border-radius: 3px;" title="Double-click untuk edit" ondblclick="makeInvoiceFieldEditable(this, ${invoiceId}, 'customer')">${invoice.customer}</span>
<strong>Kota:</strong> <span class="editable-field" style="cursor: pointer; padding: 2px 5px; border-radius: 3px;" title="Double-click untuk edit" ondblclick="makeInvoiceFieldEditable(this, ${invoiceId}, 'city')">${invoice.city}</span>
<strong>No. HP:</strong> <span class="editable-field" style="cursor: pointer; padding: 2px 5px; border-radius: 3px;" title="Double-click untuk edit" ondblclick="makeInvoiceFieldEditable(this, ${invoiceId}, 'phone')">${invoice.phone}</span>
<strong>Ekspedisi:</strong> <span class="editable-field" style="cursor: pointer; padding: 2px 5px; border-radius: 3px;" title="Double-click untuk edit" ondblclick="makeInvoiceFieldEditable(this, ${invoiceId}, 'expedition')">${invoice.expedition}</span>

<strong>DETAIL BARANG</strong>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
<thead>
<tr style="background: #e2e8f0;">
<th style="border: 1px solid #cbd5e0; padding: 8px; text-align: left;">No</th>
<th style="border: 1px solid #cbd5e0; padding: 8px; text-align: left;">Nama Barang</th>
<th style="border: 1px solid #cbd5e0; padding: 8px; text-align: left;">Qty</th>
<th style="border: 1px solid #cbd5e0; padding: 8px; text-align: right;">Harga Satuan</th>
<th style="border: 1px solid #cbd5e0; padding: 8px; text-align: right;">Jumlah</th>
</tr>
</thead>
<tbody>
${invoice.items.map((item, index) => `
<tr>
<td style="border: 1px solid #cbd5e0; padding: 8px;">${index + 1}</td>
<td style="border: 1px solid #cbd5e0; padding: 8px;"><span class="editable-field" style="cursor: pointer; padding: 2px 5px; border-radius: 3px;" title="Double-click untuk edit" ondblclick="makeInvoiceFieldEditable(this, ${invoiceId}, 'name', ${index})">${item.name}</span></td>
<td style="border: 1px solid #cbd5e0; padding: 8px;"><span class="editable-field" style="cursor: pointer; padding: 2px 5px; border-radius: 3px;" title="Double-click untuk edit" ondblclick="makeInvoiceFieldEditable(this, ${invoiceId}, 'qty', ${index})">${item.qty}</span></td>
<td style="border: 1px solid #cbd5e0; padding: 8px; text-align: right;"><span class="editable-field" style="cursor: pointer; padding: 2px 5px; border-radius: 3px;" title="Double-click untuk edit" ondblclick="makeInvoiceFieldEditable(this, ${invoiceId}, 'price', ${index})">${formatRupiah(item.price)}</span></td>
<td style="border: 1px solid #cbd5e0; padding: 8px; text-align: right;"><span class="editable-field" style="cursor: pointer; padding: 2px 5px; border-radius: 3px;" title="Double-click untuk edit" ondblclick="makeInvoiceFieldEditable(this, ${invoiceId}, 'subtotal', ${index})">${formatRupiah(item.subtotal)}</span></td>
</tr>
`).join('')}
</tbody>
</table>

<div style="margin-top: 15px; font-size: 1.1em;">
<strong>TOTAL AKHIR:</strong> <span style="color: #059669; font-weight: bold;">${formatRupiah(invoice.total)}</span>
</div>

${localStorage.getItem(`invoice_edit_${invoiceId}`) ? `
<div style="margin-top: 10px; padding: 10px; background: #dcfce7; border-left: 4px solid #16a34a; border-radius: 4px;">
<small><strong>✅ Nota ini sudah diedit</strong> - Data yang ditampilkan berbeda dari database asli. <button onclick="resetInvoiceToOriginal(${invoiceId})" style="margin-left: 10px; padding: 4px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Reset ke Data Asli</button></small>
</div>
` : ''}

<div class="tips-box" style="margin-top: 10px; padding: 10px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
<small><strong>💡 Tips:</strong> Double-click pada data apapun untuk mengeditnya. Perubahan tersimpan permanen di browser ini dan berlaku untuk print PDF, tidak mengubah data asli di database.</small>
</div>
</div>
`;
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

// Fungsi untuk reset invoice ke data asli
function resetInvoiceToOriginal(invoiceId) {
    showConfirm(
        'Apakah Anda yakin ingin mengembalikan nota ini ke data asli? Semua editan akan hilang.',
        () => {
            // Hapus dari localStorage
            localStorage.removeItem(`invoice_edit_${invoiceId}`);

            // Hapus dari cache
            delete invoiceEditCache[invoiceId];

            // Refresh tampilan
            refreshInvoiceDisplay(invoiceId);

            // Update dashboard
            if (typeof updateDashboardStats === 'function') {
                updateDashboardStats();
            }

            showAlert('Nota berhasil dikembalikan ke data asli!');
        },
        'Ya, Reset'
    );
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
window.setupCustomerAutocomplete = setupCustomerAutocomplete;
window.loadStockDatalist = loadStockDatalist;
window.addSupplier = addSupplier;
window.deleteSupplier = deleteSupplier;
window.toggleSupplierSort = toggleSupplierSort;
window.renderSupplierTable = renderSupplierTable;
window.makeInvoiceFieldEditable = makeInvoiceFieldEditable;
window.getInvoiceData = getInvoiceData;
window.generateEditableInvoiceContent = generateEditableInvoiceContent;
window.resetInvoiceToOriginal = resetInvoiceToOriginal;

// --- CUSTOM SELECT LOGIC ---
function toggleCustomSelect() {
    const container = document.getElementById('stock-search-container');
    container.classList.toggle('open');
}

function selectOption(value, text) {
    // 1. Update Hidden Input Value
    const select = document.getElementById('stock-search-mode');
    select.value = value;

    // 2. Update Display Text
    const display = document.getElementById('custom-select-value');
    display.textContent = text;

    // 3. Update Selected Styling
    const options = document.querySelectorAll('.custom-option');
    options.forEach(opt => opt.classList.remove('selected'));

    // Find the clicked element (naive approach or pass 'this' if onclick was inline)
    // Since we pass string, let's find by text content
    Array.from(options).find(opt => opt.textContent === text).classList.add('selected');

    // 4. Trigger Search/Render
    renderStockTable();

    // 5. Close Dropdown
    const container = document.getElementById('stock-search-container');
    container.classList.remove('open');
}

// Close custom select when clicking outside
window.addEventListener('click', function (e) {
    const container = document.getElementById('stock-search-container');
    if (!container) return;

    if (!container.contains(e.target)) {
        container.classList.remove('open');
    }
});

window.toggleCustomSelect = toggleCustomSelect;
window.selectOption = selectOption;

// --- LOGIC BARANG MASUK & KELUAR ---

function setupGeneralAutocomplete(inputId, dropdownId, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown) return;

    // Use cloneNode to remove old event listeners if any, to prevent duplicates on navigation
    // Actually simplicity is better: just ensure we don't double bind? 
    // showScreen calls this every time. Let's make sure we handle it.
    // A simple way is to tag it.
    if (input.dataset.autocompleteBound) return;
    input.dataset.autocompleteBound = "true";

    input.addEventListener('input', function () {
        const val = this.value;
        const stock = getData('stock');
        const sortedStock = [...stock].sort((a, b) => a.name.localeCompare(b.name));

        dropdown.innerHTML = '';
        if (!val) {
            dropdown.classList.remove('show');
            return;
        }

        let matchCount = 0;
        sortedStock.forEach(item => {
            if (item.name.toLowerCase().includes(val.toLowerCase())) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'dropdown-item';
                const regex = new RegExp(`(${val})`, 'gi');
                itemDiv.innerHTML = `<span>${item.name.replace(regex, '<span class="match-text">$1</span>')}</span>`;

                itemDiv.addEventListener('click', function () {
                    input.value = item.name;
                    dropdown.classList.remove('show');
                    if (onSelect) onSelect(item);
                });
                dropdown.appendChild(itemDiv);
                matchCount++;
            }
        });

        if (matchCount > 0) dropdown.classList.add('show');
        else dropdown.classList.remove('show');
    });

    // Close on click outside
    document.addEventListener('click', function (e) {
        if (e.target !== input && e.target !== dropdown) {
            dropdown.classList.remove('show');
        }
    });
}

function addIncomingGoods(event) {
    event.preventDefault();

    const date = document.getElementById('incoming-date').value;
    const name = document.getElementById('incoming-item-name').value;
    const supplier = document.getElementById('incoming-supplier').value;
    const qty = parseFloat(document.getElementById('incoming-qty').value);
    const payment = parseFloat(document.getElementById('incoming-payment').value);

    if (!name || isNaN(qty) || isNaN(payment)) {
        showAlert("Mohon lengkapi data dengan benar.");
        return;
    }

    // 1. Update Stock
    const stock = getData('stock');
    const itemIndex = stock.findIndex(item => item.name === name);

    if (itemIndex === -1) {
        showAlert("Barang tidak ditemukan di database Stock Barang via Nama.");
        return;
    }

    // Update stock quantity
    stock[itemIndex].stock = (parseFloat(stock[itemIndex].stock) || 0) + qty;

    // Save stock to DB
    saveData('stock', stock);

    // 2. Add to History
    const history = getData('incoming') || [];
    history.push({
        id: Date.now(),
        date: date,
        name: name,
        supplier: supplier,
        qty: qty,
        payment: payment
    });

    saveData('incoming', history);

    showAlert("Barang Masuk berhasil disimpan & Stock bertambah!");
    document.getElementById('incoming-form').reset();
    document.getElementById('incoming-date').valueAsDate = new Date(); // Reset date to today
    renderIncomingTable();
}

function addOutgoingGoods(event) {
    event.preventDefault();

    const date = document.getElementById('outgoing-date').value;
    const name = document.getElementById('outgoing-item-name').value;
    const qty = parseFloat(document.getElementById('outgoing-qty').value);

    if (!name || isNaN(qty)) {
        showAlert("Mohon lengkapi data.");
        return;
    }

    const stock = getData('stock');
    const itemIndex = stock.findIndex(item => item.name === name);

    if (itemIndex === -1) {
        showAlert("Barang tidak ditemukan.");
        return;
    }

    if (stock[itemIndex].stock < qty) {
        showAlert(`Stok tidak cukup! Sisa stok: ${stock[itemIndex].stock}`);
        return;
    }

    stock[itemIndex].stock = (parseFloat(stock[itemIndex].stock) || 0) - qty;
    saveData('stock', stock);

    const history = getData('outgoing') || [];
    history.push({
        id: Date.now(),
        date: date,
        name: name,
        qty: qty
    });

    saveData('outgoing', history);

    showAlert("Barang Keluar berhasil disimpan & Stock berkurang!");
    document.getElementById('outgoing-form').reset();
    document.getElementById('outgoing-date').valueAsDate = new Date();
    renderOutgoingTable();
}

function deleteIncoming(id) {
    showConfirm("Yakin ingin menghapus riwayat ini? (Stok tidak akan berubah otomatis)", () => {
        const history = getData('incoming') || [];
        const newHistory = history.filter(item => item.id !== id);
        saveData('incoming', newHistory);
        renderIncomingTable();
    });
}

function deleteOutgoing(id) {
    showConfirm("Yakin ingin menghapus riwayat ini? (Stok tidak akan berubah otomatis)", () => {
        const history = getData('outgoing') || [];
        const newHistory = history.filter(item => item.id !== id);
        saveData('outgoing', newHistory);
        renderOutgoingTable();
    });
}

function renderIncomingTable() {
    const tbody = document.querySelector('#incoming-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const history = getData('incoming') || [];
    // Sort desc by date/id
    const sorted = [...history].sort((a, b) => b.id - a.id);

    sorted.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${item.name}</td>
            <td>${item.supplier}</td>
            <td>${item.qty}</td>
            <td>${formatRupiah(item.payment)}</td>
            <td style="text-align: center;">
                <button class="delete-button" onclick="deleteIncoming(${item.id})">Hapus</button>
            </td>
            <td style="text-align: center;"><input type="checkbox" class="incoming-checkbox" value="${item.id}" onclick="checkSelectAllStatus('incoming')"></td>
        `;
        tbody.appendChild(tr);
    });

    checkSelectAllStatus('incoming');
}

function renderOutgoingTable() {
    const tbody = document.querySelector('#outgoing-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const history = getData('outgoing') || [];
    const sorted = [...history].sort((a, b) => b.id - a.id);

    sorted.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td style="text-align: center;">
                 <button class="delete-button" onclick="deleteOutgoing(${item.id})">Hapus</button>
            </td>
            <td style="text-align: center;"><input type="checkbox" class="outgoing-checkbox" value="${item.id}" onclick="checkSelectAllStatus('outgoing')"></td>
        `;
        tbody.appendChild(tr);
    });

    checkSelectAllStatus('outgoing');
}

function toggleSelectAll(type) {
    const master = document.getElementById(`${type}-select-all`);
    const checkboxes = document.querySelectorAll(`.${type}-checkbox`);
    checkboxes.forEach(cb => cb.checked = master.checked);
}

function checkSelectAllStatus(type) {
    const master = document.getElementById(`${type}-select-all`);
    const checkboxes = document.querySelectorAll(`.${type}-checkbox`);
    if (checkboxes.length === 0) {
        if (master) master.checked = false;
        return;
    }

    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    if (master) master.checked = allChecked;
}

function downloadIncomingExcel() {
    const checkboxes = document.querySelectorAll('.incoming-checkbox:checked');
    if (checkboxes.length === 0) {
        showAlert("Pilih data yang ingin didownload terlebih dahulu.");
        return;
    }

    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    const history = getData('incoming');
    const dataToExport = history.filter(item => selectedIds.includes(item.id)).map(item => ({
        Tanggal: item.date,
        'Nama Barang': item.name,
        Supplier: item.supplier,
        Jumlah: String(item.qty), // Convert to string for left alignment
        Pembayaran: String(item.payment) // Convert to string for left alignment
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Set column widths
    ws['!cols'] = [
        { wch: 20 }, // Tanggal
        { wch: 40 }, // Nama Barang
        { wch: 30 }, // Supplier
        { wch: 15 }, // Jumlah
        { wch: 20 }  // Pembayaran
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BarangMasuk");
    XLSX.writeFile(wb, "Barang_Masuk.xlsx");
}

function downloadOutgoingExcel() {
    const checkboxes = document.querySelectorAll('.outgoing-checkbox:checked');
    if (checkboxes.length === 0) {
        showAlert("Pilih data yang ingin didownload terlebih dahulu.");
        return;
    }

    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    const history = getData('outgoing');
    const dataToExport = history.filter(item => selectedIds.includes(item.id)).map(item => ({
        Tanggal: item.date,
        'Nama Barang': item.name,
        Jumlah: String(item.qty) // Convert to string for left alignment
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Set column widths
    ws['!cols'] = [
        { wch: 20 }, // Tanggal
        { wch: 40 }, // Nama Barang
        { wch: 15 }  // Jumlah
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BarangKeluar");
    XLSX.writeFile(wb, "Barang_Keluar.xlsx");
}

window.addIncomingGoods = addIncomingGoods;
window.addOutgoingGoods = addOutgoingGoods;
window.downloadIncomingExcel = downloadIncomingExcel;
window.downloadOutgoingExcel = downloadOutgoingExcel;
window.toggleSelectAll = toggleSelectAll;
window.deleteIncoming = deleteIncoming;
window.deleteOutgoing = deleteOutgoing;
window.checkSelectAllStatus = checkSelectAllStatus;
