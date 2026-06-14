(function () {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    const tableBody = document.getElementById('cm-table-body');
    const emptyHint = document.getElementById('cm-empty-hint');
    const expandAllBtn = document.getElementById('cm-expand-all-btn');
    const collapseAllBtn = document.getElementById('cm-collapse-all-btn');
    const addRootBtn = document.getElementById('cm-add-root-btn');

    const searchInput = document.getElementById('cm-search-input');
    const searchClear = document.getElementById('cm-search-clear');

    const formModal = document.getElementById('cm-form-modal');
    const form = document.getElementById('cm-form');
    const formCancelBtn = document.getElementById('cm-form-cancel');
    const modalTitle = document.getElementById('cm-modal-title');

    const inputCode = document.getElementById('cm-input-code');
    const inputParentPrefix = document.getElementById('cm-input-parent-prefix');
    const codePreview = document.getElementById('cm-code-preview');
    const inputName = document.getElementById('cm-input-name');
    const inputParent = document.getElementById('cm-input-parent');
    const inputWeight = document.getElementById('cm-input-weight');
    const inputIcon = document.getElementById('cm-input-icon');
    const inputDesc = document.getElementById('cm-input-desc');

    let categoryTree = [];
    let flatCategories = [];
    let expandedIds = new Set();
    let preSearchExpandedIds = null;
    let searchKeyword = '';
    let selectedId = null;
    let editingId = null;
    let editingMode = 'create';

    let draggedId = null;

    function init() {
        loadCategories();
        bindEvents();
    }

    function bindEvents() {
        expandAllBtn.addEventListener('click', expandAll);
        collapseAllBtn.addEventListener('click', collapseAll);
        addRootBtn.addEventListener('click', () => openCreateModal(null));

        formCancelBtn.addEventListener('click', closeFormModal);
        formModal.addEventListener('click', function (e) {
            if (e.target === formModal) closeFormModal();
        });

        form.addEventListener('submit', handleFormSubmit);
        inputCode.addEventListener('input', updateCodePreview);
        inputParent.addEventListener('change', handleParentChange);

        searchInput.addEventListener('input', handleSearchInput);
        searchClear.addEventListener('click', clearSearch);

        tableBody.addEventListener('click', handleTableClick);
        tableBody.addEventListener('dragstart', handleDragStart);
        tableBody.addEventListener('dragover', handleDragOver);
        tableBody.addEventListener('drop', handleDrop);
        tableBody.addEventListener('dragend', handleDragEnd);
    }

    function loadCategories() {
        UI.showLoader();
        Promise.all([
            fetch('/api/material-categories/tree/', {
                headers: { 'X-CSRFToken': csrfToken }
            }).then(r => r.json()),
            fetch('/api/material-categories/flat/', {
                headers: { 'X-CSRFToken': csrfToken }
            }).then(r => r.json())
        ])
            .then(([treeData, flatData]) => {
                UI.hideLoader();
                categoryTree = treeData;
                flatCategories = flatData.items || [];
                renderTable();
                updateParentSelect();
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('加载品类数据失败', 'error');
            });
    }

    function renderTable() {
        tableBody.innerHTML = '';

        if (!categoryTree || categoryTree.length === 0) {
            emptyHint.style.display = 'block';
            return;
        }
        emptyHint.style.display = 'none';

        if (searchKeyword) {
            renderFilteredTable();
            return;
        }

        function renderNodes(nodes, depth) {
            nodes.forEach(node => {
                const tr = createRow(node, depth);
                tableBody.appendChild(tr);

                if (node.children && node.children.length > 0) {
                    if (expandedIds.has(node.id)) {
                        renderNodes(node.children, depth + 1);
                    }
                }
            });
        }

        renderNodes(categoryTree, 0);
    }

    function handleSearchInput() {
        const keyword = searchInput.value.trim().toLowerCase();
        searchKeyword = keyword;

        if (keyword) {
            searchClear.style.display = 'flex';
            if (preSearchExpandedIds === null) {
                preSearchExpandedIds = new Set(expandedIds);
            }
            const matchedIds = findMatchedNodeIds(keyword);
            const ancestorIds = collectAncestorIds(matchedIds);
            expandedIds = new Set([...matchedIds, ...ancestorIds]);
        } else {
            clearSearch();
            return;
        }

        renderTable();
    }

    function clearSearch() {
        searchInput.value = '';
        searchKeyword = '';
        searchClear.style.display = 'none';

        if (preSearchExpandedIds !== null) {
            expandedIds = preSearchExpandedIds;
            preSearchExpandedIds = null;
        }

        renderTable();
    }

    function findMatchedNodeIds(keyword) {
        const matched = new Set();

        function search(nodes) {
            nodes.forEach(node => {
                const codeMatch = node.code.toLowerCase().includes(keyword);
                const nameMatch = node.name.toLowerCase().includes(keyword);
                if (codeMatch || nameMatch) {
                    matched.add(node.id);
                }
                if (node.children && node.children.length > 0) {
                    const childMatches = search(node.children);
                }
            });
        }

        search(categoryTree);
        return matched;
    }

    function collectAncestorIds(targetIds) {
        const ancestors = new Set();

        function findPath(nodes, path) {
            for (const node of nodes) {
                const currentPath = [...path, node.id];
                if (targetIds.has(node.id)) {
                    path.forEach(id => ancestors.add(id));
                }
                if (node.children && node.children.length > 0) {
                    findPath(node.children, currentPath);
                }
            }
        }

        findPath(categoryTree, []);
        return ancestors;
    }

    function renderFilteredTable() {
        const keyword = searchKeyword;
        const matchedIds = findMatchedNodeIds(keyword);
        const ancestorIds = collectAncestorIds(matchedIds);
        const visibleIds = new Set([...matchedIds, ...ancestorIds]);

        let matchCount = 0;

        function renderNodes(nodes, depth) {
            nodes.forEach(node => {
                if (!visibleIds.has(node.id)) return;

                const tr = createRow(node, depth, keyword);
                tableBody.appendChild(tr);
                matchCount++;

                if (node.children && node.children.length > 0) {
                    if (expandedIds.has(node.id)) {
                        renderNodes(node.children, depth + 1);
                    }
                }
            });
        }

        renderNodes(categoryTree, 0);

        if (matchCount === 0) {
            emptyHint.style.display = 'block';
            emptyHint.querySelector('p').textContent = `未找到匹配「${searchInput.value.trim()}」的品类`;
        } else {
            emptyHint.style.display = 'none';
            emptyHint.querySelector('p').textContent = '暂无品类数据，请点击"新增一级品类"开始创建';
        }
    }

    function highlightText(text, keyword) {
        if (!keyword || !text) return escapeHtml(text);
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        const idx = lowerText.indexOf(lowerKeyword);
        if (idx === -1) return escapeHtml(text);

        const before = text.substring(0, idx);
        const match = text.substring(idx, idx + keyword.length);
        const after = text.substring(idx + keyword.length);

        return escapeHtml(before) + '<span class="cm-search-highlight">' + escapeHtml(match) + '</span>' + highlightText(after, keyword);
    }

    function createRow(node, depth, keyword) {
        const tr = document.createElement('tr');
        tr.dataset.id = node.id;
        tr.dataset.depth = depth;
        tr.draggable = true;
        tr.classList.add('cm-tree-row');

        if (selectedId === node.id) {
            tr.classList.add('cm-row-selected');
        }

        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedIds.has(node.id);
        const isHidden = depth > 0 && !isParentExpanded(node.id);

        if (isHidden && !keyword) {
            tr.classList.add('cm-row-hidden');
        }

        const indent = depth * 24;
        const toggleBtnClass = hasChildren ? 'cm-toggle-btn' : 'cm-toggle-btn cm-toggle-placeholder';
        const toggleIcon = isExpanded ? 'bi-chevron-down' : 'bi-chevron-right';

        const iconHtml = node.icon
            ? `<i class="bi ${node.icon}"></i>`
            : '<i class="bi bi-box-seam cm-no-icon"></i>';

        const parentName = getParentName(node.parent_id);

        const canDelete = !node.is_referenced && !hasChildren;

        const codeDisplay = keyword ? highlightText(node.code, keyword) : node.code;
        const nameDisplay = keyword ? highlightText(node.name, keyword) : escapeHtml(node.name);

        tr.innerHTML = `
            <td style="padding-left: ${indent + 8}px;">
                <button class="${toggleBtnClass}" data-id="${node.id}" ${!hasChildren ? 'tabindex="-1"' : ''}>
                    <i class="bi ${toggleIcon}"></i>
                </button>
            </td>
            <td class="cm-icon-cell">${iconHtml}</td>
            <td class="cm-code-cell">${codeDisplay}</td>
            <td class="cm-name-cell">
                <span>${nameDisplay}</span>
                ${hasChildren ? `<span class="cm-child-count">(${node.children.length})</span>` : ''}
            </td>
            <td>${parentName || '<span style="color: rgba(255,255,255,0.3);">- 根级 -</span>'}</td>
            <td class="cm-sort-cell">${node.sort_weight}</td>
            <td class="cm-desc-cell" title="${escapeHtml(node.description || '')}">${escapeHtml(node.description) || '-'}</td>
            <td class="cm-actions">
                <button class="cm-action-btn cm-sort-up-btn" data-action="sort-up" data-id="${node.id}" title="上移">
                    <i class="bi bi-chevron-up"></i>
                </button>
                <button class="cm-action-btn cm-sort-down-btn" data-action="sort-down" data-id="${node.id}" title="下移">
                    <i class="bi bi-chevron-down"></i>
                </button>
                ${depth === 0 ? `
                <button class="cm-action-btn cm-add-child-btn" data-action="add-child" data-id="${node.id}" title="添加子品类">
                    <i class="bi bi-plus-lg"></i>
                </button>
                ` : ''}
                <button class="cm-action-btn cm-edit-btn" data-action="edit" data-id="${node.id}" title="编辑">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="cm-action-btn cm-delete-btn" data-action="delete" data-id="${node.id}" 
                    data-name="${escapeHtml(node.name)}" title="删除" ${!canDelete ? 'disabled' : ''}>
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        return tr;
    }

    function isParentExpanded(id) {
        const node = findNodeById(id);
        if (!node || !node.parent_id) return true;
        return expandedIds.has(node.parent_id);
    }

    function findNodeById(id, nodes) {
        if (!nodes) nodes = categoryTree;
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children && node.children.length > 0) {
                const found = findNodeById(id, node.children);
                if (found) return found;
            }
        }
        return null;
    }

    function getParentName(parentId) {
        if (!parentId) return '';
        const parent = flatCategories.find(c => c.id === parentId);
        return parent ? parent.name : '';
    }

    function handleTableClick(e) {
        const toggleBtn = e.target.closest('.cm-toggle-btn');
        if (toggleBtn && !toggleBtn.classList.contains('cm-toggle-placeholder')) {
            e.stopPropagation();
            const id = parseInt(toggleBtn.dataset.id);
            toggleExpand(id);
            return;
        }

        const row = e.target.closest('tr.cm-tree-row');
        if (row && !e.target.closest('.cm-action-btn') && !e.target.closest('.cm-toggle-btn')) {
            const id = parseInt(row.dataset.id);
            selectRow(id);
            return;
        }

        const actionBtn = e.target.closest('.cm-action-btn');
        if (actionBtn) {
            e.stopPropagation();
            const action = actionBtn.dataset.action;
            const id = parseInt(actionBtn.dataset.id);
            const name = actionBtn.dataset.name;

            switch (action) {
                case 'sort-up':
                    handleSort(id, 'up');
                    break;
                case 'sort-down':
                    handleSort(id, 'down');
                    break;
                case 'add-child':
                    openCreateModal(id);
                    break;
                case 'edit':
                    openEditModal(id);
                    break;
                case 'delete':
                    if (!actionBtn.disabled) {
                        handleDelete(id, name);
                    }
                    break;
            }
        }
    }

    function selectRow(id) {
        selectedId = id;
        const rows = tableBody.querySelectorAll('tr.cm-tree-row');
        rows.forEach(row => {
            if (parseInt(row.dataset.id) === id) {
                row.classList.add('cm-row-selected');
            } else {
                row.classList.remove('cm-row-selected');
            }
        });

        const node = findNodeById(id);
        if (node && node.children && node.children.length > 0) {
            if (!expandedIds.has(id)) {
                expandAllChildren(id);
            }
        }
    }

    function toggleExpand(id) {
        if (expandedIds.has(id)) {
            expandedIds.delete(id);
        } else {
            expandedIds.add(id);
        }
        renderTable();
    }

    function expandAll() {
        function collectIds(nodes) {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    expandedIds.add(node.id);
                    collectIds(node.children);
                }
            });
        }
        collectIds(categoryTree);
        renderTable();
    }

    function collapseAll() {
        expandedIds.clear();
        renderTable();
    }

    function expandAllChildren(parentId) {
        function expand(node) {
            if (node.children && node.children.length > 0) {
                expandedIds.add(node.id);
                node.children.forEach(expand);
            }
        }
        const parent = findNodeById(parentId);
        if (parent) {
            expand(parent);
            renderTable();
        }
    }

    function updateParentSelect(excludeId) {
        const currentValue = inputParent.value;
        inputParent.innerHTML = '<option value="">-- 无（作为一级品类）--</option>';

        flatCategories.forEach(cat => {
            if (cat.parent_id === null && cat.id !== excludeId) {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `[${cat.code}] ${cat.name}`;
                inputParent.appendChild(option);
            }
        });

        if (currentValue) {
            inputParent.value = currentValue;
        }
    }

    function openCreateModal(parentId) {
        editingId = null;
        editingMode = 'create';
        modalTitle.textContent = '新增品类';
        form.reset();
        inputCode.value = '';
        inputName.value = '';
        inputWeight.value = '0';
        inputIcon.value = '';
        inputDesc.value = '';

        updateParentSelect();

        if (parentId) {
            inputParent.value = parentId;
        } else {
            inputParent.value = '';
        }

        handleParentChange();
        formModal.style.display = 'flex';
        setTimeout(() => inputCode.focus(), 100);
    }

    function openEditModal(id) {
        const node = findNodeById(id);
        if (!node) {
            UI.toast('未找到该品类数据', 'error');
            return;
        }

        editingId = id;
        editingMode = 'edit';
        modalTitle.textContent = '编辑品类';

        updateParentSelect(id);

        inputCode.value = node.code;
        inputName.value = node.name;
        inputParent.value = node.parent_id || '';
        inputWeight.value = node.sort_weight;
        inputIcon.value = node.icon || '';
        inputDesc.value = node.description || '';

        handleParentChange();
        formModal.style.display = 'flex';
    }

    function closeFormModal() {
        formModal.style.display = 'none';
        editingId = null;
        editingMode = 'create';
    }

    function handleParentChange() {
        const parentId = inputParent.value;
        let prefix = '';

        if (parentId) {
            const parent = flatCategories.find(c => c.id === parseInt(parentId));
            if (parent) {
                prefix = parent.code + '-';
            }
        }

        inputParentPrefix.value = prefix;
        updateCodePreview();
    }

    function updateCodePreview() {
        const prefix = inputParentPrefix.value || '';
        const suffix = inputCode.value || '';
        codePreview.textContent = prefix + suffix || '-';
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const prefix = inputParentPrefix.value || '';
        const suffix = inputCode.value.trim();
        const fullCode = prefix + suffix;

        if (!suffix) {
            UI.toast('品类编码不能为空', 'error');
            return;
        }
        if (!inputName.value.trim()) {
            UI.toast('品类名称不能为空', 'error');
            return;
        }

        const data = {
            code: fullCode,
            name: inputName.value.trim(),
            parent_id: inputParent.value ? parseInt(inputParent.value) : null,
            sort_weight: parseInt(inputWeight.value) || 0,
            icon: inputIcon.value || '',
            description: inputDesc.value.trim(),
        };

        UI.showLoader();

        const url = editingMode === 'edit'
            ? `/api/material-categories/${editingId}/update/`
            : '/api/material-categories/create/';

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
                    loadCategories();
                } else {
                    UI.toast(result.message || '操作失败', 'error');
                }
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('网络连接异常', 'error');
            });
    }

    function handleSort(id, direction) {
        UI.showLoader();
        fetch(`/api/material-categories/${id}/reorder/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ direction: direction })
        })
            .then(r => r.json())
            .then(result => {
                UI.hideLoader();
                if (result.success) {
                    loadCategories();
                } else {
                    UI.toast(result.message || '排序失败', 'error');
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
            `确定要删除品类「${name}」吗？此操作不可恢复！`,
            true,
            () => {
                UI.showLoader();
                fetch(`/api/material-categories/${id}/delete/`, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': csrfToken }
                })
                    .then(r => r.json())
                    .then(result => {
                        UI.hideLoader();
                        if (result.success) {
                            UI.toast(result.message);
                            if (selectedId === id) selectedId = null;
                            if (expandedIds.has(id)) expandedIds.delete(id);
                            loadCategories();
                        } else {
                            showDeleteBlockedDialog(result.message, result.reference_info);
                        }
                    })
                    .catch(() => {
                        UI.hideLoader();
                        UI.toast('网络连接异常', 'error');
                    });
            }
        );
    }

    function showDeleteBlockedDialog(message, refInfo) {
        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay';
        dialog.style.display = 'flex';
        dialog.style.zIndex = '2000';

        let detailsHtml = '';
        if (refInfo) {
            detailsHtml = `
                <div class="cm-block-details">
                    <div class="cm-block-title">引用详情：</div>
                    <ul>
                        ${refInfo.children_count > 0 ? `<li>子品类数量：${refInfo.children_count} 个</li>` : ''}
                        ${refInfo.variety_count > 0 ? `<li>品种档案引用：${refInfo.variety_count} 条</li>` : ''}
                        ${refInfo.unit_count > 0 ? `<li>单位档案引用：${refInfo.unit_count} 条</li>` : ''}
                        ${refInfo.goods_entry_count > 0 ? `<li>入库记录引用：${refInfo.goods_entry_count} 条</li>` : ''}
                    </ul>
                    <div class="cm-block-tip">请先解除上述引用关系后再尝试删除</div>
                </div>
            `;
        }

        dialog.innerHTML = `
            <div class="modal-tech danger-mode" style="max-width: 480px; text-align: left;">
                <h3 style="margin-bottom: 20px;">删除被拦截</h3>
                <p style="margin-bottom: 15px; color: rgba(255,255,255,0.9);">${message}</p>
                ${detailsHtml}
                <div class="modal-btns" style="margin-top: 25px;">
                    <button class="btn-tech" id="cm-blocked-ok">我知道了</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const close = () => {
            dialog.remove();
        };

        dialog.querySelector('#cm-blocked-ok').addEventListener('click', close);
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) close();
        });
    }

    function handleDragStart(e) {
        const row = e.target.closest('tr.cm-tree-row');
        if (!row) return;

        draggedId = parseInt(row.dataset.id);
        row.classList.add('cm-row-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedId.toString());
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const row = e.target.closest('tr.cm-tree-row');
        if (!row) return;

        const id = parseInt(row.dataset.id);
        if (id === draggedId) return;

        const draggedNode = findNodeById(draggedId);
        const targetNode = findNodeById(id);
        if (!draggedNode || !targetNode) return;

        if (draggedNode.parent_id !== targetNode.parent_id) {
            return;
        }

        tableBody.querySelectorAll('tr.cm-tree-row').forEach(r => {
            r.classList.remove('cm-drop-target');
        });
        row.classList.add('cm-drop-target');
    }

    function handleDrop(e) {
        e.preventDefault();

        const row = e.target.closest('tr.cm-tree-row');
        if (!row || !draggedId) return;

        const targetId = parseInt(row.dataset.id);
        if (targetId === draggedId) {
            cleanupDrag();
            return;
        }

        const draggedNode = findNodeById(draggedId);
        const targetNode = findNodeById(targetId);

        if (!draggedNode || !targetNode || draggedNode.parent_id !== targetNode.parent_id) {
            cleanupDrag();
            UI.toast('只能在同级之间拖拽排序', 'error');
            return;
        }

        performDragReorder(draggedId, targetId);
        cleanupDrag();
    }

    function handleDragEnd() {
        cleanupDrag();
    }

    function cleanupDrag() {
        draggedId = null;
        tableBody.querySelectorAll('tr.cm-tree-row').forEach(r => {
            r.classList.remove('cm-row-dragging');
            r.classList.remove('cm-drop-target');
        });
    }

    function performDragReorder(draggedId, targetId) {
        const parentId = findNodeById(draggedId)?.parent_id ?? null;
        const siblings = flatCategories
            .filter(c => c.parent_id === parentId)
            .sort((a, b) => a.sort_weight - b.sort_weight || a.id - b.id);

        const draggedIdx = siblings.findIndex(s => s.id === draggedId);
        const targetIdx = siblings.findIndex(s => s.id === targetId);

        if (draggedIdx === -1 || targetIdx === -1) return;

        const direction = draggedIdx < targetIdx ? 'down' : 'up';
        const steps = Math.abs(targetIdx - draggedIdx);

        if (steps === 0) return;

        let completed = 0;
        let hasError = false;

        function doStep() {
            if (completed >= steps || hasError) {
                UI.hideLoader();
                loadCategories();
                return;
            }

            fetch(`/api/material-categories/${draggedId}/reorder/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ direction: direction })
            })
                .then(r => r.json())
                .then(result => {
                    if (result.success) {
                        completed++;
                        setTimeout(doStep, 80);
                    } else {
                        hasError = true;
                        UI.toast(result.message || '排序失败', 'error');
                        UI.hideLoader();
                        loadCategories();
                    }
                })
                .catch(() => {
                    hasError = true;
                    UI.toast('网络连接异常', 'error');
                    UI.hideLoader();
                    loadCategories();
                });
        }

        UI.showLoader();
        doStep();
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    init();
})();
