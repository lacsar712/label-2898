(function () {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    let currentDate = new Date();
    let currentMonth = new Date();
    let selectedDate = new Date();
    let markedDates = new Set();
    let currentFilter = 'all';
    let currentReportData = null;
    let reportExists = false;

    const calPrevBtn = document.getElementById('dr-cal-prev');
    const calNextBtn = document.getElementById('dr-cal-next');
    const calTitle = document.getElementById('dr-cal-title');
    const calDays = document.getElementById('dr-calendar-days');
    const calTodayBtn = document.getElementById('dr-cal-today-btn');

    const currentDateEl = document.getElementById('dr-current-date');
    const reportStatusEl = document.getElementById('dr-report-status');

    const generateBtn = document.getElementById('dr-generate-btn');
    const refreshBtn = document.getElementById('dr-refresh-btn');

    const inboundCountEl = document.getElementById('dr-inbound-count');
    const inboundQuantityEl = document.getElementById('dr-inbound-quantity');
    const outboundCountEl = document.getElementById('dr-outbound-count');
    const outboundQuantityEl = document.getElementById('dr-outbound-quantity');
    const netChangeEl = document.getElementById('dr-net-change');
    const netTrendEl = document.getElementById('dr-net-trend');
    const totalCountEl = document.getElementById('dr-total-count');
    const generatedAtEl = document.getElementById('dr-generated-at');

    const transactionsBody = document.getElementById('dr-transactions-body');
    const emptyHint = document.getElementById('dr-empty-hint');

    const historyList = document.getElementById('dr-history-list');

    const filterTabs = document.querySelectorAll('.dr-filter-tab');

    const generateModal = document.getElementById('dr-generate-modal');
    const modalTitle = document.getElementById('dr-modal-title');
    const modalMessage = document.getElementById('dr-modal-message');
    const modalCancel = document.getElementById('dr-modal-cancel');
    const modalConfirm = document.getElementById('dr-modal-confirm');

    let pendingOverwrite = false;

    function init() {
        currentDate = new Date();
        currentMonth = new Date();
        selectedDate = new Date();

        renderCalendar();
        loadCalendarMarks();
        loadReport();
        loadHistoryList();
        bindEvents();
    }

    function bindEvents() {
        calPrevBtn.addEventListener('click', prevMonth);
        calNextBtn.addEventListener('click', nextMonth);
        calTodayBtn.addEventListener('click', goToToday);
        generateBtn.addEventListener('click', handleGenerate);
        refreshBtn.addEventListener('click', handleRefresh);

        filterTabs.forEach(tab => {
            tab.addEventListener('click', function () {
                filterTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                renderTransactions();
            });
        });

        modalCancel.addEventListener('click', closeModal);
        modalConfirm.addEventListener('click', confirmGenerate);
        generateModal.addEventListener('click', function (e) {
            if (e.target === generateModal) closeModal();
        });
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateDisplay(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[date.getDay()];
        return `${year}年${month}月${day}日 ${weekday}`;
    }

    function prevMonth() {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
        loadCalendarMarks();
        loadHistoryList();
    }

    function nextMonth() {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
        loadCalendarMarks();
        loadHistoryList();
    }

    function goToToday() {
        currentMonth = new Date();
        selectedDate = new Date();
        renderCalendar();
        loadCalendarMarks();
        loadReport();
        loadHistoryList();
    }

    function renderCalendar() {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        calTitle.textContent = `${year}年${month + 1}月`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const prevMonthLastDay = new Date(year, month, 0).getDate();

        calDays.innerHTML = '';

        const today = new Date();
        const todayStr = formatDate(today);
        const selectedStr = formatDate(selectedDate);

        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const dayEl = createDayElement(day, 'other-month');
            calDays.appendChild(dayEl);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const classes = [];

            if (dateStr === todayStr) classes.push('today');
            if (dateStr === selectedStr) classes.push('selected');
            if (markedDates.has(dateStr)) classes.push('has-report');

            const dayEl = createDayElement(day, classes.join(' '), dateStr);
            calDays.appendChild(dayEl);
        }

        const totalCells = startDay + daysInMonth;
        const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let day = 1; day <= remainingCells; day++) {
            const dayEl = createDayElement(day, 'other-month');
            calDays.appendChild(dayEl);
        }
    }

    function createDayElement(day, className, dateStr) {
        const div = document.createElement('div');
        div.className = `dr-cal-day ${className}`;
        div.textContent = day;

        if (dateStr) {
            div.addEventListener('click', function () {
                selectedDate = new Date(dateStr + 'T00:00:00');
                renderCalendar();
                loadReport();
            });
        }

        return div;
    }

    function loadCalendarMarks() {
        const yearMonth = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

        fetch(`/api/daily-report/calendar-marks/?year_month=${yearMonth}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                markedDates = new Set(data.marked_dates || []);
                renderCalendar();
            })
            .catch(() => {
                console.warn('加载日历标记失败');
            });
    }

    function loadReport() {
        const dateStr = formatDate(selectedDate);
        currentDateEl.textContent = formatDateDisplay(selectedDate);

        UI.showLoader();
        fetch(`/api/daily-report/detail/?report_date=${dateStr}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => {
                UI.hideLoader();
                if (r.status === 404) {
                    return { exists: false };
                }
                return r.json();
            })
            .then(data => {
                if (data.exists === false || !data.id) {
                    reportExists = false;
                    reportStatusEl.textContent = '未生成';
                    reportStatusEl.className = 'dr-report-status not-generated';
                    resetStats();
                    currentReportData = null;
                    loadTransactions();
                } else {
                    reportExists = true;
                    reportStatusEl.textContent = '已生成';
                    reportStatusEl.className = 'dr-report-status generated';
                    currentReportData = data;
                    updateStats(data);
                    renderTransactionsFromSnapshot(data.snapshot);
                }
            })
            .catch(err => {
                UI.hideLoader();
                console.error('加载日报失败:', err);
                UI.toast('加载日报失败', 'error');
            });
    }

    function resetStats() {
        inboundCountEl.textContent = '--';
        inboundQuantityEl.textContent = '--';
        outboundCountEl.textContent = '--';
        outboundQuantityEl.textContent = '--';
        netChangeEl.textContent = '--';
        netTrendEl.textContent = '--';
        totalCountEl.textContent = '--';
        generatedAtEl.textContent = '--';
    }

    function updateStats(data) {
        inboundCountEl.textContent = data.inbound_count;
        inboundQuantityEl.textContent = parseFloat(data.inbound_quantity).toFixed(2);

        outboundCountEl.textContent = data.outbound_count;
        outboundQuantityEl.textContent = parseFloat(data.outbound_quantity).toFixed(2);

        const netChange = parseFloat(data.net_change);
        netChangeEl.textContent = (netChange >= 0 ? '+' : '') + netChange.toFixed(2);

        if (netChange > 0) {
            netTrendEl.textContent = '↑ 增长';
            netTrendEl.style.color = '#4ecdc4';
        } else if (netChange < 0) {
            netTrendEl.textContent = '↓ 减少';
            netTrendEl.style.color = '#ff6b6b';
        } else {
            netTrendEl.textContent = '— 持平';
            netTrendEl.style.color = '#ffd93d';
        }

        const totalCount = parseInt(data.inbound_count) + parseInt(data.outbound_count);
        totalCountEl.textContent = totalCount;

        generatedAtEl.textContent = data.generated_at || '--';
    }

    function loadTransactions() {
        const dateStr = formatDate(selectedDate);

        fetch(`/api/daily-report/transactions/?report_date=${dateStr}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                currentReportData = currentReportData || {};
                currentReportData.transactions = data.transactions || [];
                renderTransactions();
            })
            .catch(err => {
                console.error('加载流水失败:', err);
            });
    }

    function renderTransactionsFromSnapshot(snapshot) {
        const inbound = snapshot.inbound_list || [];
        const outbound = snapshot.outbound_list || [];

        const transactions = [];
        inbound.forEach(item => {
            transactions.push({
                ...item,
                counterparty: item.supplier || '',
            });
        });
        outbound.forEach(item => {
            transactions.push({
                ...item,
                counterparty: item.receiver || '',
            });
        });

        transactions.sort((a, b) => a.doc_no.localeCompare(b.doc_no));
        currentReportData = currentReportData || {};
        currentReportData.transactions = transactions;
        renderTransactions();
    }

    function renderTransactions() {
        const transactions = (currentReportData && currentReportData.transactions) || [];

        let filtered = transactions;
        if (currentFilter === 'inbound') {
            filtered = transactions.filter(t => t.doc_type === 'inbound');
        } else if (currentFilter === 'outbound') {
            filtered = transactions.filter(t => t.doc_type === 'outbound');
        }

        transactionsBody.innerHTML = '';

        if (filtered.length === 0) {
            emptyHint.style.display = 'block';
            return;
        }

        emptyHint.style.display = 'none';

        filtered.forEach(item => {
            const tr = document.createElement('tr');

            const isInbound = item.doc_type === 'inbound';
            const typeClass = isInbound ? 'inbound' : 'outbound';

            tr.innerHTML = `
                <td class="dr-doc-no">${item.doc_no || ''}</td>
                <td><span class="dr-type-tag ${typeClass}">${item.doc_type_display || ''}</span></td>
                <td>${item.material_name || ''}</td>
                <td>${item.category || ''}</td>
                <td>${item.variety || ''}</td>
                <td class="dr-quantity ${typeClass}">${item.quantity || '0'}</td>
                <td>${item.unit || ''}</td>
                <td>${item.handler || ''}</td>
                <td>${item.counterparty || ''}</td>
                <td>${item.storage_area || ''}</td>
                <td>${item.remarks || ''}</td>
            `;

            transactionsBody.appendChild(tr);
        });
    }

    function loadHistoryList() {
        const yearMonth = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

        fetch(`/api/daily-report/list/?year_month=${yearMonth}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                historyList.innerHTML = '';

                const items = data.items || [];
                if (items.length === 0) {
                    historyList.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:20px 0;font-size:0.85rem;">本月暂无日报记录</div>';
                    return;
                }

                const selectedStr = formatDate(selectedDate);

                items.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'dr-history-item';
                    if (item.report_date === selectedStr) {
                        div.classList.add('active');
                    }

                    div.innerHTML = `
                        <div class="dr-history-date">${item.report_date}</div>
                        <div class="dr-history-summary">
                            <span class="dr-history-in">
                                <i class="bi bi-box-seam"></i> 入 ${item.inbound_count}笔 / ${parseFloat(item.inbound_quantity).toFixed(2)}
                            </span>
                            <span class="dr-history-out">
                                <i class="bi bi-box-arrow-up"></i> 出 ${item.outbound_count}笔 / ${parseFloat(item.outbound_quantity).toFixed(2)}
                            </span>
                        </div>
                    `;

                    div.addEventListener('click', function () {
                        selectedDate = new Date(item.report_date + 'T00:00:00');
                        currentMonth = new Date(selectedDate);
                        renderCalendar();
                        loadCalendarMarks();
                        loadReport();
                        loadHistoryList();
                    });

                    historyList.appendChild(div);
                });
            })
            .catch(err => {
                console.error('加载历史列表失败:', err);
            });
    }

    function handleGenerate() {
        const dateStr = formatDate(selectedDate);

        if (reportExists) {
            pendingOverwrite = true;
            modalTitle.textContent = '覆盖更新日报';
            modalMessage.textContent = `${dateStr} 的日报已存在，确定要覆盖更新吗？`;
            modalConfirm.textContent = '确定覆盖';
            openModal();
        } else {
            pendingOverwrite = false;
            modalTitle.textContent = '生成日报';
            modalMessage.textContent = `确定要生成 ${dateStr} 的日报吗？`;
            modalConfirm.textContent = '确定生成';
            openModal();
        }
    }

    function handleRefresh() {
        loadReport();
        loadCalendarMarks();
        loadHistoryList();
        UI.toast('已刷新', 'success');
    }

    function openModal() {
        generateModal.style.display = 'flex';
    }

    function closeModal() {
        generateModal.style.display = 'none';
        pendingOverwrite = false;
    }

    function confirmGenerate() {
        const dateStr = formatDate(selectedDate);

        UI.showLoader();
        fetch('/api/daily-report/generate/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                report_date: dateStr,
                overwrite: pendingOverwrite
            })
        })
            .then(r => r.json())
            .then(data => {
                UI.hideLoader();
                closeModal();

                if (data.success) {
                    UI.toast(data.message, 'success');
                    loadReport();
                    loadCalendarMarks();
                    loadHistoryList();
                } else {
                    if (data.exists) {
                        pendingOverwrite = true;
                        modalTitle.textContent = '覆盖更新日报';
                        modalMessage.textContent = data.message;
                        modalConfirm.textContent = '确定覆盖';
                        openModal();
                    } else {
                        UI.toast(data.message || '生成失败', 'error');
                    }
                }
            })
            .catch(err => {
                UI.hideLoader();
                closeModal();
                console.error('生成日报失败:', err);
                UI.toast('生成日报失败', 'error');
            });
    }

    init();
})();
