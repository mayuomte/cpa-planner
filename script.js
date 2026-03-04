// --- Initial State & Global Access ---
let tasks = JSON.parse(localStorage.getItem('cpaTasks')) || [];
let myChart = null;
let activeTimer = null;
let uiInterval = null;

const catColors = {
    'TODAY': '#F44336', '簿記': '#EC407A', '財務': '#AB47BC',
    '管理': '#7E57C2', '監査': '#5C6BC0', '企業': '#42A5F5'
};

// --- Utilities ---
function formatTime(totalMinutes) {
    const totalSeconds = Math.floor(totalMinutes * 60);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// Data Sanitizer: Removes empty or corrupted tasks that cause "endless" lists
function sanitizeData() {
    tasks = tasks.filter(t => t.id && t.name && t.name.trim() !== "");
    localStorage.setItem('cpaTasks', JSON.stringify(tasks));
}

// --- Main Actions ---
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
    saveAndRender();
    input.value = '';
};

window.toggleTimer = function (id) {
    const t = tasks.find(x => x.id === id);
    if (activeTimer && activeTimer.taskId === id) {
        t.timeSpent += (Date.now() - activeTimer.startTime) / 60000;
        activeTimer = null;
        clearInterval(uiInterval);
    } else {
        if (activeTimer) window.toggleTimer(activeTimer.taskId);
        activeTimer = { taskId: id, startTime: Date.now() };
        startLiveUI();
    }
    saveAndRender();
};

window.toggleComplete = function (id) {
    const el = document.getElementById(`task-${id}`);
    if (el) el.classList.add('completed');
    setTimeout(() => {
        const t = tasks.find(x => x.id === id);
        if (activeTimer?.taskId === id) window.toggleTimer(id);
        t.completed = !t.completed;
        saveAndRender();
    }, 300);
};

window.softDelete = function (id) {
    const el = document.getElementById(`task-${id}`);
    if (el) el.classList.add('deleting');
    setTimeout(() => {
        const t = tasks.find(x => x.id === id);
        if (activeTimer?.taskId === id) window.toggleTimer(id);
        t.deleted = true;
        saveAndRender();
    }, 300);
};

window.editName = function (id) {
    const t = tasks.find(x => x.id === id);
    const n = prompt("Edit Task:", t.name);
    if (n) { t.name = n; saveAndRender(); }
};

// --- Bulk & Selection ---
window.toggleBulkBar = function () {
    const checked = document.querySelectorAll('.task-checkbox:checked');
    document.getElementById('bulk-action-bar').style.display = checked.length > 0 ? 'flex' : 'none';
};

window.selectAllTasks = function () {
    document.querySelectorAll('.task-checkbox').forEach(cb => cb.checked = true);
    window.toggleBulkBar();
};

window.bulkDelete = function () {
    const checked = document.querySelectorAll('.task-checkbox:checked');
    if (confirm(`${checked.length}件を削除しますか？`)) {
        checked.forEach(cb => {
            const id = parseFloat(cb.dataset.id);
            const t = tasks.find(x => x.id === id);
            if (t) t.deleted = true;
        });
        saveAndRender();
        document.getElementById('bulk-action-bar').style.display = 'none';
    }
};

// --- View Rendering ---
window.showTab = function (tab) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    ['tasks-view', 'header-filter', 'summary-view', 'import-view', 'deleted-view'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById(`${tab}-view`).style.display = 'block';
    if (tab === 'tasks') document.getElementById('header-filter').style.display = 'block';
    if (tab === 'summary') renderChart();
    renderTasks();
};

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

window.renderTasks = function () {
    const filter = document.getElementById('category-dropdown').value;
    const today = new Date().toISOString().split('T')[0];
    const list = document.getElementById('task-list');
    const dList = document.getElementById('deleted-list');
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
                    <input type="checkbox" class="task-checkbox" data-id="${t.id}" onchange="toggleBulkBar()">
                    <div class="task-info">
                        <span class="task-date">${t.date.slice(2)}</span>
                        <div class="task-name-row"><span class="task-name">${t.name}</span><button class="edit-btn" onclick="editName(${t.id})">✎</button></div>
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
    if (activeTimer) startLiveUI();
};

window.restoreTask = function (id) { tasks.find(x => x.id === id).deleted = false; saveAndRender(); };
window.hardDelete = function (id) { if (confirm("永久に削除しますか？")) { tasks = tasks.filter(t => t.id !== id); saveAndRender(); } };
window.fullReset = function () { if (confirm("全てのデータを初期化しますか？")) { localStorage.clear(); tasks = []; location.reload(); } };

window.importCSV = function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const rows = e.target.result.split(/\r?\n/).slice(1);
        rows.forEach(r => {
            const [n, c, d] = r.split(',').map(x => x?.trim());
            if (n) {
                let date = d;
                if (d && d.length === 6 && !d.includes('-')) date = `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`;
                tasks.push({ id: Date.now() + Math.random(), name: n, category: catColors[c] ? c : '簿記', date: date || new Date().toISOString().split('T')[0], completed: false, deleted: false, timeSpent: 0 });
            }
        });
        saveAndRender(); alert("インポート完了！"); window.showTab('tasks');
    };
    reader.readAsText(file);
};

function renderChart() {
    const cats = ['簿記', '財務', '管理', '監査', '企業'];
    const activeTasks = tasks.filter(t => !t.deleted);
    const data = cats.map(c => activeTasks.filter(t => t.category === c).reduce((a, t) => a + t.timeSpent, 0) / 60);
    if (myChart) myChart.destroy();
    myChart = new Chart(document.getElementById('studyChart'), {
        type: 'doughnut', data: { labels: cats, datasets: [{ data, backgroundColor: cats.map(c => catColors[c]), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
    document.getElementById('total-hours').innerText = data.reduce((a, b) => a + b, 0).toFixed(1);
}

function saveAndRender() { sanitizeData(); renderTasks(); }
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && document.activeElement.id === 'task-input') window.addTask(); });

sanitizeData();
renderTasks();