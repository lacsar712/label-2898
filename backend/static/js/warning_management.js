(function () {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')
        ? document.querySelector('[name=csrfmiddlewaretoken]').value
        : '';

    const statCards = document.querySelectorAll('.wm-stat-card');
    const statCritical = document.getElementById('wm-stat-critical');
    const statLow = document.getElementById('wm-stat-low');
    const statNormal = document.getElementById('wm-stat-normal');
    const statTotal = document.getElementById('wm-stat-total');

    const tableBody = document.getElementById('wm-table-body');
    const pageInfo = document.getElementById('wm-page-info');
    const prevBtn = document.getElementById('wm-page-prev');
    const nextBtn = document.getElementById('wm-page-next');
    const filterBtn = document.getElementById('wm-filter-btn');
    const resetBtn = document.getElementById('wm-reset-btn');
    const recalculateBtn = document.getElementById('wm-recalculate-btn');
    const restockBtn = document.getElementById('wm-restock-btn');

    const filterLevel = document.getElementById('wm-filter-level');
    const filterCategory = document.getElementById('wm-filter-category');
    const filterKeyword = document.getElementById('wm-filter-keyword');

    const historyBody = document.getElementById('wm-history-body');
    const historyPageInfo = document.getElementById('wm-history-page-info');
    const historyPrevBtn = document.getElementById('wm-history-page-prev');
    const historyNextBtn = document.getElementById('wm-history-page-next');
    const snapshotDateSelect = document.getElementById('wm-snapshot-date');
    const loadSnapshotBtn = document.getElementById('wm-load-snapshot-btn');
    const backRealtimeBtn = document.getElementById('wm-back-realtime-btn');
    const snapshotDateBadge = document.getElementById('wm-snapshot-date-badge');
    const historyCritical = document.getElementById('wm-history-critical');
    const historyLow = document.getElementById('wm-history-low');
    const historyNormal = document.getElementById('wm-history-normal');
    const historyTotal = document.getElementById('wm-history-total');

    const restockModal = document.getElementById('wm-restock-modal');
    const restockCloseBtn = document.getElementById('wm-restock-close');
    const restockBody = document.getElementById('wm-restock-body');
    const restockNo = document.getElementById('wm-restock-no');
    const restockDate = document.getElementById('wm-restock-date');
    const restockCount = document.getElementById('wm-restock-count');
    const restockTotal = document.getElementById('wm-restock-total');

    let currentPage = 1;
    let totalPages = 1;
    let currentLevelFilter = '';
    let currentData = [];

    let historyPage = 1;
    let historyTotalPages = 1;
    let isViewingSnapshot = false;
    let currentSnapshotDate = '';

    let flatCategories = [];

    function init() {
        loadInitialData();
        bindEvents();
    }

    function bindEvents() {
        filterBtn.addEventListener('click', function () {
            syncLevelFromSelect();
            currentPage = 1;
            loadWarningList();
        });

        resetBtn.addEventListener('click', function () {
            filterLevel.value = '';
            filterCategory.value = '';
            filterKeyword.value = '';
            currentLevelFilter = '';
            clearStatCardActive();
            currentPage = 1;
            loadWarningList();
            loadWarningStats();
        });

        prevBtn.addEventListener('click', function () {
            if (currentPage > 1) {
                currentPage--;
                loadWarningList();
            }
        });

        nextBtn.addEventListener('click', function () {
            if (currentPage < totalPages) {
                currentPage++;
                loadWarningList();
            }
        });

        filterKeyword.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                syncLevelFromSelect();
                currentPage = 1;
                loadWarningList();
            }
        });

        filterLevel.addEventListener('change', function () {
            syncLevelFromSelect();
        });

        statCards.forEach(card => {
            card.addEventListener('click', function () {
                const level = this.dataset.level;
                if (!level) return;

                if (currentLevelFilter === level) {
                    currentLevelFilter = '';
                    clearStatCardActive();
                } else {
                    currentLevelFilter = level;
                    setStatCardActive(level);
                }

                filterLevel.value = currentLevelFilter;
                currentPage = 1;
                loadWarningList();
            });
        });

        recalculateBtn.addEventListener('click', handleRecalculate);
        restockBtn.addEventListener('click', function () {
            openRestockSuggestion();
        });

        restockCloseBtn.addEventListener('click', closeRestockModal);
        restockModal.addEventListener('click', function (e) {
            if (e.target === restockModal) closeRestockModal();
        });

        tableBody.addEventListener('click', handleTableClick);

        loadSnapshotBtn.addEventListener('click', function () {
            const date = snapshotDateSelect.value;
            if (!date) {
                UI.toast('请选择快照日期', 'error');
                return;
            }
            isViewingSnapshot = true;
            currentSnapshotDate = date;
            historyPage = 1;
            loadSnapshotData();
            loadSnapshotSummary();
        });

        backRealtimeBtn.addEventListener('click', function () {
            isViewingSnapshot = false;
            currentSnapshotDate = '';
            snapshotDateBadge.style.display = 'none';
            backRealtimeBtn.style.display = 'none';
            historyBody.innerHTML = '<tr class="wm-empty-row"><td colspan="8">请选择日期并点击"查看快照"以浏览历史预警状态</td></tr>';
            historyCritical.textContent = '0';
            historyLow.textContent = '0';
            historyNormal.textContent = '0';
            historyTotal.textContent = '0';
            historyPageInfo.textContent = '';
            historyPrevBtn.disabled = true;
            historyNextBtn.disabled = true;
        });

        historyPrevBtn.addEventListener('click', function () {
            if (historyPage > 1) {
                historyPage--;
                loadSnapshotData();
            }
        });

        historyNextBtn.addEventListener('click', function () {
            if (historyPage < historyTotalPages) {
                historyPage++;
                loadSnapshotData();
            }
        });
    }

    function clearStatCardActive() {
        statCards.forEach(card => card.classList.remove('active'));
    }

    function setStatCardActive(level) {
        clearStatCardActive();
        if (!level) return;
        statCards.forEach(card => {
            if (card.dataset.level === level) {
                card.classList.add('active');
            }
        });
    }

    function syncLevelFromSelect() {
        const selectLevel = filterLevel.value || '';
        currentLevelFilter = selectLevel;
        if (selectLevel) {
            setStatCardActive(selectLevel);
        } else {
            clearStatCardActive();
        }
    }

    function loadInitialData() {
        UI.showLoader();
        Promise.all([
            fetch('/api/material-categories/flat/?parent_only=true', {
                headers: { 'X-CSRFToken': csrfToken }
            }).then(r => r.json()),
        ])
            .then(([catData]) => {
                flatCategories = catData.items || [];
                updateCategorySelect();
                loadWarningStats();
                loadWarningList();
                loadAvailableSnapshotDates();
                UI.hideLoader();
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('加载数据失败', 'error');
            });
    }

    function updateCategorySelect() {
        const currentValue = filterCategory.value;
        filterCategory.innerHTML = '<option value="">全部品类</option>';

        flatCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `[${cat.code}] ${cat.name}`;
            filterCategory.appendChild(option);
        });

        if (currentValue) {
            filterCategory.value = currentValue;
        }
    }

    function loadWarningStats() {
        fetch('/api/warning/stats/', {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                statCritical.textContent = data.critical || 0;
                statLow.textContent = data.low || 0;
                statNormal.textContent = data.normal || 0;
                statTotal.textContent = data.total || 0;
            })
            .catch(() => {
                UI.toast('加载统计数据失败', 'error');
            });
    }

    function loadWarningList() {
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('page_size', '10');

        const level = filterLevel.value || currentLevelFilter;
        const categoryId = filterCategory.value;
        const keyword = filterKeyword.value.trim();

        if (level) params.set('level', level);
        if (categoryId) params.set('category_id', categoryId);
        if (keyword) params.set('keyword', keyword);

        UI.showLoader();
        fetch(`/api/warning/list/?${params.toString()}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                UI.hideLoader();
                currentData = data.items || [];
                totalPages = data.total_pages;
                renderTable(currentData);
                pageInfo.textContent = `共 ${data.total} 条 / 第 ${data.page} 页 / 共 ${data.total_pages} 页`;
                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= totalPages;
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('加载预警列表失败', 'error');
            });
    }

    function renderTable(items) {
        tableBody.innerHTML = '';

        if (items.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'wm-empty-row';
            tr.innerHTML = '<td colspan="10">暂无预警数据</td>';
            tableBody.appendChild(tr);
            return;
        }

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.id = item.id;

            const warningTag = getWarningTag(item.warning_level, item.warning_level_display);

            const stockColor = getStockColor(item.warning_level);
            const gapClass = item.gap_quantity > 0 ? 'wm-gap-cell' : 'wm-gap-cell wm-gap-zero';
            const suggestClass = item.suggested_replenish > 0 ? 'wm-suggest-cell' : 'wm-suggest-cell wm-suggest-zero';

            const canRestock = item.warning_level !== 'normal';

            tr.innerHTML = `
                <td>${warningTag}</td>
                <td class="wm-code-cell">${item.code}</td>
                <td class="wm-name-cell">${item.name}</td>
                <td>${item.specification || '-'}</td>
                <td>${item.category_name || '-'}</td>
                <td class="wm-stock-cell" style="color: ${stockColor}">${item.current_stock} ${item.unit_abbr || item.unit_name || ''}</td>
                <td class="wm-num-cell">${item.warning_threshold}</td>
                <td class="${gapClass}">${item.gap_quantity > 0 ? item.gap_quantity : '-'}</td>
                <td class="${suggestClass}">${item.suggested_replenish > 0 ? item.suggested_replenish : '-'}</td>
                <td class="wm-actions">
                    <button class="wm-action-btn wm-restock-btn" data-action="restock" data-id="${item.id}" 
                        title="生成补货建议" ${!canRestock ? 'disabled' : ''}>
                        <i class="bi bi-cart-plus"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });
    }

    function getWarningTag(level, display) {
        const cls = {
            'critical': 'wm-tag-critical',
            'low': 'wm-tag-low',
            'normal': 'wm-tag-normal'
        }[level] || 'wm-tag-normal';

        return `<span class="wm-warning-tag ${cls}">${display || '正常'}</span>`;
    }

    function getStockColor(level) {
        return {
            'critical': '#ff6b6b',
            'low': '#ffa502',
            'normal': '#00ff88'
        }[level] || 'rgba(255,255,255,0.85)';
    }

    function handleTableClick(e) {
        const restockBtnEl = e.target.closest('.wm-restock-btn');
        if (restockBtnEl && !restockBtnEl.disabled) {
            e.stopPropagation();
            const id = restockBtnEl.dataset.id;
            openRestockSuggestion(id);
        }
    }

    function handleRecalculate() {
        UI.confirm(
            '全量重算确认',
            '确定要重新计算所有品种的预警状态吗？这将生成或更新今日的预警快照。',
            true,
            () => {
                UI.showLoader();
                fetch('/api/warning/recalculate/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    }
                })
                    .then(r => r.json())
                    .then(result => {
                        UI.hideLoader();
                        if (result.success) {
                            UI.toast(result.message);
                            loadWarningStats();
                            loadWarningList();
                            loadAvailableSnapshotDates();
                        } else {
                            UI.toast(result.message || '重算失败', 'error');
                        }
                    })
                    .catch(() => {
                        UI.hideLoader();
                        UI.toast('网络连接异常', 'error');
                    });
            }
        );
    }

    function openRestockSuggestion(singleId) {
        const params = new URLSearchParams();
        if (singleId) {
            params.set('ids', singleId);
            params.set('critical_only', 'false');
        } else {
            params.set('critical_only', 'false');
        }

        UI.showLoader();
        fetch(`/api/warning/restock-suggestion/?${params.toString()}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(result => {
                UI.hideLoader();
                if (result.success) {
                    renderRestockModal(result);
                    restockModal.style.display = 'flex';
                } else {
                    UI.toast(result.message || '生成补货建议失败', 'error');
                }
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('网络连接异常', 'error');
            });
    }

    function renderRestockModal(data) {
        restockNo.textContent = data.suggestion_no || '-';
        restockDate.textContent = data.generate_date || '-';
        restockCount.textContent = `${data.total_count || 0} 项`;
        restockTotal.textContent = `${data.total_suggested || 0}`;

        restockBody.innerHTML = '';

        if (!data.items || data.items.length === 0) {
            restockBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:rgba(255,255,255,0.4); font-style:italic;">暂无需要补货的物资</td></tr>';
            return;
        }

        data.items.forEach(item => {
            const warningTag = getWarningTag(item.warning_level, item.warning_level_display);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="wm-code-cell">${item.code}</td>
                <td>${item.name}</td>
                <td>${item.specification || '-'}</td>
                <td>${item.category_name || '-'}</td>
                <td>${item.unit_abbr || item.unit_name || '-'}</td>
                <td class="wm-num-cell">${item.current_stock}</td>
                <td class="wm-num-cell">${item.warning_threshold}</td>
                <td class="wm-num-cell" style="color:#ff6b6b;">${item.gap_quantity}</td>
                <td class="wm-restock-suggest-cell">${item.suggested_replenish}</td>
            `;
            restockBody.appendChild(tr);
        });
    }

    function closeRestockModal() {
        restockModal.style.display = 'none';
    }

    function loadAvailableSnapshotDates() {
        fetch('/api/warning/snapshot/summary/', {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                const dates = data.available_dates || [];
                updateSnapshotDateSelect(dates);
            })
            .catch(() => {
            });
    }

    function updateSnapshotDateSelect(dates) {
        const currentValue = snapshotDateSelect.value;
        snapshotDateSelect.innerHTML = '';

        if (!dates || dates.length === 0) {
            snapshotDateSelect.innerHTML = '<option value="">暂无快照</option>';
            return;
        }

        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            snapshotDateSelect.appendChild(option);
        });

        if (currentValue && dates.includes(currentValue)) {
            snapshotDateSelect.value = currentValue;
        }
    }

    function loadSnapshotSummary() {
        const params = new URLSearchParams();
        params.set('snapshot_date', currentSnapshotDate);

        fetch(`/api/warning/snapshot/summary/?${params.toString()}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                historyCritical.textContent = data.critical || 0;
                historyLow.textContent = data.low || 0;
                historyNormal.textContent = data.normal || 0;
                historyTotal.textContent = data.total || 0;

                snapshotDateBadge.style.display = 'inline-block';
                snapshotDateBadge.textContent = `快照日期: ${data.snapshot_date || currentSnapshotDate}`;
                backRealtimeBtn.style.display = 'inline-flex';
            })
            .catch(() => {
                UI.toast('加载快照统计失败', 'error');
            });
    }

    function loadSnapshotData() {
        const params = new URLSearchParams();
        params.set('snapshot_date', currentSnapshotDate);
        params.set('page', historyPage);
        params.set('page_size', '10');

        UI.showLoader();
        fetch(`/api/warning/snapshot/list/?${params.toString()}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                UI.hideLoader();
                historyTotalPages = data.total_pages;
                renderHistoryTable(data.items || []);
                historyPageInfo.textContent = `共 ${data.total} 条 / 第 ${data.page} 页 / 共 ${data.total_pages} 页`;
                historyPrevBtn.disabled = historyPage <= 1;
                historyNextBtn.disabled = historyPage >= historyTotalPages;

                if (data.available_dates && data.available_dates.length > 0) {
                    updateSnapshotDateSelect(data.available_dates);
                }
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('加载快照数据失败', 'error');
            });
    }

    function renderHistoryTable(items) {
        historyBody.innerHTML = '';

        if (items.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'wm-empty-row';
            tr.innerHTML = '<td colspan="8">该日期暂无快照数据</td>';
            historyBody.appendChild(tr);
            return;
        }

        items.forEach(item => {
            const tr = document.createElement('tr');

            const warningTag = getWarningTag(item.warning_level, item.warning_level_display);
            const stockColor = getStockColor(item.warning_level);
            const gapQty = parseFloat(item.gap_quantity) || 0;
            const suggestQty = parseFloat(item.suggested_replenish) || 0;
            const gapClass = gapQty > 0 ? 'wm-gap-cell' : 'wm-gap-cell wm-gap-zero';
            const suggestClass = suggestQty > 0 ? 'wm-suggest-cell' : 'wm-suggest-cell wm-suggest-zero';

            tr.innerHTML = `
                <td>${warningTag}</td>
                <td class="wm-code-cell">${item.variety_code}</td>
                <td class="wm-name-cell">${item.variety_name}</td>
                <td>${item.category_name || '-'}</td>
                <td class="wm-stock-cell" style="color: ${stockColor}">${item.current_stock} ${item.unit_name || ''}</td>
                <td class="wm-num-cell">${item.warning_threshold}</td>
                <td class="${gapClass}">${gapQty > 0 ? item.gap_quantity : '-'}</td>
                <td class="${suggestClass}">${suggestQty > 0 ? item.suggested_replenish : '-'}</td>
            `;

            historyBody.appendChild(tr);
        });
    }

    init();
})();
