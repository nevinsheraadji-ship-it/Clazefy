
        // Data Storage
        let transactions = [];
        let savingsGoals = [];
        let budgets = [];
        let currentMonthOffset = 0;
        let touchStartX = 0;
        let touchEndX = 0;

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            loadData();
            setTodayDate();
            updateDashboard();
            initSwipeGesture();
        });

        function loadData() {
            transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            savingsGoals = JSON.parse(localStorage.getItem('savingsGoals') || '[]');
            budgets = JSON.parse(localStorage.getItem('budgets') || '[]');
            
            // Demo data if empty
            if (transactions.length === 0) {
                transactions = [
                    {id: Date.now(), type: 'expense', amount: 50000, category: 'Makanan', date: new Date().toISOString().split('T')[0], note: 'Makan siang'},
                    {id: Date.now()-1, type: 'income', amount: 1000000, category: 'Lainnya', date: new Date().toISOString().split('T')[0], note: 'Uang saku'},
                ];
                saveData();
            }
        }

        function saveData() {
            localStorage.setItem('transactions', JSON.stringify(transactions));
            localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));
            localStorage.setItem('budgets', JSON.stringify(budgets));
        }

        function setTodayDate() {
            document.getElementById('transactionDate').valueAsDate = new Date();
        }

        // Navigation
        function showPage(pageName) {
            document.querySelectorAll('.page-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(pageName).classList.add('active');

            document.querySelectorAll('.nav-item-bottom').forEach(nav => {
                nav.classList.remove('active');
            });
            event.currentTarget.classList.add('active');

            if (pageName === 'analytics') {
                setTimeout(renderCharts, 100);
            }
            if (pageName === 'savings') {
                renderSavingsGoals();
            }
            if (pageName === 'budget') {
                renderBudgets();
            }
            if (pageName === 'transactions') {
                renderAllTransactions();
            }
        }

        // Swipe Gesture
        function initSwipeGesture() {
            const transSection = document.getElementById('transactions');
            transSection.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
            });
            transSection.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            });
        }

        function handleSwipe() {
            if (touchStartX - touchEndX > 50) {
                currentMonthOffset--;
                renderAllTransactions();
            }
            if (touchEndX - touchStartX > 50) {
                currentMonthOffset++;
                renderAllTransactions();
            }
        }

        // Dashboard Update
        function updateDashboard() {
            const balance = calculateBalance();
            const monthStats = getMonthStats();
            const totalSavings = calculateTotalSavings();

            document.getElementById('totalBalance').textContent = formatCurrency(balance);
            document.getElementById('monthExpense').textContent = formatCurrency(monthStats.expense);
            document.getElementById('monthIncome').textContent = formatCurrency(monthStats.income);
            document.getElementById('totalSavings').textContent = formatCurrency(totalSavings);

            updateHealthScore();
            renderRecentTransactions();
        }

        function calculateBalance() {
            return transactions.reduce((sum, t) => {
                return t.type === 'income' ? sum + t.amount : sum - t.amount;
            }, 0);
        }

        function getMonthStats(offset = 0) {
            const now = new Date();
            now.setMonth(now.getMonth() + offset);
            const month = now.getMonth();
            const year = now.getFullYear();

            return transactions.reduce((stats, t) => {
                const tDate = new Date(t.date);
                if (tDate.getMonth() === month && tDate.getFullYear() === year) {
                    if (t.type === 'expense') stats.expense += t.amount;
                    if (t.type === 'income') stats.income += t.amount;
                }
                return stats;
            }, {expense: 0, income: 0});
        }

        function calculateTotalSavings() {
            return savingsGoals.reduce((sum, g) => sum + (g.current || 0), 0);
        }

        function updateHealthScore() {
            const monthStats = getMonthStats();
            const balance = calculateBalance();
            
            let score = 100;
            if (monthStats.income > 0) {
                const expenseRatio = monthStats.expense / monthStats.income;
                if (expenseRatio > 0.9) score -= 40;
                else if (expenseRatio > 0.7) score -= 20;
            }

            if (balance < 100000) score -= 20;

            const budgetViolations = checkBudgetViolations();
            score -= budgetViolations * 10;

            score = Math.max(0, Math.min(100, score));

            const healthCard = document.getElementById('healthCard');
            const healthScoreEl = document.getElementById('healthScore');
            const healthStatus = document.getElementById('healthStatus');
            const healthMessage = document.getElementById('healthMessage');

            healthScoreEl.textContent = score;

            if (score >= 80) {
                healthCard.className = 'health-card health-excellent';
                healthStatus.textContent = 'Sangat Baik!';
                healthMessage.textContent = 'Keuanganmu dalam kondisi sehat';
            } else if (score >= 60) {
                healthCard.className = 'health-card health-warning';
                healthStatus.textContent = 'Perlu Perhatian';
                healthMessage.textContent = 'Hati-hati dengan pengeluaran';
            } else {
                healthCard.className = 'health-card health-danger';
                healthStatus.textContent = 'Bahaya!';
                healthMessage.textContent = 'Segera kurangi pengeluaran';
            }
        }

        function checkBudgetViolations() {
            const monthStats = getCategoryExpenses();
            let violations = 0;
            budgets.forEach(b => {
                if (monthStats[b.category] > b.amount) violations++;
            });
            return violations;
        }

        function getCategoryExpenses(offset = 0) {
            const now = new Date();
            now.setMonth(now.getMonth() + offset);
            const month = now.getMonth();
            const year = now.getFullYear();

            return transactions.reduce((cats, t) => {
                const tDate = new Date(t.date);
                if (t.type === 'expense' && tDate.getMonth() === month && tDate.getFullYear() === year) {
                    cats[t.category] = (cats[t.category] || 0) + t.amount;
                }
                return cats;
            }, {});
        }

        function renderRecentTransactions() {
            const recent = transactions.slice().reverse().slice(0, 5);
            const container = document.getElementById('recentTransactions');

            if (recent.length === 0) {
                container.innerHTML = '<p class="text-center text-muted">Belum ada transaksi</p>';
                return;
            }

            container.innerHTML = recent.map(t => `
                <div class="transaction-item transaction-${t.type}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${t.category}</strong>
                            <br><small class="text-muted">${formatDate(t.date)}</small>
                            ${t.note ? `<br><small>${t.note}</small>` : ''}
                        </div>
                        <div class="text-end">
                            <strong class="${t.type === 'income' ? 'text-success' : 'text-danger'}">
                                ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                            </strong>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function renderAllTransactions() {
            const monthStats = getMonthStats(currentMonthOffset);
            const now = new Date();
            now.setMonth(now.getMonth() + currentMonthOffset);
            
            document.getElementById('currentMonth').textContent = now.toLocaleDateString('id-ID', {month: 'long', year: 'numeric'});

            const filtered = transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
            }).reverse();

            const container = document.getElementById('allTransactions');

            if (filtered.length === 0) {
                container.innerHTML = '<p class="text-center text-muted">Tidak ada transaksi bulan ini</p>';
                return;
            }

            container.innerHTML = filtered.map(t => `
                <div class="transaction-item transaction-${t.type}" onclick="editTransaction(${t.id})">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${t.category}</strong>
                            <br><small class="text-muted">${formatDate(t.date)}</small>
                            ${t.note ? `<br><small>${t.note}</small>` : ''}
                        </div>
                        <div class="text-end">
                            <strong class="${t.type === 'income' ? 'text-success' : 'text-danger'}">
                                ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                            </strong>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Transactions
        function showAddTransactionModal() {
            const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
            modal.show();
            setTimeout(() => document.getElementById('transactionAmount').focus(), 300);
        }

        document.getElementById('transactionForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const transaction = {
                id: Date.now(),
                type: document.getElementById('transactionType').value,
                amount: parseFloat(document.getElementById('transactionAmount').value),
                category: document.getElementById('transactionCategory').value,
                date: document.getElementById('transactionDate').value,
                note: document.getElementById('transactionNote').value
            };

            transactions.push(transaction);
            saveData();
            updateDashboard();

            bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
            this.reset();
            setTodayDate();

            showNotification('Transaksi berhasil ditambahkan!');
        });

        function editTransaction(id) {
            if (confirm('Hapus transaksi ini?')) {
                transactions = transactions.filter(t => t.id !== id);
                saveData();
                updateDashboard();
                renderAllTransactions();
                showNotification('Transaksi dihapus');
            }
        }

        // Charts
        let categoryChart, trendChart;

        function renderCharts() {
            renderCategoryChart();
            renderTrendChart();
            renderHabitAnalysis();
            renderWhatIfAnalysis();
        }

        function renderCategoryChart() {
            const ctx = document.getElementById('categoryChart');
            const expenses = getCategoryExpenses();
            
            if (categoryChart) categoryChart.destroy();

            categoryChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(expenses),
                    datasets: [{
                        data: Object.values(expenses),
                        backgroundColor: [
                            '#E74C3C', '#3498DB', '#F39C12', '#9B59B6', 
                            '#1ABC9C', '#E67E22', '#95A5A6'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {position: 'bottom'},
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + formatCurrency(context.parsed);
                                }
                            }
                        }
                    },
                    onClick: (e, elements) => {
                        if (elements.length > 0) {
                            const category = Object.keys(expenses)[elements[0].index];
                            showCategoryDetails(category);
                        }
                    }
                }
            });
        }

        function renderTrendChart() {
            const ctx = document.getElementById('trendChart');
            const last6Months = [];
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const stats = getMonthStats(-i);
                last6Months.push({
                    month: date.toLocaleDateString('id-ID', {month: 'short'}),
                    balance: stats.income - stats.expense
                });
            }

            if (trendChart) trendChart.destroy();

            trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last6Months.map(m => m.month),
                    datasets: [{
                        label: 'Saldo',
                        data: last6Months.map(m => m.balance),
                        borderColor: '#2C3E50',
                        backgroundColor: 'rgba(44, 62, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {display: false}
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: function(value) {
                                    return 'Rp ' + (value/1000) + 'k';
                                }
                            }
                        }
                    }
                }
            });
        }

        function showCategoryDetails(category) {
            const filtered = transactions.filter(t => t.type === 'expense' && t.category === category);
            const total = filtered.reduce((sum, t) => sum + t.amount, 0);
            
            alert(`${category}\nTotal: ${formatCurrency(total)}\nJumlah transaksi: ${filtered.length}`);
        }

        function renderHabitAnalysis() {
            const expenses = getCategoryExpenses();
            const total = Object.values(expenses).reduce((a, b) => a + b, 0);
            
            let html = '<div class="row g-2">';
            Object.entries(expenses).sort((a, b) => b[1] - a[1]).forEach(([cat, amount]) => {
                const percentage = ((amount / total) * 100).toFixed(1);
                html += `
                    <div class="col-12">
                        <div class="d-flex justify-content-between mb-1">
                            <span>${cat}</span>
                            <strong>${formatCurrency(amount)} (${percentage}%)</strong>
                        </div>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            // Insight
            const topCategory = Object.entries(expenses).sort((a, b) => b[1] - a[1])[0];
            if (topCategory) {
                html += `<div class="alert alert-info mt-3">
                    💡 Pengeluaran terbesarmu adalah <strong>${topCategory[0]}</strong> 
                    (${formatCurrency(topCategory[1])})
                </div>`;
            }

            document.getElementById('habitAnalysis').innerHTML = html;
        }

        function renderWhatIfAnalysis() {
            const expenses = getCategoryExpenses();
            const topExpenses = Object.entries(expenses).sort((a, b) => b[1] - a[1]).slice(0, 3);
            
            let html = '';
            topExpenses.forEach(([cat, amount]) => {
                const saved20 = amount * 0.2 * 12;
                const saved50 = amount * 0.5 * 12;
                
                html += `
                    <div class="card mb-2">
                        <div class="card-body">
                            <h6>${cat}</h6>
                            <small class="text-muted">Pengeluaran bulanan: ${formatCurrency(amount)}</small>
                            <ul class="mt-2 mb-0">
                                <li>Jika hemat 20%: <strong class="text-success">${formatCurrency(saved20)}</strong> per tahun</li>
                                <li>Jika hemat 50%: <strong class="text-success">${formatCurrency(saved50)}</strong> per tahun</li>
                            </ul>
                        </div>
                    </div>
                `;
            });

            document.getElementById('whatIfAnalysis').innerHTML = html || '<p class="text-muted">Belum ada data cukup</p>';
        }

        // Savings Goals
        function showAddGoalModal() {
            const modal = new bootstrap.Modal(document.getElementById('addGoalModal'));
            modal.show();
        }

        document.getElementById('goalForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const goal = {
                id: Date.now(),
                name: document.getElementById('goalName').value,
                target: parseFloat(document.getElementById('goalTarget').value),
                current: 0,
                date: document.getElementById('goalDate').value
            };

            savingsGoals.push(goal);
            saveData();
            renderSavingsGoals();

            bootstrap.Modal.getInstance(document.getElementById('addGoalModal')).hide();
            this.reset();
            showNotification('Tujuan tabungan dibuat!');
        });

        function renderSavingsGoals() {
            const container = document.getElementById('savingsGoals');
            
            if (savingsGoals.length === 0) {
                container.innerHTML = '<p class="text-center text-muted">Belum ada tujuan tabungan</p>';
                renderChallenges();
                return;
            }

            container.innerHTML = savingsGoals.map(g => {
                const progress = (g.current / g.target * 100).toFixed(1);
                const isComplete = progress >= 100;
                
                return `
                    <div class="card mb-3 ${isComplete ? 'celebrate' : ''}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h5 class="mb-1">${g.name} ${isComplete ? '🎉' : ''}</h5>
                                    <small class="text-muted">Target: ${formatDate(g.date)}</small>
                                </div>
                                <button class="btn btn-sm btn-success" onclick="addToSaving(${g.id})">
                                    <i class="bi bi-plus"></i> Tambah
                                </button>
                            </div>
                            <div class="progress-custom">
                                <div class="progress-bar-custom" style="width: ${Math.min(progress, 100)}%">
                                    ${progress}%
                                </div>
                            </div>
                            <div class="d-flex justify-content-between mt-2">
                                <span>${formatCurrency(g.current)}</span>
                                <strong>${formatCurrency(g.target)}</strong>
                            </div>
                            ${isComplete ? '<p class="text-success text-center mt-2 mb-0"><strong>🎊 Tujuan Tercapai!</strong></p>' : ''}
                        </div>
                    </div>
                `;
            }).join('');

            renderChallenges();
            updateDashboard();
        }

        function addToSaving(id) {
            const amount = prompt('Masukkan jumlah yang ingin ditabung:');
            if (amount && !isNaN(amount)) {
                const goal = savingsGoals.find(g => g.id === id);
                const oldProgress = (goal.current / goal.target * 100);
                goal.current += parseFloat(amount);
                const newProgress = (goal.current / goal.target * 100);
                
                saveData();
                renderSavingsGoals();
                
                if (oldProgress < 100 && newProgress >= 100) {
                    setTimeout(() => {
                        alert('🎉 Selamat! Kamu berhasil mencapai tujuan tabungan!');
                    }, 500);
                }
                
                showNotification(`Berhasil menambah ${formatCurrency(amount)} ke tabungan!`);
            }
        }

        function renderChallenges() {
            const challenges = [
                {name: '7 Hari Tanpa Jajan', desc: 'Tidak beli jajan 7 hari berturut-turut', reward: '🏆 Badge Disiplin'},
                {name: 'Hemat 100k Minggu Ini', desc: 'Tabung minimal 100rb minggu ini', reward: '⭐ Badge Penabung'},
                {name: 'Zero Waste Day', desc: 'Satu hari tanpa pengeluaran sama sekali', reward: '🌟 Badge Minimalis'}
            ];

            document.getElementById('challenges').innerHTML = challenges.map(c => `
                <div class="challenge-card mb-2">
                    <h6>${c.name}</h6>
                    <p class="mb-2 small">${c.desc}</p>
                    <small><strong>Reward:</strong> ${c.reward}</small>
                </div>
            `).join('');
        }

        // Budget
        function showAddBudgetModal() {
            const modal = new bootstrap.Modal(document.getElementById('addBudgetModal'));
            modal.show();
        }

        document.getElementById('budgetForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const category = document.getElementById('budgetCategory').value;
            const amount = parseFloat(document.getElementById('budgetAmount').value);
            
            const existing = budgets.findIndex(b => b.category === category);
            if (existing >= 0) {
                budgets[existing].amount = amount;
            } else {
                budgets.push({category, amount});
            }

            saveData();
            renderBudgets();
            updateDashboard();

            bootstrap.Modal.getInstance(document.getElementById('addBudgetModal')).hide();
            this.reset();
            showNotification('Anggaran berhasil diatur!');
        });

        function renderBudgets() {
            const container = document.getElementById('budgetList');
            const expenses = getCategoryExpenses();
            
            if (budgets.length === 0) {
                container.innerHTML = '<p class="text-center text-muted">Belum ada anggaran yang diatur</p>';
                renderComparison();
                return;
            }

            container.innerHTML = budgets.map(b => {
                const spent = expenses[b.category] || 0;
                const percentage = (spent / b.amount * 100).toFixed(1);
                const status = percentage > 100 ? 'danger' : percentage > 80 ? 'warning' : 'success';
                
                return `
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between mb-2">
                                <h6>${b.category}</h6>
                                <span class="badge bg-${status}">${percentage}%</span>
                            </div>
                            <div class="progress mb-2" style="height: 20px;">
                                <div class="progress-bar bg-${status}" style="width: ${Math.min(percentage, 100)}%"></div>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span>${formatCurrency(spent)}</span>
                                <strong>${formatCurrency(b.amount)}</strong>
                            </div>
                            ${percentage > 100 ? '<small class="text-danger">⚠️ Melebihi anggaran!</small>' : ''}
                        </div>
                    </div>
                `;
            }).join('');

            renderComparison();
        }

        function renderComparison() {
            const expenses = getCategoryExpenses();
            const total = Object.values(expenses).reduce((a, b) => a + b, 0);
            
            // Simulated average data for comparison
            const avgData = {
                'Makanan': 800000,
                'Transport': 500000,
                'Hiburan': 300000,
                'Belanja': 400000
            };

            let html = '<div class="row g-2">';
            Object.entries(avgData).forEach(([cat, avg]) => {
                const yours = expenses[cat] || 0;
                const diff = yours - avg;
                const status = diff > 0 ? 'danger' : 'success';
                const icon = diff > 0 ? '⬆️' : '⬇️';
                
                html += `
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-0">${cat}</h6>
                                        <small class="text-muted">Rata-rata: ${formatCurrency(avg)}</small>
                                    </div>
                                    <div class="text-end">
                                        <strong class="text-${status}">${icon} ${formatCurrency(Math.abs(diff))}</strong>
                                        <br><small>${yours > avg ? 'Lebih tinggi' : 'Lebih rendah'}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            document.getElementById('comparison').innerHTML = html;
        }

        // Utilities
        function formatCurrency(amount) {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(amount);
        }

        function formatDate(dateStr) {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }

        function showNotification(message) {
            alert(message);
        }

        function showSettings() {
            alert('Fitur pengaturan akan segera hadir! 🚀');
        }