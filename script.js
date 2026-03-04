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

// --- Firebase Sync Logic ---
function initSync() {
    if (!window.db) {
        setTimeout(initSync, 100);
        return;
    }
    const tasksRef = window.dbRef(window.db, 'tasks');
    window.dbOnValue(tasksRef, (snapshot) => {
        const data = snapshot.val();
        tasks = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        isDataLoaded = true;
        renderTasks();
        if (document.getElementById('calendar-view').style.display === 'block') renderCalendar();
        if (document.getElementById('summary-view').style.display === 'block') renderChart();
    });
}

function saveToCloud() {
    if (!window.db || !isDataLoaded) return;
    const sanitizedTasks = tasks.filter(t => t.id && t.name && t.name.trim() !== "");
    window.dbSet(window.dbRef(window.db, 'tasks'), sanitizedTasks);
}

// --- Task Actions & Utilities ---
function formatTime(totalMinutes) {
    const totalSeconds = Math.floor(totalMinutes * 60);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

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

// --- Calendar Rendering ---
window.changeMonth = function(offset) {
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

    for (let i = 0; i < 42; i++) {
        const d = new Date(year, month, 1 + (i - firstDay));
        const dStr = d.toISOString().split('T')[0];
        const isThisMonth = d.getMonth() === month;
        if (i >= daysInMonth + firstDay && !isThisMonth) break;

        const dayTasks = tasks.filter(t => t.date === dStr && !t.deleted);
        const total = dayTasks.length;
        const done = dayTasks.filter(t => t.completed).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        let pctClass = 'pct-0';
        if (total > 0) {
            if (pct < 50) pctClass = 'pct-low';
            else if (pct < 100) pctClass = 'pct-mid';
            else pctClass = 'pct-high';
        }

        const taskHtml = dayTasks.map(t => 
            `<div class="cal-task ${t.completed ? 'done' : ''}" style="border-left: 2px solid ${catColors[t.category] || '#333'}">${t.name}</div>`
        ).join('');

        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${!isThisMonth ? 'other-month' : ''} ${dStr === todayStr ? 'today' : ''}`;
        dayEl.innerHTML = `
            <div class="cal-day-header">
                <span class="day-num">${d.getDate()}</span>
                ${total > 0 ? `<span class="day-pct ${pctClass}">${pct}%</span>` : ''}
            </div>
            <div class="cal-day-tasks">${taskHtml}</div>
        `;
        grid.appendChild(dayEl);
    }
}

// --- Original Logic Wrappers ---
window.showTab = function (tab) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    ['tasks-view', 'header-filter', 'summary-view', 'import-view', 'deleted-view', 'calendar-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    document.getElementById(`${tab}-view`).style.display = 'block';
    if (tab === 'tasks') document.getElementById('header-filter').style.display = 'block';
    if (tab === 'calendar') renderCalendar();
    if (tab === 'summary') renderChart();
    renderTasks();
};

// ... (Rest of toggleTimer, renderTasks, etc. from original script.js)
// Make sure to include your existing window.toggleTimer, window.toggleComplete, window.renderTasks, etc. here
initSync();
