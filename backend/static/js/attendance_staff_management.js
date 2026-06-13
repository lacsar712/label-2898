(function () {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    const tableBody = document.getElementById('asm-table-body');
    const pageInfo = document.getElementById('asm-page-info');
    const prevBtn = document.getElementById('asm-page-prev');
    const nextBtn = document.getElementById('asm-page-next');
    const filterBtn = document.getElementById('asm-filter-btn');
    const resetBtn = document.getElementById('asm-reset-btn');
    const addBtn = document.getElementById('asm-add-btn');
    const templateBtn = document.getElementById('asm-template-btn');
    const importBtn = document.getElementById('asm-import-btn');

    const filterCompanySelect = document.getElementById('asm-filter-company');

    const formModal = document.getElementById('asm-form-modal');
    const form = document.getElementById('asm-form');
    const formCancelBtn = document.getElementById('asm-form-cancel');
    const modalTitle = document.getElementById('asm-modal-title');

    const inputEmployeeNo = document.getElementById('asm-input-employee-no');
    const inputName = document.getElementById('asm-input-name');
    const inputCompany = document.getElementById('asm-input-company');
    const inputPosition = document.getElementById('asm-input-position');
    const inputPhone = document.getElementById('asm-input-phone');
    const inputHireDate = document.getElementById('asm-input-hire-date');
    const inputEmergencyContact = document.getElementById('asm-input-emergency-contact');
    const inputEmergencyPhone = document.getElementById('asm-input-emergency-phone');
    const inputStatus = document.getElementById('asm-input-status');
    const statusLabel = document.getElementById('asm-status-label');
    const inputRemarks = document.getElementById('asm-input-remarks');

    const importModal = document.getElementById('asm-import-modal');
    const importCancelBtn = document.getElementById('asm-import-cancel');
    const uploadArea = document.getElementById('asm-upload-area');
    const fileInput = document.getElementById('asm-file-input');
    const fileInfo = document.getElementById('asm-file-info');
    const selectedName = document.getElementById('asm-selected-name');
    const fileRemove = document.getElementById('asm-file-remove');
    const importSubmit = document.getElementById('asm-import-submit');
    const importResult = document.getElementById('asm-import-result');

    let currentPage = 1;
    let totalPages = 1;
    let editingId = null;
    let selectedFile = null;

    function init() {
        loadStaffList();
        loadFilterOptions();
        bindEvents();
    }

    function bindEvents() {
        filterBtn.addEventListener('click', function () {
            currentPage = 1;
            loadStaffList();
        });

        resetBtn.addEventListener('click', function () {
            document.getElementById('asm-filter-name').value = '';
            document.getElementById('asm-filter-company').value = '';
            document.getElementById('asm-filter-status').value = '';
            currentPage = 1;
            loadStaffList();
            loadFilterOptions();
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
        templateBtn.addEventListener('click', function () {
            window.location.href = '/api/attendance-staff/template/';
        });
        importBtn.addEventListener('click', openImportModal);

        formCancelBtn.addEventListener('click', closeFormModal);
        formModal.addEventListener('click', function (e) {
            if (e.target === formModal) closeFormModal();
        });

        inputStatus.addEventListener('change', function () {
            statusLabel.textContent = this.checked ? '在职' : '离职';
        });

        form.addEventListener('submit', handleFormSubmit);

        tableBody.addEventListener('click', handleTableClick);

        importCancelBtn.addEventListener('click', function () {
            closeImportModal();
        });
        importModal.addEventListener('click', function (e) {
            if (e.target === importModal) closeImportModal();
        });

        uploadArea.addEventListener('click', function () {
            fileInput.click();
        });

        uploadArea.addEventListener('dragover', function (e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function (e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function (e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        });

        fileInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });

        fileRemove.addEventListener('click', clearFileSelection);

        importSubmit.addEventListener('click', handleImportSubmit);
    }

    function loadFilterOptions() {
        fetch('/api/attendance-staff/filter-options/', {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                if (data.companies && data.companies.length > 0) {
                    const currentValue = filterCompanySelect.value;
                    filterCompanySelect.innerHTML = '<option value="">全部连队</option>';
                    data.companies.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c;
                        opt.textContent = c;
                        filterCompanySelect.appendChild(opt);
                    });
                    filterCompanySelect.value = currentValue;
                }
            })
            .catch(() => { });
    }

    function loadStaffList() {
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('page_size', '10');

        const name = document.getElementById('asm-filter-name').value.trim();
        const company = document.getElementById('asm-filter-company').value;
        const status = document.getElementById('asm-filter-status').value;

        if (name) params.set('name', name);
        if (company) params.set('company', company);
        if (status) params.set('status', status);

        fetch(`/api/attendance-staff/?${params.toString()}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                totalPages = data.total_pages;
                renderTable(data.items);
                pageInfo.textContent = `共 ${data.total} 条 / 第 ${data.page} 页 / 共 ${data.total_pages} 页`;
                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= totalPages;

                if (data.companies && data.companies.length > 0 && filterCompanySelect.options.length <= 1) {
                    const currentValue = filterCompanySelect.value;
                    filterCompanySelect.innerHTML = '<option value="">全部连队</option>';
                    data.companies.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c;
                        opt.textContent = c;
                        filterCompanySelect.appendChild(opt);
                    });
                    filterCompanySelect.value = currentValue;
                }
            })
            .catch(() => UI.toast('加载考勤人员列表失败', 'error'));
    }

    function renderTable(items) {
        tableBody.innerHTML = '';

        if (items.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="9">
                    <div class="asm-empty-hint">
                        <i class="bi bi-person-x"></i>
                        <p>暂无考勤人员数据</p>
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
                tr.classList.add('asm-row-inactive');
            }

            const statusBadge = item.status === 'active'
                ? '<span class="asm-status-badge asm-status-active">在职</span>'
                : '<span class="asm-status-badge asm-status-inactive">离职</span>';

            const summary = item.attendance_summary || {};
            const summaryHtml = `
                <div class="asm-summary-cell">
                    <span class="asm-summary-chip"><strong>出勤</strong>${summary.present_days || 0}天</span>
                    <span class="asm-summary-chip"><strong>工时</strong>${summary.total_hours || 0}h</span>
                </div>
            `;

            const inactiveTag = item.status === 'inactive' ? '<span class="asm-tag-inactive">已离职</span>' : '';

            tr.innerHTML = `
                <td class="asm-code-cell">${item.employee_no}</td>
                <td class="asm-name-cell">
                    <a href="/attendance-staff/${item.id}/" class="asm-detail-link">
                        <span class="asm-status-dot"></span>
                        ${item.name}
                    </a>
                    ${inactiveTag}
                </td>
                <td class="asm-company-cell">${item.company}</td>
                <td>${item.position || '-'}</td>
                <td class="asm-phone-cell">${item.phone || '-'}</td>
                <td>${item.hire_date || '-'}</td>
                <td>${statusBadge}</td>
                <td>${summaryHtml}</td>
                <td class="asm-actions">
                    <button class="asm-action-btn asm-detail-btn" data-id="${item.id}">
                        <i class="bi bi-eye"></i> 详情
                    </button>
                    <button class="asm-action-btn asm-edit-btn" data-id="${item.id}">
                        <i class="bi bi-pencil-square"></i> 编辑
                    </button>
                    <button class="asm-action-btn asm-delete-btn" data-id="${item.id}" data-name="${item.name}" data-status="${item.status}">
                        <i class="bi bi-trash"></i> 删除
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function handleTableClick(e) {
        e.stopPropagation();

        const detailBtn = e.target.closest('.asm-detail-btn');
        if (detailBtn) {
            const id = detailBtn.dataset.id;
            window.location.href = `/attendance-staff/${id}/`;
            return;
        }

        const editBtn = e.target.closest('.asm-edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            openEditModal(id);
            return;
        }

        const deleteBtn = e.target.closest('.asm-delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const name = deleteBtn.dataset.name;
            const status = deleteBtn.dataset.status;
            handleDelete(id, name, status);
        }
    }

    function openCreateModal() {
        editingId = null;
        modalTitle.textContent = '新增考勤人员';
        form.reset();
        inputEmployeeNo.disabled = false;
        inputEmployeeNo.value = '';
        inputName.value = '';
        inputCompany.value = '';
        inputPosition.value = '';
        inputPhone.value = '';
        inputHireDate.value = '';
        inputEmergencyContact.value = '';
        inputEmergencyPhone.value = '';
        inputStatus.checked = true;
        statusLabel.textContent = '在职';
        inputRemarks.value = '';
        formModal.style.display = 'flex';
    }

    function openEditModal(id) {
        editingId = id;
        modalTitle.textContent = '编辑考勤人员';

        UI.showLoader();
        fetch(`/api/attendance-staff/?page=1&page_size=1000`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                UI.hideLoader();
                const staff = data.items.find(s => s.id === parseInt(id));
                if (!staff) {
                    UI.toast('未找到该人员数据', 'error');
                    return;
                }
                inputEmployeeNo.value = staff.employee_no;
                inputEmployeeNo.disabled = true;
                inputName.value = staff.name;
                inputCompany.value = staff.company;
                inputPosition.value = staff.position || '';
                inputPhone.value = staff.phone || '';
                inputHireDate.value = staff.hire_date || '';
                inputEmergencyContact.value = staff.emergency_contact || '';
                inputEmergencyPhone.value = staff.emergency_phone || '';
                inputStatus.checked = staff.status === 'active';
                statusLabel.textContent = staff.status === 'active' ? '在职' : '离职';
                inputRemarks.value = staff.remarks || '';
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

        const data = {
            employee_no: inputEmployeeNo.value.trim(),
            name: inputName.value.trim(),
            company: inputCompany.value.trim(),
            position: inputPosition.value.trim(),
            phone: inputPhone.value.trim(),
            hire_date: inputHireDate.value.trim(),
            emergency_contact: inputEmergencyContact.value.trim(),
            emergency_phone: inputEmergencyPhone.value.trim(),
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
        if (!data.company) {
            UI.toast('所属连队不能为空', 'error');
            return;
        }

        UI.showLoader();

        const url = editingId
            ? `/api/attendance-staff/${editingId}/update/`
            : '/api/attendance-staff/create/';

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
                    loadFilterOptions();
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
            ? `确定要删除在职人员「${name}」吗？此操作不可恢复！`
            : `确定要删除人员「${name}」吗？`;
        const dangerMode = status === 'active';

        UI.confirmDanger(confirmTitle, confirmMsg, dangerMode, () => {
            UI.showLoader();
            fetch(`/api/attendance-staff/${id}/delete/`, {
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
                        loadFilterOptions();
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

    function openImportModal() {
        clearFileSelection();
        importResult.style.display = 'none';
        importResult.innerHTML = '';
        importModal.style.display = 'flex';
    }

    function closeImportModal() {
        importModal.style.display = 'none';
        clearFileSelection();
    }

    function handleFileSelect(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            UI.toast('请选择 CSV 格式文件', 'error');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            UI.toast('文件大小不能超过 10MB', 'error');
            return;
        }

        selectedFile = file;
        selectedName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        uploadArea.style.display = 'none';
        fileInfo.style.display = 'flex';
        importSubmit.disabled = false;
        importResult.style.display = 'none';
        importResult.innerHTML = '';
    }

    function clearFileSelection() {
        selectedFile = null;
        fileInput.value = '';
        selectedName.textContent = '';
        uploadArea.style.display = '';
        fileInfo.style.display = 'none';
        importSubmit.disabled = true;
    }

    function handleImportSubmit() {
        if (!selectedFile) {
            UI.toast('请先选择文件', 'error');
            return;
        }

        UI.showLoader();
        importSubmit.disabled = true;

        const formData = new FormData();
        formData.append('csv_file', selectedFile);

        fetch('/api/attendance-staff/import/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken
            },
            body: formData
        })
            .then(r => r.json())
            .then(result => {
                UI.hideLoader();

                const statsHtml = `
                    <div class="asm-import-stats">
                        <div class="asm-stat-item">
                            <div class="asm-stat-value asm-stat-success">${result.success_count || 0}</div>
                            <div class="asm-stat-label">成功条数</div>
                        </div>
                        <div class="asm-stat-item">
                            <div class="asm-stat-value asm-stat-fail">${result.fail_count || 0}</div>
                            <div class="asm-stat-label">失败条数</div>
                        </div>
                    </div>
                `;

                let failListHtml = '';
                if (result.fail_details && result.fail_details.length > 0) {
                    const failItems = result.fail_details.map(d => `
                        <div class="asm-fail-item">
                            <span class="asm-fail-row">[第${d.row}行]</span>
                            ${d.employee_no ? `<span class="asm-fail-row">工号:${d.employee_no}</span>` : ''}
                            ${d.name ? `<span class="asm-fail-name">${d.name}</span>` : ''}
                            <span class="asm-fail-reason">${d.reason}</span>
                        </div>
                    `).join('');
                    failListHtml = `
                        <div class="asm-fail-list-title">失败明细：</div>
                        <div class="asm-fail-list">${failItems}</div>
                    `;
                }

                importResult.innerHTML = statsHtml + failListHtml;
                importResult.style.display = '';

                if (result.success) {
                    UI.toast(result.message);
                    loadStaffList();
                    loadFilterOptions();
                } else {
                    UI.toast(result.message || '导入失败', 'error');
                }

                clearFileSelection();
            })
            .catch(() => {
                UI.hideLoader();
                importSubmit.disabled = false;
                UI.toast('网络连接异常', 'error');
            });
    }

    init();
})();
