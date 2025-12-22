// --- DETAIL MODAL FUNCTIONS ---

function closeDetailModal() {
    document.getElementById('detail-modal').style.display = 'none';
}
window.closeDetailModal = closeDetailModal;

// Show Products Detail
function showProductsDetail() {
    const stock = getData('stock') || [];
    const totalProducts = stock.length;

    // Calculate statistics
    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValue = 0;

    stock.forEach(item => {
        totalStock += item.stock || 0;
        totalValue += (item.stock || 0) * (item.price || 0);

        if (item.stock <= 0) {
            outOfStockCount++;
        } else if (item.stock <= (item.minStock || 0)) {
            lowStockCount++;
        }
    });

    // Sort by stock (lowest first) for display
    const sortedStock = [...stock].sort((a, b) => (a.stock || 0) - (b.stock || 0));
    const top10LowStock = sortedStock.slice(0, 10);

    const content = `
        <div class="detail-stats-summary">
            <div class="detail-stat-item">
                <h4>Total Jenis Produk</h4>
                <p>${totalProducts}</p>
            </div>
            <div class="detail-stat-item">
                <h4>Total Unit Stok</h4>
                <p>${totalStock.toLocaleString('id-ID')}</p>
            </div>
            <div class="detail-stat-item">
                <h4>Stok Habis</h4>
                <p style="color: var(--danger-color);">${outOfStockCount}</p>
            </div>
            <div class="detail-stat-item">
                <h4>Stok Menipis</h4>
                <p style="color: var(--accent-color);">${lowStockCount}</p>
            </div>
        </div>

        <div class="detail-section">
            <h3>📉 10 Produk dengan Stok Terendah</h3>
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Nama Barang</th>
                        <th>Stok Saat Ini</th>
                        <th>Min. Stok</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${top10LowStock.map(item => {
        let status = '✅ Aman';
        let statusColor = 'var(--success-color)';

        if (item.stock <= 0) {
            status = '❌ Habis';
            statusColor = 'var(--danger-color)';
        } else if (item.stock <= (item.minStock || 0)) {
            status = '⚠️ Menipis';
            statusColor = 'var(--accent-color)';
        }

        return `
                            <tr>
                                <td>${item.name}</td>
                                <td style="text-align: center;">${item.stock || 0}</td>
                                <td style="text-align: center;">${item.minStock || 0}</td>
                                <td style="color: ${statusColor}; font-weight: 600;">${status}</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="detail-section">
            <h3>💰 Nilai Total Inventori</h3>
            <ul class="detail-list">
                <li>
                    <span class="detail-list-label">Estimasi Nilai Total Stok</span>
                    <span class="detail-list-value">${formatRupiah(totalValue)}</span>
                </li>
                <li>
                    <span class="detail-list-label">Rata-rata Nilai per Produk</span>
                    <span class="detail-list-value">${formatRupiah(totalProducts > 0 ? totalValue / totalProducts : 0)}</span>
                </li>
            </ul>
        </div>
    `;

    document.getElementById('detail-modal-title').textContent = '📦 Detail Produk & Stok';
    document.getElementById('detail-modal-body').innerHTML = content;
    document.getElementById('detail-modal').style.display = 'flex';
}
window.showProductsDetail = showProductsDetail;

// Show Customers Detail
function showCustomersDetail() {
    const customers = getData('customers') || {};
    const invoices = getData('invoices') || [];
    const totalCustomers = Object.keys(customers).length;

    // Calculate customer statistics
    const customerStats = {};

    invoices.forEach(invoice => {
        const custName = invoice.customer;
        if (!customerStats[custName]) {
            customerStats[custName] = {
                name: custName,
                totalOrders: 0,
                totalSpent: 0
            };
        }
        customerStats[custName].totalOrders++;
        customerStats[custName].totalSpent += invoice.total || 0;
    });

    // Sort by total spent (highest first)
    const topCustomers = Object.values(customerStats)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

    // Group customers by city
    const cityCounts = {};
    Object.values(customers).forEach(customer => {
        const city = customer.city || 'Tidak Diketahui';
        cityCounts[city] = (cityCounts[city] || 0) + 1;
    });

    const topCities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const content = `
        <div class="detail-stats-summary">
            <div class="detail-stat-item">
                <h4>Total Pelanggan</h4>
                <p>${totalCustomers}</p>
            </div>
            <div class="detail-stat-item">
                <h4>Pelanggan Aktif</h4>
                <p>${Object.keys(customerStats).length}</p>
            </div>
            <div class="detail-stat-item">
                <h4>Kota Terbanyak</h4>
                <p style="font-size: 1.2rem;">${topCities[0] ? topCities[0][0] : '-'}</p>
            </div>
        </div>

        <div class="detail-section">
            <h3>🏆 Top 10 Pelanggan Terbaik</h3>
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Peringkat</th>
                        <th>Nama Pelanggan</th>
                        <th>Total Pesanan</th>
                        <th>Total Belanja</th>
                    </tr>
                </thead>
                <tbody>
                    ${topCustomers.length > 0 ? topCustomers.map((customer, index) => `
                        <tr>
                            <td style="text-align: center; font-weight: 700; color: var(--primary-color);">#${index + 1}</td>
                            <td>${customer.name}</td>
                            <td style="text-align: center;">${customer.totalOrders}x</td>
                            <td style="font-weight: 600; color: var(--success-color);">${formatRupiah(customer.totalSpent)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">Belum ada data transaksi pelanggan</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="detail-section">
            <h3>🌍 Distribusi Pelanggan per Kota</h3>
            <ul class="detail-list">
                ${topCities.map(([city, count]) => `
                    <li>
                        <span class="detail-list-label">${city}</span>
                        <span class="detail-list-value">${count} Pelanggan</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    document.getElementById('detail-modal-title').textContent = '👥 Detail Pelanggan';
    document.getElementById('detail-modal-body').innerHTML = content;
    document.getElementById('detail-modal').style.display = 'flex';
}
window.showCustomersDetail = showCustomersDetail;

// Show Transactions Detail
function showTransactionsDetail() {
    const invoices = getData('invoices') || [];
    const totalTransactions = invoices.length;

    // Calculate statistics
    let totalRevenue = 0;
    let totalItems = 0;
    const monthlyStats = {};

    invoices.forEach(invoice => {
        // Cek apakah ada editan untuk invoice ini
        const savedEdit = localStorage.getItem(`invoice_edit_${invoice.id}`);
        let invoiceTotal = invoice.total || 0;
        let invoiceItems = invoice.items || [];

        if (savedEdit) {
            try {
                const editedInvoice = JSON.parse(savedEdit);
                invoiceTotal = editedInvoice.total || 0;
                invoiceItems = editedInvoice.items || [];
            } catch (e) {
                console.error('Error parsing invoice edit:', e);
            }
        }

        totalRevenue += invoiceTotal;
        totalItems += invoiceItems.reduce((sum, item) => sum + (item.qty || 0), 0);

        // Group by month
        const date = new Date(invoice.date.split('/').reverse().join('-'));
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = {
                count: 0,
                revenue: 0
            };
        }
        monthlyStats[monthKey].count++;
        monthlyStats[monthKey].revenue += invoiceTotal;
    });

    // Sort invoices by date (newest first)
    const recentInvoices = [...invoices]
        .sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            return dateB - dateA;
        })
        .slice(0, 10);

    // Get monthly data sorted
    const monthlyData = Object.entries(monthlyStats)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6);

    const content = `
        <div class="detail-stats-summary">
            <div class="detail-stat-item">
                <h4>Total Transaksi</h4>
                <p>${totalTransactions}</p>
            </div>
            <div class="detail-stat-item">
                <h4>Total Pendapatan</h4>
                <p style="font-size: 1.4rem;">${formatRupiah(totalRevenue)}</p>
            </div>
            <div class="detail-stat-item">
                <h4>Total Item Terjual</h4>
                <p>${totalItems.toLocaleString('id-ID')}</p>
            </div>
            <div class="detail-stat-item">
                <h4>Rata-rata per Transaksi</h4>
                <p style="font-size: 1.4rem;">${formatRupiah(totalTransactions > 0 ? totalRevenue / totalTransactions : 0)}</p>
            </div>
        </div>

        <div class="detail-section">
            <h3>📅 Transaksi per Bulan (6 Bulan Terakhir)</h3>
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Bulan</th>
                        <th>Jumlah Transaksi</th>
                        <th>Total Pendapatan</th>
                        <th>Rata-rata</th>
                    </tr>
                </thead>
                <tbody>
                    ${monthlyData.length > 0 ? monthlyData.map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const monthName = `${monthNames[parseInt(monthNum) - 1]} ${year}`;

        return `
                            <tr>
                                <td>${monthName}</td>
                                <td style="text-align: center;">${data.count}x</td>
                                <td style="font-weight: 600; color: var(--success-color);">${formatRupiah(data.revenue)}</td>
                                <td>${formatRupiah(data.revenue / data.count)}</td>
                            </tr>
                        `;
    }).join('') : '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">Belum ada data transaksi</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="detail-section">
            <h3>🕒 10 Transaksi Terbaru</h3>
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Pelanggan</th>
                        <th>Item</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentInvoices.length > 0 ? recentInvoices.map(invoice => `
                        <tr>
                            <td>${invoice.date}</td>
                            <td>${invoice.customer}</td>
                            <td style="text-align: center;">${(invoice.items || []).length} item</td>
                            <td style="font-weight: 600; color: var(--success-color);">${formatRupiah(invoice.total)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">Belum ada transaksi</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('detail-modal-title').textContent = '📊 Detail Transaksi';
    document.getElementById('detail-modal-body').innerHTML = content;
    document.getElementById('detail-modal').style.display = 'flex';
}
window.showTransactionsDetail = showTransactionsDetail;
