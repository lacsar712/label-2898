(function () {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    const tableBody = document.getElementById('um-table-body');
    const pageInfo = document.getElementById('um-page-info');
    const prevBtn = document.getElementById('um-page-prev');
    const nextBtn = document.getElementById('um-page-next');
    const filterBtn = document.getElementById('um-filter-btn');
    const resetBtn = document.getElementById('um-reset-btn');
    const addBtn = document.getElementById('um-add-btn');

    const formModal = document.getElementById('um-form-modal');
    const form = document.getElementById('um-form');
    const formCancelBtn = document.getElementById('um-form-cancel');
    const modalTitle = document.getElementById('um-modal-title');

    const inputCode = document.getElementById('um-input-code');
    const inputName = document.getElementById('um-input-name');
    const inputAbbr = document.getElementById('um-input-abbr');
    const inputWeight = document.getElementById('um-input-weight');
    const inputActive = document.getElementById('um-input-active');
    const activeLabel = document.getElementById('um-active-label');

    let currentPage = 1;
    let totalPages = 1;
    let editingId = null;

    function init() {
        loadUnits();
        bindEvents();
    }

    function bindEvents() {
        filterBtn.addEventListener('click', function () {
            currentPage = 1;
            loadUnits();
        });

        resetBtn.addEventListener('click', function () {
            document.getElementById('um-filter-name').value = '';
            document.getElementById('um-filter-active').value = '';
            currentPage = 1;
            loadUnits();
        });

        prevBtn.addEventListener('click', function () {
            if (currentPage > 1) {
                currentPage--;
                loadUnits();
            }
        });

        nextBtn.addEventListener('click', function () {
            if (currentPage < totalPages) {
                currentPage++;
                loadUnits();
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

        form.addEventListener('submit', handleFormSubmit);

        tableBody.addEventListener('click', handleTableClick);
    }

    function loadUnits() {
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('page_size', '10');

        const name = document.getElementById('um-filter-name').value.trim();
        const isActive = document.getElementById('um-filter-active').value;

        if (name) params.set('name', name);
        if (isActive) params.set('is_active', isActive);

        fetch(`/api/units/?${params.toString()}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                totalPages = data.total_pages;
                renderTable(data.items);
                pageInfo.textContent = `共 ${data.total} 条 / 第 ${data.page} 页 / 共 ${data.total_pages} 页`;
                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= totalPages;
            })
            .catch(() => UI.toast('加载单位列表失败', 'error'));
    }

    function renderTable(items) {
        tableBody.innerHTML = '';

        if (items.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'um-empty-row';
            tr.innerHTML = '<td colspan="7">暂无单位数据</td>';
            tableBody.appendChild(tr);
            return;
        }

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.id = item.id;
            if (!item.is_active) {
                tr.classList.add('um-row-disabled');
            }

            const statusBadge = item.is_active
                ? '<span class="um-status-badge um-status-active">已启用</span>'
                : '<span class="um-status-badge um-status-inactive">已禁用</span>';

            const canDelete = !item.is_referenced;

            tr.innerHTML = `
                <td class="um-code-cell">${item.code}</td>
                <td class="um-name-cell">
                    ${item.name}
                    ${!item.is_active ? '<span class="um-tag-disabled">已禁用</span>' : ''}
                </td>
                <td>${item.english_abbr || '-'}</td>
                <td>${statusBadge}</td>
                <td>${item.sort_weight}</td>
                <td>${item.created_at}</td>
                <td class="um-actions">
                    <button class="um-action-btn um-edit-btn" data-id="${item.id}">
                        <i class="bi bi-pencil-square"></i> 编辑
                    </button>
                    <button class="um-action-btn um-delete-btn" data-id="${item.id}" data-name="${item.name}" data-active="${item.is_active}" data-referenced="${item.is_referenced}" ${!canDelete ? 'disabled' : ''}>
                        <i class="bi bi-trash"></i> 删除
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function handleTableClick(e) {
        const editBtn = e.target.closest('.um-edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            openEditModal(id);
            return;
        }

        const deleteBtn = e.target.closest('.um-delete-btn');
        if (deleteBtn && !deleteBtn.disabled) {
            const id = deleteBtn.dataset.id;
            const name = deleteBtn.dataset.name;
            const isActive = deleteBtn.dataset.active === 'true';
            handleDelete(id, name, isActive);
        }
    }

    function openCreateModal() {
        editingId = null;
        modalTitle.textContent = '新增单位';
        form.reset();
        inputCode.disabled = false;
        inputCode.value = '';
        inputName.value = '';
        inputAbbr.value = '';
        inputWeight.value = '0';
        inputActive.checked = true;
        activeLabel.textContent = '已启用';
        formModal.style.display = 'flex';
    }

    function openEditModal(id) {
        const row = tableBody.querySelector(`tr[data-id="${id}"]`);
        if (!row) return;

        editingId = id;
        modalTitle.textContent = '编辑单位';

        UI.showLoader();
        fetch(`/api/units/?page=1&page_size=100`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                UI.hideLoader();
                const unit = data.items.find(u => u.id === parseInt(id));
                if (!unit) {
                    UI.toast('未找到该单位数据', 'error');
                    return;
                }
                inputCode.value = unit.code;
                inputCode.disabled = true;
                inputName.value = unit.name;
                inputAbbr.value = unit.english_abbr;
                inputWeight.value = unit.sort_weight;
                inputActive.checked = unit.is_active;
                activeLabel.textContent = unit.is_active ? '已启用' : '已禁用';
                formModal.style.display = 'flex';
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('加载单位数据失败', 'error');
            });
    }

    function closeFormModal() {
        formModal.style.display = 'none';
        editingId = null;
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const data = {
            code: inputCode.value.trim(),
            name: inputName.value.trim(),
            english_abbr: inputAbbr.value.trim(),
            sort_weight: parseInt(inputWeight.value) || 0,
            is_active: inputActive.checked,
        };

        if (!data.code) {
            UI.toast('单位编码不能为空', 'error');
            return;
        }
        if (!data.name) {
            UI.toast('单位名称不能为空', 'error');
            return;
        }

        UI.showLoader();

        const url = editingId
            ? `/api/units/${editingId}/update/`
            : '/api/units/create/';

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
                    loadUnits();
                } else {
                    UI.toast(result.message || '操作失败', 'error');
                }
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('网络连接异常', 'error');
            });
    }

    function handleDelete(id, name, isActive) {
        const confirmTitle = isActive ? '危险操作确认' : '删除确认';
        const confirmMsg = isActive
            ? `确定要删除启用中的单位「${name}」吗？此操作不可恢复！`
            : `确定要删除单位「${name}」吗？`;
        const dangerMode = isActive;

        UI.confirmDanger(confirmTitle, confirmMsg, dangerMode, () => {
            UI.showLoader();
            fetch(`/api/units/${id}/delete/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            })
                .then(r => r.json())
                .then(result => {
                    UI.hideLoader();
                    if (result.success) {
                        UI.toast(result.message);
                        loadUnits();
                    } else {
                        UI.toast(result.message || '删除失败', 'error');
                    }
                })
                .catch(() => {
                    UI.hideLoader();
                    UI.toast('网络连接异常', 'error');
                });
        });
    }

    init();
})();
