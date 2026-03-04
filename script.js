// --- Initial State ---
let tasks = [];
let myChart = null;
let activeTimer = null;
let uiInterval = null;
let isDataLoaded = false;
let currentCalendarDate = new Date();

const catColors = {
    'TODAY': '#F44336', '簿記': '#EC407A', '財務': '#AB47BC',
    '管理': '#7E57C2', '監査': '#5C6BC0', '企業': '#42A5F5'
};

// --- Firebase Sync ---
function initSync() {
    if (!window.db) { setTimeout(initSync, 100); return; }
    const tasksRef = window.dbRef(window.db, 'tasks');
    window.dbOnValue(tasksRef, (snapshot) => {
        const data = snapshot.val();
        tasks = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        isDataLoaded = true;
        renderTasks();
        if (document.getElementById('summary-view').style.display === 'block') renderChart();
        if (document.getElementById('calendar-view').style.display === 'block') renderCalendar();
    });
}

function saveToCloud() {
    if (!window.db || !isDataLoaded) return;
    const sanitizedTasks = tasks.filter(t => t.id && t.name && t.name.trim() !== "");
    window.dbSet(window.dbRef(window.db, 'tasks'), sanitizedTasks);
}

// --- Task Actions ---
window.addTask = function () {
    const input = document.getElementById('task-input');
    const val = input.value.trim();
    if (!val) return;
    const match = val.match(/\b(\d{2})(\d{2})(\d{2})\b/);
    let date = new Date().toISOString().split('T')[0];
    let name = val;
    if (match) {
        date = `20${match[1]}-${match[2]}-${match[3]}`;
        name = val.replace(match[0], '').trim();
    }
    const cat = document.getElementById('category-dropdown').value;
    tasks.push({
        id: Date.now() + Math.random(),
        name, date,
        category: cat === 'TODAY' ? '簿記' : cat,
        completed: false, deleted: false, timeSpent: 0
    });
    saveToCloud();
    input.value = '';
};

window.toggleTimer = function (id) {
    const t = tasks.find(x => x.id === id);
    if (activeTimer && activeTimer.taskId === id) {
        t.timeSpent += (Date.now() - activeTimer.startTime) / 60000;
        activeTimer = null;
        clearInterval(uiInterval);
        saveToCloud();
    } else {
        if (activeTimer) window.toggleTimer(activeTimer.taskId);
        activeTimer = { taskId: id, startTime: Date.now() };
        startLiveUI();
    }
};

window.toggleComplete = function (id) {
    const t = tasks.find(x => x.id === id);
    if (activeTimer?.taskId === id) window.toggleTimer(id);
    t.completed = !t.completed;
    saveToCloud();
};

window.softDelete = function (id) {
    const t = tasks.find(x => x.id === id);
    if (activeTimer?.taskId === id) window.toggleTimer(id);
    t.deleted = true;
    saveToCloud();
};

// --- View Rendering ---
window.renderTasks = function () {
    const filter = document.getElementById('category-dropdown').value;
    const today = new Date().toISOString().split('T')[0];
    const list = document.getElementById('task-list');
    const dList = document.getElementById('deleted-list');
    if (!list || !dList) return;
    list.innerHTML = ''; dList.innerHTML = '';
    tasks.forEach(t => {
        if (t.deleted) {
            dList.innerHTML += `<li class="task-item"><div class="task-info"><span>${t.name}</span></div>
                <button class="btn-icon" onclick="restoreTask(${t.id})">↺</button><button class="btn-icon danger" onclick="hardDelete(${t.id})">🗑️</button></li>`;
            return;
        }
        if ((filter === 'TODAY' && t.date <= today && !t.completed) || t.category === filter) {
            const color = catColors[t.category] || '#333';
            const isOverdue = t.date < today && !t.completed;
            list.innerHTML += `
                <li class="task-item" id="task-${t.id}" style="border-left-color: ${isOverdue ? '#f44336' : color}">
                    <div class="task-info">
                        <span class="task-date">${t.date.slice(2)}</span>
                        <div class="task-name-row"><span class="task-name">${t.name}</span></div>
                    </div>
                    <div class="task-meta">
                        <span id="timer-${t.id}" class="live-timer">${formatTime(t.timeSpent)}</span>
                        <span class="task-tag" style="background:${color}">${t.category}</span>
                        <button class="btn-icon" onclick="toggleTimer(${t.id})">${activeTimer?.taskId === t.id ? '⏱️' : '▶'}</button>
                        <button class="btn-icon" onclick="toggleComplete(${t.id})">✓</button>
                        <button class="btn-icon danger" onclick="softDelete(${t.id})">×</button>
                    </div>
                </li>`;
        }
    });
};

// --- Calendar Logic ---
window.changeMonth = function (offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
};

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-month-year');
    if (!grid) return;
    grid.innerHTML = '';
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    label.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentCalendarDate);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];
    const activeTasks = tasks.filter(t => !t.deleted);

    for (let i = 0; i < 42; i++) {
        const d = new Date(year, month, 1 + (i - firstDay));
        const dStr = d.toISOString().split('T')[0];
        const isThisMonth = d.getMonth() === month;
        if (i >= daysInMonth + firstDay && !isThisMonth) break;

        const daysTasks = activeTasks.filter(t => t.date === dStr);
        const total = daysTasks.length;
        const completed = daysTasks.filter(t => t.completed).length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        let pctClass = 'pct-0';
        if (total > 0) {
            if (pct < 50) pctClass = 'pct-low';
            else if (pct < 100) pctClass = 'pct-mid';
            else pctClass = 'pct-high';
        }

        const taskItemsHtml = daysTasks.map(t =>
            `<div class="cal-task-name ${t.completed ? 'done' : ''}">${t.name}</div>`
        ).join('');

        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${!isThisMonth ? 'other-month' : ''} ${dStr === todayStr ? 'today' : ''}`;
        dayEl.innerHTML = `
            <div class="cal-day-header">
                <span class="day-number">${d.getDate()}</span>
                ${total > 0 ? `<span class="day-percentage ${pctClass}">${pct}%</span>` : ''}
            </div>
            <div class="cal-task-list">${taskItemsHtml}</div>
        `;
        grid.appendChild(dayEl);
    }
}

function startLiveUI() {
    clearInterval(uiInterval);
    uiInterval = setInterval(() => {
        if (!activeTimer) return;
        const disp = document.getElementById(`timer-${activeTimer.taskId}`);
        if (disp) {
            const t = tasks.find(x => x.id === activeTimer.taskId);
            const cur = (Date.now() - activeTimer.startTime) / 60000;
            disp.innerText = formatTime(t.timeSpent + cur);
        }
    }, 1000);
}

window.showTab = function (tab) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    ['tasks-view', 'header-filter', 'summary-view', 'import-view', 'deleted-view', 'calendar-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    document.getElementById(`${tab}-view`).style.display = 'block';
    if (tab === 'tasks') document.getElementById('header-filter').style.display = 'block';
    if (tab === 'summary') renderChart();
    if (tab === 'calendar') renderCalendar();
    renderTasks();
};

window.formatTime = formatTime;
window.restoreTask = function (id) { tasks.find(x => x.id === id).deleted = false; saveToCloud(); };
window.hardDelete = function (id) { if (confirm("永久に削除しますか？")) { tasks = tasks.filter(t => t.id !== id); saveToCloud(); } };
window.fullReset = function () { if (confirm("初期化しますか？")) { window.dbSet(window.dbRef(window.db, 'tasks'), null); location.reload(); } };

function renderChart() {
    const cats = ['簿記', '財務', '管理', '監査', '企業'];
    const activeTasks = tasks.filter(t => !t.deleted);
    const data = cats.map(c => activeTasks.filter(t => t.category === c).reduce((a, t) => a + t.timeSpent, 0) / 60);
    const ctx = document.getElementById('studyChart');
    if (!ctx) return;
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut', data: { labels: cats, datasets: [{ data, backgroundColor: cats.map(c => catColors[c]), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
    document.getElementById('total-hours').innerText = data.reduce((a, b) => a + b, 0).toFixed(1);
}

document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && document.activeElement.id === 'task-input') window.addTask(); });
initSync();
