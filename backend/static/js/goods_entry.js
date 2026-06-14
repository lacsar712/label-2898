(function () {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    const categorySelect = document.getElementById('ge-category');
    const varietySelect = document.getElementById('ge-variety');
    const unitSelect = document.getElementById('ge-unit');
    const quantityInput = document.getElementById('ge-quantity');
    const inventoryHint = document.getElementById('ge-inventory-hint');
    const entryDateInput = document.getElementById('ge-entry-date');
    const form = document.getElementById('ge-form');
    const tableBody = document.getElementById('ge-table-body');
    const pageInfo = document.getElementById('ge-page-info');
    const prevBtn = document.getElementById('ge-page-prev');
    const nextBtn = document.getElementById('ge-page-next');
    const filterBtn = document.getElementById('ge-filter-btn');

    let currentPage = 1;
    let totalPages = 1;

    function todayStr() {
        const d = new Date();
        return d.toISOString().slice(0, 10);
    }

    function init() {
        entryDateInput.value = todayStr();
        loadCategories();
        loadEntries();
    }

    function loadCategories() {
        fetch('/api/categories/', {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                categorySelect.innerHTML = '<option value="">-- 选择品类 --</option>';
                data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.name;
                    opt.dataset.id = c.id;
                    opt.textContent = c.name;
                    categorySelect.appendChild(opt);
                });
            })
            .catch(() => UI.toast('加载品类失败', 'error'));
    }

    categorySelect.addEventListener('change', function () {
        const selected = this.options[this.selectedIndex];
        const catId = selected ? selected.dataset.id : '';

        varietySelect.innerHTML = '<option value="">-- 选择品种 --</option>';
        unitSelect.innerHTML = '<option value="">-- 选择单位 --</option>';

        if (!catId) return;

        fetch(`/api/categories/${catId}/varieties/`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                if (data.length === 0) {
                    varietySelect.innerHTML = '<option value="">-- 暂无品种 --</option>';
                } else {
                    data.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v.name;
                        opt.textContent = v.name;
                        varietySelect.appendChild(opt);
                    });
                }
            })
            .catch(() => UI.toast('加载品种失败', 'error'));

        fetch(`/api/categories/${catId}/units/`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                if (data.length === 0) {
                    unitSelect.innerHTML = '<option value="">-- 暂无单位 --</option>';
                } else {
                    data.forEach(u => {
                        const opt = document.createElement('option');
                        opt.value = u.name;
                        opt.textContent = u.name;
                        unitSelect.appendChild(opt);
                    });
                }
            })
            .catch(() => UI.toast('加载单位失败', 'error'));
    });

    let hintTimer = null;
    quantityInput.addEventListener('input', function () {
        clearTimeout(hintTimer);
        const name = form.material_name.value.trim();
        if (!name) {
            inventoryHint.textContent = '';
            return;
        }
        hintTimer = setTimeout(() => {
            fetch(`/api/inventory-hint/?material_name=${encodeURIComponent(name)}`, {
                headers: { 'X-CSRFToken': csrfToken }
            })
                .then(r => r.json())
                .then(data => {
                    if (data.total && data.total !== '0') {
                        inventoryHint.textContent = `当前库存: ${data.total} ${data.unit}`;
                    } else {
                        inventoryHint.textContent = '暂无库存记录';
                    }
                })
                .catch(() => { inventoryHint.textContent = ''; });
        }, 400);
    });

    form.material_name.addEventListener('input', function () {
        clearTimeout(hintTimer);
        if (quantityInput.value) {
            quantityInput.dispatchEvent(new Event('input'));
        }
    });

    form.addEventListener('reset', function () {
        setTimeout(() => {
            varietySelect.innerHTML = '<option value="">-- 先选择品类 --</option>';
            unitSelect.innerHTML = '<option value="">-- 先选择品类 --</option>';
            inventoryHint.textContent = '';
            entryDateInput.value = todayStr();
        }, 0);
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const data = {
            material_name: form.material_name.value.trim(),
            category: form.category.value,
            variety: form.variety.value,
            quantity: form.quantity.value,
            unit: form.unit.value,
            entry_date: form.entry_date.value,
            handler: form.handler.value.trim(),
            supplier: form.supplier.value.trim(),
            storage_area: form.storage_area.value.trim(),
            remarks: form.remarks.value.trim(),
        };

        UI.showLoader();

        fetch('/api/goods-entries/create/', {
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
                    UI.toast(result.message + '，是否提交审批？');
                    const entryId = result.id;
                    setTimeout(() => {
                        UI.confirm('提交审批', `入库单 ${result.entry_no} 创建成功，是否立即提交审批？`, () => {
                            submitForApproval(entryId);
                        });
                    }, 500);
                    form.reset();
                    entryDateInput.value = todayStr();
                    varietySelect.innerHTML = '<option value="">-- 先选择品类 --</option>';
                    unitSelect.innerHTML = '<option value="">-- 先选择品类 --</option>';
                    inventoryHint.textContent = '';
                    loadEntries();
                } else {
                    UI.toast(result.message || '创建失败', 'error');
                }
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('网络连接异常', 'error');
            });
    });

    function loadEntries() {
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('page_size', '10');

        const dateStart = document.getElementById('ge-filter-start').value;
        const dateEnd = document.getElementById('ge-filter-end').value;
        const handler = document.getElementById('ge-filter-handler').value.trim();
        const status = document.getElementById('ge-filter-status').value;

        if (dateStart) params.set('date_start', dateStart);
        if (dateEnd) params.set('date_end', dateEnd);
        if (handler) params.set('handler', handler);
        if (status) params.set('status', status);

        fetch(`/api/goods-entries/?${params.toString()}`, {
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
            .catch(() => UI.toast('加载记录失败', 'error'));
    }

    function renderTable(items) {
        tableBody.innerHTML = '';

        if (items.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'ge-empty-row';
            tr.innerHTML = '<td colspan="13">暂无入库记录</td>';
            tableBody.appendChild(tr);
            return;
        }

        items.forEach(item => {
            const mainRow = document.createElement('tr');
            mainRow.dataset.id = item.id;

            const statusClass = item.status === 'effective' ? 'ge-status-effective' : 'ge-status-voided';
            const canVoid = item.status === 'effective';

            const approvalStatus = item.approval_status || 'draft';
            const approvalStatusDisplay = item.approval_status_display || '草稿';
            const approvalStatusClass = `ge-status-${approvalStatus}`;

            const canSubmit = approvalStatus === 'draft' || approvalStatus === 'rejected';

            mainRow.innerHTML = `
                <td><button class="ge-expand-btn" data-id="${item.id}"><i class="bi bi-chevron-right"></i></button></td>
                <td>${item.entry_no}</td>
                <td>${item.material_name}</td>
                <td>${item.category}</td>
                <td>${item.variety}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td>${item.entry_date}</td>
                <td>${item.handler}</td>
                <td><span class="ge-status-badge ${statusClass}">${item.status_display}</span></td>
                <td><span class="ge-status-badge ${approvalStatusClass}">${approvalStatusDisplay}</span></td>
                <td>${canVoid ? `<button class="ge-void-btn" data-id="${item.id}" data-no="${item.entry_no}">作废</button>` : '-'}</td>
                <td>${canSubmit ? `<button class="ge-submit-btn" data-id="${item.id}" data-no="${item.entry_no}">提交审批</button>` : '-'}</td>
            `;
            tableBody.appendChild(mainRow);

            const detailRow = document.createElement('tr');
            detailRow.className = 'ge-detail-row';
            detailRow.dataset.detailId = item.id;
            detailRow.innerHTML = `
                <td colspan="13">
                    <div class="ge-detail-content" data-detail-id="${item.id}">
                        <div class="ge-detail-grid">
                            <div class="ge-detail-item">
                                <div class="ge-detail-label">供应商</div>
                                <div class="ge-detail-value">${item.supplier || '-'}</div>
                            </div>
                            <div class="ge-detail-item">
                                <div class="ge-detail-label">存放库区</div>
                                <div class="ge-detail-value">${item.storage_area || '-'}</div>
                            </div>
                            <div class="ge-detail-item">
                                <div class="ge-detail-label">备注</div>
                                <div class="ge-detail-value">${item.remarks || '-'}</div>
                            </div>
                            <div class="ge-detail-item">
                                <div class="ge-detail-label">创建时间</div>
                                <div class="ge-detail-value">${item.created_at}</div>
                            </div>
                            ${item.status === 'voided' ? `
                            <div class="ge-detail-item">
                                <div class="ge-detail-label">作废人</div>
                                <div class="ge-detail-value">${item.voided_by || '-'}</div>
                            </div>
                            <div class="ge-detail-item">
                                <div class="ge-detail-label">作废时间</div>
                                <div class="ge-detail-value">${item.voided_at || '-'}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </td>
            `;
            tableBody.appendChild(detailRow);
        });
    }

    tableBody.addEventListener('click', function (e) {
        const expandBtn = e.target.closest('.ge-expand-btn');
        if (expandBtn) {
            const id = expandBtn.dataset.id;
            const content = document.querySelector(`.ge-detail-content[data-detail-id="${id}"]`);
            if (content) {
                const isActive = content.classList.contains('active');
                content.classList.toggle('active');
                expandBtn.classList.toggle('expanded');
            }
            return;
        }

        const voidBtn = e.target.closest('.ge-void-btn');
        if (voidBtn) {
            const id = voidBtn.dataset.id;
            const entryNo = voidBtn.dataset.no;
            UI.confirm('作废确认', `确定要作废入库单 ${entryNo} 吗？作废后不可恢复。`, () => {
                UI.showLoader();
                fetch(`/api/goods-entries/${id}/void/`, {
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
                            loadEntries();
                        } else {
                            UI.toast(result.message || '作废失败', 'error');
                        }
                    })
                    .catch(() => {
                        UI.hideLoader();
                        UI.toast('网络连接异常', 'error');
                    });
            });
        }

        const submitBtn = e.target.closest('.ge-submit-btn');
        if (submitBtn) {
            const id = submitBtn.dataset.id;
            const entryNo = submitBtn.dataset.no;
            UI.confirm('提交审批', `确定要提交入库单 ${entryNo} 进行审批吗？`, () => {
                submitForApproval(id);
            });
        }
    });

    function submitForApproval(id) {
        UI.showLoader();
        fetch(`/api/approval/${id}/submit/`, {
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
                    loadEntries();
                } else {
                    UI.toast(result.message || '提交失败', 'error');
                }
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('网络连接异常', 'error');
            });
    }

    filterBtn.addEventListener('click', function () {
        currentPage = 1;
        loadEntries();
    });

    prevBtn.addEventListener('click', function () {
        if (currentPage > 1) {
            currentPage--;
            loadEntries();
        }
    });

    nextBtn.addEventListener('click', function () {
        if (currentPage < totalPages) {
            currentPage++;
            loadEntries();
        }
    });

    init();
})();
