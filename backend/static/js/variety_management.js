(function () {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    const categoryTree = document.getElementById('vm-category-tree');
    const categoryBadge = document.getElementById('vm-category-badge');
    const resetCategoryBtn = document.getElementById('vm-reset-category-btn');

    const tableBody = document.getElementById('vm-table-body');
    const pageInfo = document.getElementById('vm-page-info');
    const prevBtn = document.getElementById('vm-page-prev');
    const nextBtn = document.getElementById('vm-page-next');
    const filterBtn = document.getElementById('vm-filter-btn');
    const resetBtn = document.getElementById('vm-reset-btn');
    const addBtn = document.getElementById('vm-add-btn');

    const filterName = document.getElementById('vm-filter-name');
    const filterActive = document.getElementById('vm-filter-active');

    const formModal = document.getElementById('vm-form-modal');
    const form = document.getElementById('vm-form');
    const formCancelBtn = document.getElementById('vm-form-cancel');
    const modalTitle = document.getElementById('vm-modal-title');

    const inputCategory = document.getElementById('vm-input-category');
    const inputCodePrefix = document.getElementById('vm-input-code-prefix');
    const inputCodeSuffix = document.getElementById('vm-input-code-suffix');
    const inputName = document.getElementById('vm-input-name');
    const inputSpec = document.getElementById('vm-input-spec');
    const inputUnit = document.getElementById('vm-input-unit');
    const inputStorage = document.getElementById('vm-input-storage');
    const inputShelfLife = document.getElementById('vm-input-shelf-life');
    const inputWarning = document.getElementById('vm-input-warning');
    const inputRemarks = document.getElementById('vm-input-remarks');
    const inputActive = document.getElementById('vm-input-active');
    const activeLabel = document.getElementById('vm-active-label');

    const detailSidebar = document.getElementById('vm-detail-sidebar');
    const detailContent = document.getElementById('vm-detail-content');
    const closeDetailBtn = document.getElementById('vm-close-detail');

    let categoryTreeData = [];
    let flatCategories = [];
    let expandedCategoryIds = new Set();
    let selectedCategoryId = null;
    let selectedVarietyId = null;
    let currentPage = 1;
    let totalPages = 1;
    let editingId = null;
    let currentData = [];

    function init() {
        loadInitialData();
        bindEvents();
    }

    function bindEvents() {
        filterBtn.addEventListener('click', function () {
            currentPage = 1;
            loadVarieties();
        });

        resetBtn.addEventListener('click', function () {
            filterName.value = '';
            filterActive.value = '';
            currentPage = 1;
            loadVarieties();
        });

        resetCategoryBtn.addEventListener('click', function () {
            selectedCategoryId = null;
            categoryBadge.style.display = 'none';
            categoryBadge.textContent = '';
            clearCategorySelection();
            currentPage = 1;
            loadVarieties();
        });

        prevBtn.addEventListener('click', function () {
            if (currentPage > 1) {
                currentPage--;
                loadVarieties();
            }
        });

        nextBtn.addEventListener('click', function () {
            if (currentPage < totalPages) {
                currentPage++;
                loadVarieties();
            }
        });

        addBtn.addEventListener('click', openCreateModal);
        formCancelBtn.addEventListener('click', closeFormModal);
        formModal.addEventListener('click', function (e) {
            if (e.target === formModal) closeFormModal();
        });

        inputActive.addEventListener('change', function () {
            activeLabel.textContent = this.checked ? '已启用' : '已禁用';
        });

        inputCategory.addEventListener('change', handleCategoryChange);

        form.addEventListener('submit', handleFormSubmit);

        tableBody.addEventListener('click', handleTableClick);

        closeDetailBtn.addEventListener('click', closeDetailSidebar);

        filterName.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                currentPage = 1;
                loadVarieties();
            }
        });
    }

    function loadInitialData() {
        UI.showLoader();
        Promise.all([
            fetch('/api/material-categories/tree/', {
                headers: { 'X-CSRFToken': csrfToken }
            }).then(r => r.json()),
            fetch('/api/material-categories/flat/', {
                headers: { 'X-CSRFToken': csrfToken }
            }).then(r => r.json()),
            fetch('/api/units/?page_size=100&is_active=true', {
                headers: { 'X-CSRFToken': csrfToken }
            }).then(r => r.json()),
            fetch('/api/storage-areas/', {
                headers: { 'X-CSRFToken': csrfToken }
            }).then(r => r.json())
        ])
            .then(([treeData, flatData, unitsData, storageData]) => {
                UI.hideLoader();
                categoryTreeData = treeData;
                flatCategories = flatData.items || [];
                renderCategoryTree();
                updateCategorySelect();
                updateUnitSelect(unitsData.items || []);
                updateStorageSelect(Array.isArray(storageData) ? storageData : []);
                loadVarieties();
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('加载数据失败', 'error');
            });
    }

    function renderCategoryTree() {
        categoryTree.innerHTML = '';

        if (!categoryTreeData || categoryTreeData.length === 0) {
            categoryTree.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.4); font-size: 0.85rem;">暂无品类数据</div>';
            return;
        }

        function renderNodes(nodes, container, depth) {
            nodes.forEach(node => {
                const nodeEl = createTreeNode(node, depth);
                container.appendChild(nodeEl);

                if (node.children && node.children.length > 0) {
                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = 'vm-tree-children';
                    if (expandedCategoryIds.has(node.id)) {
                        childrenContainer.classList.add('vm-children-expanded');
                    }
                    renderNodes(node.children, childrenContainer, depth + 1);
                    container.appendChild(childrenContainer);
                }
            });
        }

        renderNodes(categoryTreeData, categoryTree, 0);
    }

    function createTreeNode(node, depth) {
        const div = document.createElement('div');
        div.className = 'vm-tree-node';
        div.dataset.id = node.id;
        div.style.paddingLeft = `${15 + depth * 15}px`;

        if (selectedCategoryId === node.id) {
            div.classList.add('vm-node-active');
        }

        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedCategoryIds.has(node.id);
        const toggleClass = hasChildren ? 'vm-node-toggle' : 'vm-node-toggle vm-toggle-placeholder';
        const toggleIcon = isExpanded ? 'bi-chevron-down' : 'bi-chevron-right';

        const iconHtml = node.icon
            ? `<i class="bi ${node.icon} vm-node-icon"></i>`
            : '<i class="bi bi-folder vm-node-icon"></i>';

        const varietyCount = node.reference_info?.varieties_count || 0;

        div.innerHTML = `
            <div class="vm-node-content">
                <span class="${toggleClass}"><i class="bi ${toggleIcon}"></i></span>
                ${iconHtml}
                <span class="vm-node-name">${node.name}</span>
                ${varietyCount > 0 ? `<span class="vm-node-count">${varietyCount}</span>` : ''}
            </div>
        `;

        div.addEventListener('click', function (e) {
            const toggleEl = e.target.closest('.vm-node-toggle');
            if (toggleEl && !toggleEl.classList.contains('vm-toggle-placeholder')) {
                e.stopPropagation();
                toggleCategoryExpand(node.id);
                return;
            }

            if (!e.target.closest('.vm-node-toggle')) {
                selectCategory(node.id, node.name);
            }
        });

        return div;
    }

    function toggleCategoryExpand(id) {
        if (expandedCategoryIds.has(id)) {
            expandedCategoryIds.delete(id);
        } else {
            expandedCategoryIds.add(id);
        }
        renderCategoryTree();
    }

    function selectCategory(id, name) {
        selectedCategoryId = id;
        categoryBadge.style.display = 'inline-block';
        categoryBadge.textContent = `品类: ${name}`;
        clearCategorySelection();
        const selectedNode = categoryTree.querySelector(`[data-id="${id}"]`);
        if (selectedNode) {
            selectedNode.classList.add('vm-node-active');
        }
        currentPage = 1;
        loadVarieties();
    }

    function clearCategorySelection() {
        categoryTree.querySelectorAll('.vm-tree-node').forEach(node => {
            node.classList.remove('vm-node-active');
        });
    }

    function updateCategorySelect() {
        const currentValue = inputCategory.value;
        inputCategory.innerHTML = '<option value="">-- 请选择品类 --</option>';

        flatCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `[${cat.code}] ${cat.name}`;
            inputCategory.appendChild(option);
        });

        if (currentValue) {
            inputCategory.value = currentValue;
        }
    }

    function updateUnitSelect(units) {
        const currentValue = inputUnit.value;
        inputUnit.innerHTML = '<option value="">-- 请选择单位 --</option>';

        units.forEach(unit => {
            if (unit.is_active) {
                const option = document.createElement('option');
                option.value = unit.id;
                option.textContent = unit.english_abbr ? `${unit.name} (${unit.english_abbr})` : unit.name;
                inputUnit.appendChild(option);
            }
        });

        if (currentValue) {
            inputUnit.value = currentValue;
        }
    }

    function updateStorageSelect(areas) {
        const currentValue = inputStorage.value;
        inputStorage.innerHTML = '<option value="">-- 请选择或输入库区 --</option>';

        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            inputStorage.appendChild(option);
        });

        if (currentValue) {
            inputStorage.value = currentValue;
        }
    }

    function handleCategoryChange() {
        const categoryId = inputCategory.value;
        if (!categoryId) {
            inputCodePrefix.value = '';
            inputCodeSuffix.value = '';
            return;
        }

        const category = flatCategories.find(c => c.id === parseInt(categoryId));
        if (category) {
            inputCodePrefix.value = category.code;
        }

        UI.showLoader();
        fetch(`/api/varieties/next-code/?category_id=${categoryId}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(result => {
                UI.hideLoader();
                if (result.success && result.code) {
                    const code = result.code;
                    inputCodePrefix.value = code.substring(0, code.length - 3);
                    inputCodeSuffix.value = code.substring(code.length - 3);
                }
            })
            .catch(() => {
                UI.hideLoader();
            });
    }

    function loadVarieties() {
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('page_size', '10');

        const name = filterName.value.trim();
        const isActive = filterActive.value;

        if (selectedCategoryId) {
            params.set('category_id', selectedCategoryId);
        }
        if (name) params.set('name', name);
        if (isActive) params.set('is_active', isActive);

        UI.showLoader();
        fetch(`/api/varieties/?${params.toString()}`, {
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
                UI.toast('加载品种列表失败', 'error');
            });
    }

    function renderTable(items) {
        tableBody.innerHTML = '';

        if (items.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'vm-empty-row';
            tr.innerHTML = '<td colspan="11">暂无品种数据</td>';
            tableBody.appendChild(tr);
            return;
        }

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.id = item.id;

            if (!item.is_active) {
                tr.classList.add('vm-row-disabled');
            }

            if (selectedVarietyId === item.id) {
                tr.classList.add('vm-row-selected');
            }

            const warningValue = parseFloat(item.min_stock_warning) || 0;
            const currentStock = item.current_stock || 0;
            const warningClass = getWarningClass(currentStock, warningValue);

            const stockColor = item.stock_status?.color || 'rgba(255,255,255,0.85)';
            const statusBadge = item.is_active
                ? '<span class="vm-status-badge vm-status-active">已启用</span>'
                : '<span class="vm-status-badge vm-status-inactive">已禁用</span>';

            const canDelete = !item.is_referenced;

            tr.innerHTML = `
                <td class="vm-code-cell">${item.code}</td>
                <td class="vm-name-cell">${item.name}</td>
                <td>${item.specification || '-'}</td>
                <td>${item.category_name || '-'}</td>
                <td>${item.unit_abbr ? item.unit_abbr : item.unit_name || '-'}</td>
                <td>${item.shelf_life_days || 0}</td>
                <td><span class="vm-warning-cell ${warningClass}">${item.min_stock_warning}</span></td>
                <td class="vm-stock-cell" style="color: ${stockColor}">${item.current_stock} ${item.stock_unit || ''}</td>
                <td>${item.default_storage_area || '-'}</td>
                <td>${statusBadge}</td>
                <td class="vm-actions">
                    <button class="vm-action-btn vm-edit-btn" data-action="edit" data-id="${item.id}" title="编辑">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="vm-action-btn vm-delete-btn" data-action="delete" data-id="${item.id}" 
                        data-name="${escapeHtml(item.name)}" title="删除" ${!canDelete ? 'disabled' : ''}>
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });
    }

    function getWarningClass(currentStock, warningValue) {
        if (warningValue <= 0) return 'vm-warning-normal';
        if (currentStock <= 0) return 'vm-warning-out';
        if (currentStock <= warningValue * 0.5) return 'vm-warning-critical';
        if (currentStock <= warningValue) return 'vm-warning-low';
        if (currentStock <= warningValue * 2) return 'vm-warning-medium';
        return 'vm-warning-normal';
    }

    function handleTableClick(e) {
        const editBtn = e.target.closest('.vm-edit-btn');
        const deleteBtn = e.target.closest('.vm-delete-btn');
        const row = e.target.closest('tr');

        if (editBtn) {
            e.stopPropagation();
            const id = editBtn.dataset.id;
            openEditModal(id);
            return;
        }

        if (deleteBtn && !deleteBtn.disabled) {
            e.stopPropagation();
            const id = deleteBtn.dataset.id;
            const name = deleteBtn.dataset.name;
            handleDelete(id, name);
            return;
        }

        if (row && row.dataset.id) {
            const id = parseInt(row.dataset.id);
            selectRow(id);
            loadVarietyDetail(id);
        }
    }

    function selectRow(id) {
        selectedVarietyId = id;
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            if (parseInt(row.dataset.id) === id) {
                row.classList.add('vm-row-selected');
            } else {
                row.classList.remove('vm-row-selected');
            }
        });
    }

    function loadVarietyDetail(id) {
        UI.showLoader();
        fetch(`/api/varieties/${id}/`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                UI.hideLoader();
                renderDetailSidebar(data);
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('加载详情失败', 'error');
            });
    }

    function renderDetailSidebar(data) {
        const stockStatusClass = getStockStatusClass(data.stock_status?.level);

        let transactionsHtml = '';
        if (data.transactions && data.transactions.length > 0) {
            transactionsHtml = data.transactions.map(t => `
                <div class="vm-transaction-item">
                    <div class="vm-transaction-header">
                        <span class="vm-transaction-no">${t.entry_no}</span>
                        <span class="vm-transaction-type">${t.type}</span>
                    </div>
                    <div class="vm-transaction-info">
                        <span>数量</span>
                        <span class="vm-transaction-quantity">+${t.quantity} ${t.unit}</span>
                    </div>
                    <div class="vm-transaction-info">
                        <span>供应商</span>
                        <span>${t.supplier || '-'}</span>
                    </div>
                    <div class="vm-transaction-meta">
                        <span>${t.date}</span>
                        <span>${t.handler || '-'}</span>
                    </div>
                </div>
            `).join('');
        } else {
            transactionsHtml = '<div class="vm-no-transactions">暂无出入库记录</div>';
        }

        detailContent.innerHTML = `
            <div class="vm-detail-section">
                <div class="vm-stock-card">
                    <div class="vm-stock-value">${data.current_stock}</div>
                    <div class="vm-stock-unit">${data.stock_unit || ''}</div>
                    <div class="vm-stock-status-badge ${stockStatusClass}">${data.stock_status?.label || '未知'}</div>
                </div>
            </div>

            <div class="vm-detail-section">
                <div class="vm-detail-section-title">
                    <i class="bi bi-info-circle"></i> 基本信息
                </div>
                <div class="vm-detail-info-row">
                    <span class="vm-detail-info-label">品种编码</span>
                    <span class="vm-detail-info-value vm-code">${data.code}</span>
                </div>
                <div class="vm-detail-info-row">
                    <span class="vm-detail-info-label">品种名称</span>
                    <span class="vm-detail-info-value">${data.name}</span>
                </div>
                <div class="vm-detail-info-row">
                    <span class="vm-detail-info-label">规格型号</span>
                    <span class="vm-detail-info-value">${data.specification || '-'}</span>
                </div>
                <div class="vm-detail-info-row">
                    <span class="vm-detail-info-label">所属品类</span>
                    <span class="vm-detail-info-value">${data.category_name || '-'}</span>
                </div>
                <div class="vm-detail-info-row">
                    <span class="vm-detail-info-label">计量单位</span>
                    <span class="vm-detail-info-value">${data.unit_name || '-'}${data.unit_abbr ? ` (${data.unit_abbr})` : ''}</span>
                </div>
                <div class="vm-detail-info-row">
                    <span class="vm-detail-info-label">保质期</span>
                    <span class="vm-detail-info-value">${data.shelf_life_days || 0} 天</span>
                </div>
                <div class="vm-detail-info-row">
                    <span class="vm-detail-info-label">预警值</span>
                    <span class="vm-detail-info-value">${data.min_stock_warning}</span>
                </div>
                <div class="vm-detail-info-row">
                    <span class="vm-detail-info-label">默认库区</span>
                    <span class="vm-detail-info-value">${data.default_storage_area || '-'}</span>
                </div>
                <div class="vm-detail-info-row">
                    <span class="vm-detail-info-label">状态</span>
                    <span class="vm-detail-info-value" style="color: ${data.is_active ? '#00ff88' : '#999'}">
                        ${data.is_active ? '已启用' : '已禁用'}
                    </span>
                </div>
                ${data.remarks ? `
                <div class="vm-detail-info-row">
                    <span class="vm-detail-info-label">备注</span>
                    <span class="vm-detail-info-value" style="text-align: left; max-width: 100%; white-space: pre-wrap;">${escapeHtml(data.remarks)}</span>
                </div>
                ` : ''}
            </div>

            <div class="vm-detail-section">
                <div class="vm-detail-section-title">
                    <i class="bi bi-clock-history"></i> 近期出入库记录
                </div>
                <div class="vm-transaction-list">
                    ${transactionsHtml}
                </div>
            </div>
        `;
    }

    function getStockStatusClass(level) {
        switch (level) {
            case 'out_of_stock': return 'vm-stock-out';
            case 'critical': return 'vm-stock-critical';
            case 'warning': return 'vm-stock-warning';
            case 'normal': return 'vm-stock-normal';
            case 'sufficient': return 'vm-stock-sufficient';
            default: return 'vm-stock-normal';
        }
    }

    function closeDetailSidebar() {
        selectedVarietyId = null;
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => row.classList.remove('vm-row-selected'));
        detailContent.innerHTML = `
            <div class="vm-detail-empty">
                <i class="bi bi-info-circle"></i>
                <p>点击列表中的品种查看详情</p>
            </div>
        `;
    }

    function openCreateModal() {
        editingId = null;
        modalTitle.textContent = '新增品种';
        form.reset();
        inputCategory.value = '';
        inputCodePrefix.value = '';
        inputCodeSuffix.value = '';
        inputName.value = '';
        inputSpec.value = '';
        inputUnit.value = '';
        inputStorage.value = '';
        inputShelfLife.value = '0';
        inputWarning.value = '0';
        inputRemarks.value = '';
        inputActive.checked = true;
        activeLabel.textContent = '已启用';

        if (selectedCategoryId) {
            inputCategory.value = selectedCategoryId;
            handleCategoryChange();
        }

        formModal.style.display = 'flex';
        setTimeout(() => inputName.focus(), 100);
    }

    function openEditModal(id) {
        const variety = currentData.find(v => v.id === parseInt(id));
        if (!variety) {
            UI.toast('未找到该品种数据', 'error');
            return;
        }

        editingId = id;
        modalTitle.textContent = '编辑品种';

        inputCategory.value = variety.category_id;
        inputCodePrefix.value = variety.code.substring(0, variety.code.length - 3);
        inputCodeSuffix.value = variety.code.substring(variety.code.length - 3);
        inputName.value = variety.name;
        inputSpec.value = variety.specification || '';
        inputUnit.value = variety.unit_id;
        inputStorage.value = variety.default_storage_area || '';
        inputShelfLife.value = variety.shelf_life_days || 0;
        inputWarning.value = variety.min_stock_warning || 0;
        inputRemarks.value = variety.remarks || '';
        inputActive.checked = variety.is_active;
        activeLabel.textContent = variety.is_active ? '已启用' : '已禁用';

        formModal.style.display = 'flex';
    }

    function closeFormModal() {
        formModal.style.display = 'none';
        editingId = null;
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const categoryId = inputCategory.value;
        const name = inputName.value.trim();
        const unitId = inputUnit.value;

        if (!categoryId) {
            UI.toast('请选择所属品类', 'error');
            return;
        }
        if (!name) {
            UI.toast('品种名称不能为空', 'error');
            return;
        }
        if (!unitId) {
            UI.toast('请选择计量单位', 'error');
            return;
        }

        const code = inputCodePrefix.value + inputCodeSuffix.value;

        const data = {
            code: code,
            category_id: parseInt(categoryId),
            unit_id: parseInt(unitId),
            name: name,
            specification: inputSpec.value.trim(),
            shelf_life_days: parseInt(inputShelfLife.value) || 0,
            min_stock_warning: parseFloat(inputWarning.value) || 0,
            default_storage_area: inputStorage.value.trim(),
            is_active: inputActive.checked,
            remarks: inputRemarks.value.trim(),
        };

        UI.showLoader();

        const url = editingId
            ? `/api/varieties/${editingId}/update/`
            : '/api/varieties/create/';

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(data)
        })
            .then(r => r.json())
            .then(result => {
                UI.hideLoader();
                if (result.success) {
                    UI.toast(result.message);
                    closeFormModal();
                    loadInitialData();
                } else {
                    UI.toast(result.message || '操作失败', 'error');
                }
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('网络连接异常', 'error');
            });
    }

    function handleDelete(id, name) {
        UI.confirmDanger(
            '删除确认',
            `确定要删除品种「${name}」吗？此操作不可恢复！`,
            true,
            () => {
                UI.showLoader();
                fetch(`/api/varieties/${id}/delete/`, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': csrfToken }
                })
                    .then(r => r.json())
                    .then(result => {
                        UI.hideLoader();
                        if (result.success) {
                            UI.toast(result.message);
                            if (selectedVarietyId === parseInt(id)) {
                                closeDetailSidebar();
                            }
                            loadInitialData();
                        } else {
                            UI.toast(result.message || '删除失败', 'error');
                        }
                    })
                    .catch(() => {
                        UI.hideLoader();
                        UI.toast('网络连接异常', 'error');
                    });
            }
        );
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    init();
})();
