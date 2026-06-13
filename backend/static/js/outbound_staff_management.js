(function () {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    const tableBody = document.getElementById('osm-table-body');
    const pageInfo = document.getElementById('osm-page-info');
    const prevBtn = document.getElementById('osm-page-prev');
    const nextBtn = document.getElementById('osm-page-next');
    const filterBtn = document.getElementById('osm-filter-btn');
    const resetBtn = document.getElementById('osm-reset-btn');
    const addBtn = document.getElementById('osm-add-btn');

    const filterAreaSelect = document.getElementById('osm-filter-area');

    const formModal = document.getElementById('osm-form-modal');
    const form = document.getElementById('osm-form');
    const formCancelBtn = document.getElementById('osm-form-cancel');
    const modalTitle = document.getElementById('osm-modal-title');

    const inputEmployeeNo = document.getElementById('osm-input-employee-no');
    const inputName = document.getElementById('osm-input-name');
    const inputPhone = document.getElementById('osm-input-phone');
    const inputCertificateNo = document.getElementById('osm-input-certificate-no');
    const inputAreas = document.getElementById('osm-input-areas');
    const inputStartDate = document.getElementById('osm-input-start-date');
    const inputEndDate = document.getElementById('osm-input-end-date');
    const inputStatus = document.getElementById('osm-input-status');
    const statusLabel = document.getElementById('osm-status-label');
    const inputRemarks = document.getElementById('osm-input-remarks');

    const renewModal = document.getElementById('osm-renew-modal');
    const renewCancelBtn = document.getElementById('osm-renew-cancel');
    const renewConfirmBtn = document.getElementById('osm-renew-confirm');
    const renewName = document.getElementById('osm-renew-name');
    const renewEmployeeNo = document.getElementById('osm-renew-employee-no');
    const renewOldDate = document.getElementById('osm-renew-old-date');
    const renewNewDate = document.getElementById('osm-renew-new-date');

    let currentPage = 1;
    let totalPages = 1;
    let editingId = null;
    let renewingId = null;
    let storageAreas = [];

    function init() {
        loadStaffList();
        loadStorageAreas();
        bindEvents();
    }

    function bindEvents() {
        filterBtn.addEventListener('click', function () {
            currentPage = 1;
            loadStaffList();
        });

        resetBtn.addEventListener('click', function () {
            document.getElementById('osm-filter-name').value = '';
            document.getElementById('osm-filter-area').value = '';
            document.getElementById('osm-filter-status').value = '';
            document.getElementById('osm-filter-auth').value = '';
            currentPage = 1;
            loadStaffList();
        });

        prevBtn.addEventListener('click', function () {
            if (currentPage > 1) {
                currentPage--;
                loadStaffList();
            }
        });

        nextBtn.addEventListener('click', function () {
            if (currentPage < totalPages) {
                currentPage++;
                loadStaffList();
            }
        });

        addBtn.addEventListener('click', openCreateModal);

        formCancelBtn.addEventListener('click', closeFormModal);
        formModal.addEventListener('click', function (e) {
            if (e.target === formModal) closeFormModal();
        });

        inputStatus.addEventListener('change', function () {
            statusLabel.textContent = this.checked ? '启用' : '禁用';
        });

        form.addEventListener('submit', handleFormSubmit);

        tableBody.addEventListener('click', handleTableClick);

        renewCancelBtn.addEventListener('click', closeRenewModal);
        renewModal.addEventListener('click', function (e) {
            if (e.target === renewModal) closeRenewModal();
        });
        renewConfirmBtn.addEventListener('click', handleRenewConfirm);
    }

    function loadStorageAreas() {
        fetch('/api/outbound-staff/storage-areas/', {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    storageAreas = data;
                    renderAreaFilterOptions();
                    renderAreaCheckboxes();
                }
            })
            .catch(() => { });
    }

    function renderAreaFilterOptions() {
        const currentValue = filterAreaSelect.value;
        filterAreaSelect.innerHTML = '<option value="">全部库区</option>';
        storageAreas.forEach(area => {
            const opt = document.createElement('option');
            opt.value = area.value;
            opt.textContent = area.label;
            filterAreaSelect.appendChild(opt);
        });
        filterAreaSelect.value = currentValue;
    }

    function renderAreaCheckboxes() {
        inputAreas.innerHTML = '';
        storageAreas.forEach(area => {
            const item = document.createElement('div');
            item.className = 'osm-checkbox-item';
            item.innerHTML = `
                <input type="checkbox" id="osm-area-${area.value}" value="${area.value}">
                <label for="osm-area-${area.value}">${area.label}</label>
            `;
            inputAreas.appendChild(item);
        });
    }

    function getSelectedAreas() {
        const checkboxes = inputAreas.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    function setSelectedAreas(areas) {
        const checkboxes = inputAreas.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = areas.includes(cb.value);
        });
    }

    function loadStaffList() {
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('page_size', '10');

        const name = document.getElementById('osm-filter-name').value.trim();
        const area = document.getElementById('osm-filter-area').value;
        const status = document.getElementById('osm-filter-status').value;
        const authStatus = document.getElementById('osm-filter-auth').value;

        if (name) params.set('name', name);
        if (area) params.set('area', area);
        if (status) params.set('status', status);
        if (authStatus) params.set('auth_status', authStatus);

        fetch(`/api/outbound-staff/?${params.toString()}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                totalPages = data.total_pages;
                renderTable(data.items);
                pageInfo.textContent = `共 ${data.total} 条 / 第 ${data.page} 页 / 共 ${data.total_pages} 页`;
                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= totalPages;

                if (data.storage_areas && data.storage_areas.length > 0 && storageAreas.length === 0) {
                    storageAreas = data.storage_areas;
                    renderAreaFilterOptions();
                    renderAreaCheckboxes();
                }
            })
            .catch(() => UI.toast('加载出库人员列表失败', 'error'));
    }

    function renderTable(items) {
        tableBody.innerHTML = '';

        if (items.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="8">
                    <div class="osm-empty-hint">
                        <i class="bi bi-person-x"></i>
                        <p>暂无出库人员数据</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
            return;
        }

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.id = item.id;

            if (item.status === 'inactive') {
                tr.classList.add('osm-row-disabled');
            }

            const authBadgeClass = {
                'normal': 'osm-auth-normal',
                'warning': 'osm-auth-warning',
                'expired': 'osm-auth-expired',
                'disabled': 'osm-auth-disabled',
            }[item.auth_status] || 'osm-auth-normal';

            const statusDotClass = item.auth_status;

            const areasHtml = item.authorized_areas_display.map(a =>
                `<span class="osm-area-chip">${a}</span>`
            ).join('');

            const dateRangeHtml = `
                <div class="osm-date-range">
                    <span>${item.authorization_start_date}</span>
                    <span class="osm-date-sep">至</span>
                    <span class="osm-date-end">${item.authorization_end_date}</span>
                </div>
            `;

            const canRenew = item.status === 'active';

            tr.innerHTML = `
                <td class="osm-code-cell">${item.employee_no}</td>
                <td class="osm-name-cell">
                    <span class="osm-status-dot ${statusDotClass}"></span>
                    ${item.name}
                </td>
                <td><div class="osm-areas-cell">${areasHtml}</div></td>
                <td class="osm-phone-cell">${item.phone || '-'}</td>
                <td>${dateRangeHtml}</td>
                <td class="osm-cert-cell">${item.certificate_no || '-'}</td>
                <td><span class="osm-auth-badge ${authBadgeClass}">${item.auth_status_label}</span></td>
                <td class="osm-actions">
                    <button class="osm-action-btn osm-renew-btn" data-id="${item.id}" data-name="${item.name}" ${canRenew ? '' : 'disabled'}>
                        <i class="bi bi-arrow-repeat"></i> 续期
                    </button>
                    <button class="osm-action-btn osm-edit-btn" data-id="${item.id}">
                        <i class="bi bi-pencil-square"></i> 编辑
                    </button>
                    <button class="osm-action-btn osm-delete-btn" data-id="${item.id}" data-name="${item.name}" data-status="${item.status}">
                        <i class="bi bi-trash"></i> 删除
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function handleTableClick(e) {
        e.stopPropagation();

        const editBtn = e.target.closest('.osm-edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            openEditModal(id);
            return;
        }

        const deleteBtn = e.target.closest('.osm-delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const name = deleteBtn.dataset.name;
            const status = deleteBtn.dataset.status;
            handleDelete(id, name, status);
            return;
        }

        const renewBtn = e.target.closest('.osm-renew-btn');
        if (renewBtn && !renewBtn.disabled) {
            const id = renewBtn.dataset.id;
            const name = renewBtn.dataset.name;
            openRenewModal(id, name);
        }
    }

    function openCreateModal() {
        editingId = null;
        modalTitle.textContent = '新增出库人员';
        form.reset();
        inputEmployeeNo.disabled = false;
        inputEmployeeNo.value = '';
        inputName.value = '';
        inputPhone.value = '';
        inputCertificateNo.value = '';
        setSelectedAreas([]);
        inputStartDate.value = '';
        inputEndDate.value = '';
        inputStatus.checked = true;
        statusLabel.textContent = '启用';
        inputRemarks.value = '';

        const today = new Date().toISOString().split('T')[0];
        inputStartDate.value = today;
        const defaultEnd = new Date();
        defaultEnd.setDate(defaultEnd.getDate() + 365);
        inputEndDate.value = defaultEnd.toISOString().split('T')[0];

        formModal.style.display = 'flex';
    }

    function openEditModal(id) {
        editingId = id;
        modalTitle.textContent = '编辑出库人员';

        UI.showLoader();
        fetch(`/api/outbound-staff/${id}/`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                UI.hideLoader();
                if (data.success === false) {
                    UI.toast(data.message || '加载人员数据失败', 'error');
                    return;
                }
                inputEmployeeNo.value = data.employee_no;
                inputEmployeeNo.disabled = true;
                inputName.value = data.name;
                inputPhone.value = data.phone || '';
                inputCertificateNo.value = data.certificate_no || '';
                setSelectedAreas(data.authorized_areas || []);
                inputStartDate.value = data.authorization_start_date || '';
                inputEndDate.value = data.authorization_end_date || '';
                inputStatus.checked = data.status === 'active';
                statusLabel.textContent = data.status === 'active' ? '启用' : '禁用';
                inputRemarks.value = data.remarks || '';
                formModal.style.display = 'flex';
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('加载人员数据失败', 'error');
            });
    }

    function closeFormModal() {
        formModal.style.display = 'none';
        editingId = null;
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const selectedAreas = getSelectedAreas();
        if (selectedAreas.length === 0) {
            UI.toast('请至少选择一个授权库区', 'error');
            return;
        }

        const data = {
            employee_no: inputEmployeeNo.value.trim(),
            name: inputName.value.trim(),
            phone: inputPhone.value.trim(),
            certificate_no: inputCertificateNo.value.trim(),
            authorized_areas: selectedAreas,
            authorization_start_date: inputStartDate.value,
            authorization_end_date: inputEndDate.value,
            status: inputStatus.checked ? 'active' : 'inactive',
            remarks: inputRemarks.value.trim(),
        };

        if (!data.employee_no) {
            UI.toast('工号不能为空', 'error');
            return;
        }
        if (!data.name) {
            UI.toast('姓名不能为空', 'error');
            return;
        }
        if (!data.authorization_start_date) {
            UI.toast('请选择授权开始日期', 'error');
            return;
        }
        if (!data.authorization_end_date) {
            UI.toast('请选择授权结束日期', 'error');
            return;
        }

        UI.showLoader();

        const url = editingId
            ? `/api/outbound-staff/${editingId}/update/`
            : '/api/outbound-staff/create/';

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
                    loadStaffList();
                } else {
                    UI.toast(result.message || '操作失败', 'error');
                }
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('网络连接异常', 'error');
            });
    }

    function handleDelete(id, name, status) {
        const confirmTitle = status === 'active' ? '危险操作确认' : '删除确认';
        const confirmMsg = status === 'active'
            ? `确定要删除启用状态的人员「${name}」吗？此操作不可恢复！`
            : `确定要删除人员「${name}」吗？`;
        const dangerMode = status === 'active';

        UI.confirmDanger(confirmTitle, confirmMsg, dangerMode, () => {
            UI.showLoader();
            fetch(`/api/outbound-staff/${id}/delete/`, {
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
                        loadStaffList();
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

    function openRenewModal(id, name) {
        renewingId = id;

        UI.showLoader();
        fetch(`/api/outbound-staff/${id}/`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                UI.hideLoader();
                if (data.success === false) {
                    UI.toast(data.message || '加载人员数据失败', 'error');
                    return;
                }

                renewName.textContent = data.name;
                renewEmployeeNo.textContent = data.employee_no;
                renewOldDate.textContent = data.authorization_end_date;

                const oldDate = new Date(data.authorization_end_date);
                const newDate = new Date(oldDate);
                newDate.setDate(newDate.getDate() + 90);
                renewNewDate.textContent = newDate.toISOString().split('T')[0];

                renewModal.style.display = 'flex';
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('加载人员数据失败', 'error');
            });
    }

    function closeRenewModal() {
        renewModal.style.display = 'none';
        renewingId = null;
    }

    function handleRenewConfirm() {
        if (!renewingId) return;

        UI.showLoader();
        fetch(`/api/outbound-staff/${renewingId}/renew/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ days: 90 })
        })
            .then(r => r.json())
            .then(result => {
                UI.hideLoader();
                if (result.success) {
                    UI.toast(result.message);
                    closeRenewModal();
                    loadStaffList();
                } else {
                    UI.toast(result.message || '续期失败', 'error');
                }
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('网络连接异常', 'error');
            });
    }

    init();
})();
