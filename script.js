const KEYS = {
    transactions: 'moneytrack_transactions',
    goal: 'moneytrack_goal',
    streak: 'moneytrack_streak',
    budgets: 'moneytrack_budgets'
};

const CAT_ICONS = {
    Food: '🍔',
    Transport: '🚌',
    Entertainment: '🎮',
    School: '📚',
    Shopping: '🛍️',
    Other: '📦'
};

let currentType = 'income';

// ── Data helpers ──────────────────────────────────────────────
function loadTransactions() {
    return JSON.parse(localStorage.getItem(KEYS.transactions) || '[]');
}

function saveTransactions(txns) {
    localStorage.setItem(KEYS.transactions, JSON.stringify(txns));
}

function loadGoal() {
    return JSON.parse(localStorage.getItem(KEYS.goal) || 'null');
}

function saveGoal(goal) {
    localStorage.setItem(KEYS.goal, JSON.stringify(goal));
}

function loadStreak() {
    return JSON.parse(localStorage.getItem(KEYS.streak) || '{"lastLogDate":null,"currentStreak":0}');
}

function saveStreak(s) {
    localStorage.setItem(KEYS.streak, JSON.stringify(s));
}

function loadBudgets() {
    return JSON.parse(localStorage.getItem(KEYS.budgets) || '{}');
}

function saveBudgets(b) {
    localStorage.setItem(KEYS.budgets, JSON.stringify(b));
}

// ── Date helpers ──────────────────────────────────────────────
function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

function weekStartStr() {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
}

function formatAmt(n) {
    return '฿' + Number(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    const [y, m, day] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

// ── Type toggle ───────────────────────────────────────────────
function setType(type) {
    currentType = type;
    const incBtn = document.getElementById('btn-income');
    const expBtn = document.getElementById('btn-expense');
    incBtn.className = 'toggle-btn' + (type === 'income' ? ' income-active' : '');
    expBtn.className = 'toggle-btn' + (type === 'expense' ? ' expense-active' : '');
    document.getElementById('category-group').style.display = type === 'expense' ? 'block' : 'none';
}

// ── Streak ────────────────────────────────────────────────────
function updateStreak() {
    const streak = loadStreak();
    const t = todayStr();
    if (streak.lastLogDate === t) return;
    if (streak.lastLogDate === yesterdayStr()) {
        streak.currentStreak += 1;
    } else {
        streak.currentStreak = 1;
    }
    streak.lastLogDate = t;
    saveStreak(streak);
}

// ── Add transaction ───────────────────────────────────────────
function addTransaction() {
    const desc = document.getElementById('description').value.trim();
    const rawAmt = document.getElementById('amount').value;
    const amount = parseFloat(rawAmt);
    const category = currentType === 'expense' ? document.getElementById('category').value : null;

    if (!desc) { alert('Please enter a description.'); return; }
    if (!rawAmt || isNaN(amount) || amount <= 0) { alert('Please enter a valid amount greater than 0.'); return; }

    if (currentType === 'expense') {
        const budgets = loadBudgets();
        const budget = budgets[category];
        if (budget) {
            const ws = weekStartStr();
            const existing = loadTransactions()
                .filter(t => t.type === 'expense' && t.category === category && t.date >= ws)
                .reduce((s, t) => s + t.amount, 0);
            const newTotal = existing + amount;
            if (newTotal > budget) {
                const ok = confirm(`⚠️ This will bring your ${category} spending to ${formatAmt(newTotal)} — over your ${formatAmt(budget)} weekly budget.\n\nAdd anyway?`);
                if (!ok) return;
            }
        }
    }

    const txns = loadTransactions();
    txns.unshift({ id: Date.now(), type: currentType, description: desc, category, amount, date: todayStr() });
    saveTransactions(txns);

    updateStreak();

    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';

    renderAll();
}

// ── Delete transaction ────────────────────────────────────────
function deleteTransaction(id) {
    const txns = loadTransactions().filter(t => t.id !== id);
    saveTransactions(txns);
    renderAll();
}

// ── Goal ─────────────────────────────────────────────────────
function setGoal() {
    const name = document.getElementById('goal-name').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value);
    if (!name) { alert('Please enter a goal name.'); return; }
    if (!target || target <= 0) { alert('Please enter a valid target amount.'); return; }
    saveGoal({ name, target });
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-target').value = '';
    renderGoal();
}

function clearGoal() {
    localStorage.removeItem(KEYS.goal);
    renderGoal();
}

// ── Savings calculator ────────────────────────────────────────
function calculateSavings() {
    const amount = parseFloat(document.getElementById('calc-amount').value);
    const days = parseInt(document.getElementById('calc-period').value);
    const resultEl = document.getElementById('calc-result');

    if (!amount || amount <= 0) { alert('Please enter a valid daily saving amount.'); return; }

    const total = amount * days;
    const sel = document.getElementById('calc-period');
    const periodLabel = sel.options[sel.selectedIndex].text;

    resultEl.style.display = 'block';
    resultEl.innerHTML = `
        Saving <strong>${formatAmt(amount)}</strong> every day for <strong>${periodLabel}</strong>:<br>
        <span class="big-number">${formatAmt(total)}</span>
        You'll have <strong>${formatAmt(total)}</strong> saved!
    `;
}

// ── Render: Header ─────────────────────────────────────────────
function renderHeader() {
    const txns = loadTransactions();
    const totalIn = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalOut = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = totalIn - totalOut;

    const balEl = document.getElementById('total-balance');
    balEl.textContent = formatAmt(net);
    balEl.style.color = net < 0 ? '#fca5a5' : 'white';

    const now = new Date();
    document.getElementById('today-date').textContent =
        now.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Render: Summary cards ──────────────────────────────────────
function renderSummary() {
    const txns = loadTransactions();
    const t = todayStr();
    const todayTxns = txns.filter(tx => tx.date === t);
    const earned = todayTxns.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const spent = todayTxns.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    const bal = earned - spent;

    document.getElementById('earned-today').textContent = formatAmt(earned);
    document.getElementById('spent-today').textContent = formatAmt(spent);

    const balEl = document.getElementById('balance-today');
    balEl.textContent = formatAmt(bal);
    balEl.style.color = bal < 0 ? 'var(--red)' : 'var(--indigo)';
}

// ── Render: Streak ─────────────────────────────────────────────
function renderStreak() {
    const { currentStreak } = loadStreak();
    const el = document.getElementById('streak-display');
    if (currentStreak === 0) {
        el.textContent = '🔥 Start your streak today!';
    } else if (currentStreak === 1) {
        el.textContent = '🔥 1 Day Streak — keep going!';
    } else {
        el.textContent = `🔥 ${currentStreak} Day Streak!`;
    }
}

// ── Render: Categories ─────────────────────────────────────────
function renderCategories() {
    const txns = loadTransactions();
    const ws = weekStartStr();
    const weekExp = txns.filter(t => t.type === 'expense' && t.date >= ws);

    const container = document.getElementById('categories-breakdown');

    if (weekExp.length === 0) {
        container.innerHTML = '<p class="empty-state">No expenses this week yet.</p>';
        return;
    }

    const totals = {};
    weekExp.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });

    const max = Math.max(...Object.values(totals));
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const budgets = loadBudgets();

    container.innerHTML = sorted.map(([cat, amt]) => {
        const budget = budgets[cat];
        let barPct, barStyle, amtClass;

        if (budget) {
            const ratio = amt / budget;
            barPct = Math.min(100, ratio * 100).toFixed(1);
            if (ratio >= 1) {
                barStyle = 'background: var(--red);';
                amtClass = 'over-budget';
            } else if (ratio >= 0.8) {
                barStyle = 'background: var(--orange);';
                amtClass = 'near-budget';
            } else {
                barStyle = '';
                amtClass = '';
            }
        } else {
            barPct = ((amt / max) * 100).toFixed(1);
            barStyle = '';
            amtClass = '';
        }

        return `
            <div class="category-row">
                <span class="cat-label">${CAT_ICONS[cat] || '📦'} ${cat}</span>
                <div class="cat-bar-bg">
                    <div class="cat-bar-fill" style="width:${barPct}%;${barStyle}"></div>
                </div>
                <div class="cat-right">
                    <span class="cat-amount ${amtClass}">${formatAmt(amt)}</span>
                    ${budget ? `<span class="cat-budget-sub">/ ${formatAmt(budget)}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ── Render: Goal ───────────────────────────────────────────────
function renderGoal() {
    const goal = loadGoal();
    const displayEl = document.getElementById('goal-display');
    const formEl = document.getElementById('goal-form');

    if (!goal) {
        displayEl.innerHTML = '';
        formEl.style.display = 'block';
        return;
    }

    const txns = loadTransactions();
    const totalIn = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalOut = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const saved = Math.max(0, totalIn - totalOut);
    const pct = Math.min(100, (saved / goal.target) * 100);
    const remaining = Math.max(0, goal.target - saved);
    const reached = remaining === 0;

    displayEl.innerHTML = `
        <div class="goal-info">
            <p class="goal-title">🎯 ${goal.name}</p>
            <p class="goal-sub">${formatAmt(saved)} saved of ${formatAmt(goal.target)} goal</p>
            <div class="progress-bg">
                <div class="progress-fill" style="width:${pct.toFixed(1)}%"></div>
            </div>
            <p class="goal-pct">
                ${pct.toFixed(1)}% complete
                ${reached ? ' — 🎉 Goal reached! Awesome!' : ` — ${formatAmt(remaining)} more to go`}
            </p>
        </div>
        <button class="btn-clear-goal" onclick="clearGoal()">Clear Goal</button>
    `;
    formEl.style.display = 'none';
}

// ── Render: History ────────────────────────────────────────────
function renderHistory() {
    const txns = loadTransactions().slice(0, 10);
    const container = document.getElementById('history-list');

    if (txns.length === 0) {
        container.innerHTML = '<p class="empty-state">No transactions yet. Add one above!</p>';
        return;
    }

    container.innerHTML = txns.map(t => {
        const icon = t.type === 'income' ? '💚' : (CAT_ICONS[t.category] || '📦');
        const meta = t.type === 'expense' && t.category
            ? `${t.category} · ${formatDate(t.date)}`
            : formatDate(t.date);
        const sign = t.type === 'income' ? '+' : '-';
        return `
            <div class="history-item">
                <span class="hist-icon">${icon}</span>
                <div class="hist-info">
                    <p class="hist-desc">${t.description}</p>
                    <p class="hist-meta">${meta}</p>
                </div>
                <span class="hist-amount ${t.type}">${sign}${formatAmt(t.amount)}</span>
                <button class="btn-delete" onclick="deleteTransaction(${t.id})" title="Delete">✕</button>
            </div>
        `;
    }).join('');
}

// ── Budget form ───────────────────────────────────────────────
function renderBudgetForm() {
    const budgets = loadBudgets();
    const container = document.getElementById('budget-inputs');
    container.innerHTML = Object.entries(CAT_ICONS).map(([cat, icon]) => `
        <div class="budget-row">
            <label class="budget-cat-label">${icon} ${cat}</label>
            <input type="number" id="budget-${cat}" placeholder="No limit (฿/week)" min="0" step="1"
                   value="${budgets[cat] !== undefined ? budgets[cat] : ''}">
        </div>
    `).join('');
}

function setBudgets() {
    const budgets = {};
    Object.keys(CAT_ICONS).forEach(cat => {
        const val = parseFloat(document.getElementById('budget-' + cat).value);
        if (val > 0) budgets[cat] = val;
    });
    saveBudgets(budgets);
    renderCategories();

    const btn = document.getElementById('btn-save-budgets');
    btn.textContent = 'Saved ✓';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = 'Save Budgets'; btn.disabled = false; }, 1500);
}

// ── Render all ─────────────────────────────────────────────────
function renderAll() {
    renderHeader();
    renderSummary();
    renderStreak();
    renderCategories();
    renderGoal();
    renderHistory();
}

// ── Init ──────────────────────────────────────────────────────
setType('income');
renderBudgetForm();
renderAll();
