let tasks = [];
let myChart = null;
let activeTimer = null;
let uiInterval = null;
let currentCalendarDate = new Date();

const catColors = {
    'TODAY': '#F44336', '簿記': '#EC407A', '財務': '#AB47BC',
    '管理': '#7E57C2', '監査': '#5C6BC0', '企業': '#42A5F5'
};

function initSync() {
    if (!window.db) { setTimeout(initSync, 100); return; }
    const tasksRef = window.dbRef(window.db, 'tasks');
    window.dbOnValue(tasksRef, (snapshot) => {
        const data = snapshot.val();
        tasks = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        renderTasks();
        if (document.getElementById('calendar-view').style.display === 'block') renderCalendar();
        if (document.getElementById('summary-view').style.display === 'block') renderChart();
    });
}

function saveToCloud() {
    if (!window.db) return;
    const sanitized = tasks.filter(t => t.id && t.name && t.name.trim() !== "");
    window.dbSet(window.dbRef(window.db, 'tasks'), sanitized);
}

// --- FIXED IMPORT LOGIC ---
window.importCSV = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const rows = e.target.result.split('\n');
        rows.forEach(row => {
            const cols = row.split(',').map(c => c.trim());
            if (cols.length >= 3 && cols[0] !== "") {
                const [name, cat, dateShort] = cols;
                const date = dateShort.length === 6 ? 
                    `20${dateShort.slice(0,2)}-${dateShort.slice(2,4)}-${dateShort.slice(4,6)}` : dateShort;
                
                tasks.push({
                    id: Date.now() + Math.random(),
                    name, category: cat, date,
                    completed: false, deleted: false, timeSpent: 0
                });
            }
        });
        saveToCloud();
        alert("Import successful!");
    };
    reader.readAsText(file);
};

// --- CALENDAR & PERCENTAGE LOGIC ---
window.changeMonth = (offset) => {
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

        const taskHtml = dayTasks.map(t => 
            `<div class="cal-t ${t.completed ? 'done' : ''}" style="border-left: 2px solid ${catColors[t.category] || '#333'}">${t.name}</div>`
        ).join('');

        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${!isThisMonth ? 'other' : ''} ${dStr === todayStr ? 'today' : ''}`;
        dayEl.innerHTML = `
            <div class="cal-h">
                <span>${d.getDate()}</span>
                ${total > 0 ? `<span class="cal-p p-${Math.floor(pct/34)}">${pct}%</span>` : ''}
            </div>
            <div class="cal-list">${taskHtml}</div>
        `;
        grid.appendChild(dayEl);
    }
}

// --- CORE UTILITIES ---
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
            list.innerHTML += `<li class="task-item ${t.completed?'completed':''}" style="border-left-color:${isOverdue?'#f44336':color}">
                <div class="task-info"><span class="task-date">${t.date.slice(2)}</span><span class="task-name">${t.name}</span></div>
                <div class="task-meta"><span id="timer-${t.id}" class="live-timer">${formatTime(t.timeSpent)}</span>
                <button class="btn-icon" onclick="toggleTimer(${t.id})">${activeTimer?.taskId===t.id?'⏱️':'▶'}</button>
                <button class="btn-icon" onclick="toggleComplete(${t.id})">✓</button>
                <button class="btn-icon danger" onclick="softDelete(${t.id})">×</button></div></li>`;
        }
    });
};

function formatTime(min) {
    const s = Math.floor(min * 60);
    return `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function startLiveUI() {
    clearInterval(uiInterval);
    uiInterval = setInterval(() => {
        if (!activeTimer) return;
        const disp = document.getElementById(`timer-${activeTimer.taskId}`);
        if (disp) {
            const t = tasks.find(x => x.id === activeTimer.taskId);
            disp.innerText = formatTime(t.timeSpent + (Date.now() - activeTimer.startTime) / 60000);
        }
    }, 1000);
}

window.showTab = function (tab) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    ['tasks-view', 'header-filter', 'summary-view', 'import-view', 'deleted-view', 'calendar-view'].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    document.getElementById(`${tab}-view`).style.display = 'block';
    if (tab === 'tasks') document.getElementById('header-filter').style.display = 'block';
    if (tab === 'calendar') renderCalendar();
    if (tab === 'summary') renderChart();
    renderTasks();
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

window.toggleComplete = (id) => { const t = tasks.find(x => x.id === id); t.completed = !t.completed; saveToCloud(); };
window.softDelete = (id) => { tasks.find(x => x.id === id).deleted = true; saveToCloud(); };
window.restoreTask = (id) => { tasks.find(x => x.id === id).deleted = false; saveToCloud(); };
window.hardDelete = (id) => { if(confirm("Delete permanently?")) { tasks = tasks.filter(t => t.id !== id); saveToCloud(); } };
window.fullReset = () => { if(confirm("Wipe all data?")) { window.dbSet(window.dbRef(window.db, 'tasks'), null); location.reload(); } };

function renderChart() {
    const cats = ['簿記', '財務', '管理', '監査', '企業'];
    const active = tasks.filter(t => !t.deleted);
    const data = cats.map(c => active.filter(t => t.category === c).reduce((a, t) => a + t.timeSpent, 0) / 60);
    const ctx = document.getElementById('studyChart'); if (!ctx) return;
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, { type: 'doughnut', data: { labels: cats, datasets: [{ data, backgroundColor: cats.map(c => catColors[c]), borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false } });
    document.getElementById('total-hours').innerText = data.reduce((a, b) => a + b, 0).toFixed(1);
}

document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && document.activeElement.id === 'task-input') window.addTask(); });
initSync();
