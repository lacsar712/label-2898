(function () {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    const filterForm = document.getElementById('qe-filter-form');
    const fMaterialName = document.getElementById('qe-f-material-name');
    const fCategory = document.getElementById('qe-f-category');
    const fVariety = document.getElementById('qe-f-variety');
    const fDocType = document.getElementById('qe-f-doc-type');
    const fDateStart = document.getElementById('qe-f-date-start');
    const fDateEnd = document.getElementById('qe-f-date-end');
    const fHandler = document.getElementById('qe-f-handler');
    const fStatus = document.getElementById('qe-f-status');
    const clearBtn = document.getElementById('qe-clear-btn');
    const exportBtn = document.getElementById('qe-export-btn');
    const tableBody = document.getElementById('qe-table-body');
    const pageInfo = document.getElementById('qe-page-info');
    const prevBtn = document.getElementById('qe-page-prev');
    const nextBtn = document.getElementById('qe-page-next');
    const summaryBar = document.getElementById('qe-summary');

    const templateSelect = document.getElementById('qe-template-select');
    const templateSaveBtn = document.getElementById('qe-template-save-btn');
    const templateDeleteBtn = document.getElementById('qe-template-delete-btn');
    const templateModal = document.getElementById('qe-template-modal');
    const templateNameInput = document.getElementById('qe-template-name');
    const templateModalCancel = document.getElementById('qe-template-modal-cancel');
    const templateModalConfirm = document.getElementById('qe-template-modal-confirm');

    let currentPage = 1;
    let totalPages = 1;
    let allCategories = [];
    let allVarieties = [];

    function init() {
        loadFilterOptions();
        loadTemplates();
        doQuery();
    }

    function loadFilterOptions() {
        fetch('/api/query-filter-options/', {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                allCategories = data.categories || [];
                allVarieties = data.varieties || [];

                fCategory.innerHTML = '<option value="">全部品类</option>';
                allCategories.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.name;
                    opt.dataset.id = c.id;
                    opt.textContent = c.name;
                    fCategory.appendChild(opt);
                });

                fHandler.innerHTML = '<option value="">全部经办人</option>';
                (data.handlers || []).forEach(h => {
                    const opt = document.createElement('option');
                    opt.value = h;
                    opt.textContent = h;
                    fHandler.appendChild(opt);
                });
            })
            .catch(() => UI.toast('加载筛选选项失败', 'error'));
    }

    fCategory.addEventListener('change', function () {
        const selected = this.options[this.selectedIndex];
        const catId = selected ? selected.dataset.id : '';

        fVariety.innerHTML = '<option value="">全部品种</option>';
        if (!catId) return;

        const filtered = allVarieties.filter(v => String(v.category_id) === String(catId));
        if (filtered.length === 0) {
            fVariety.innerHTML = '<option value="">-- 暂无品种 --</option>';
        } else {
            filtered.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.name;
                opt.textContent = v.name;
                fVariety.appendChild(opt);
            });
        }
    });

    function getFilters() {
        return {
            material_name: fMaterialName.value.trim(),
            category: fCategory.value,
            variety: fVariety.value,
            doc_type: fDocType.value,
            date_start: fDateStart.value,
            date_end: fDateEnd.value,
            handler: fHandler.value,
            status: fStatus.value,
        };
    }

    function buildQueryParams(page) {
        const params = new URLSearchParams();
        params.set('page', page || currentPage);
        params.set('page_size', '15');

        const filters = getFilters();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.set(key, filters[key]);
            }
        });
        return params;
    }

    function doQuery(page) {
        if (page) currentPage = page;
        const params = buildQueryParams(currentPage);

        UI.showLoader();
        fetch(`/api/query-records/?${params.toString()}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                UI.hideLoader();
                totalPages = data.total_pages || 1;
                renderTable(data.items || []);
                renderSummary(data.summary);
                pageInfo.textContent = `共 ${data.total} 条 / 第 ${data.page} 页 / 共 ${data.total_pages} 页`;
                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= totalPages;
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('查询失败', 'error');
            });
    }

    function renderTable(items) {
        tableBody.innerHTML = '';
        if (!items || items.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'qe-empty-row';
            tr.innerHTML = '<td colspan="10">暂无查询结果，请调整筛选条件</td>';
            tableBody.appendChild(tr);
            return;
        }

        items.forEach(item => {
            const tr = document.createElement('tr');

            const docTypeClass = item.doc_type === 'inbound' ? 'qe-doc-type-inbound' : 'qe-doc-type-outbound';
            const statusClass = item.status === 'effective' ? 'qe-status-effective' : 'qe-status-voided';

            tr.innerHTML = `
                <td><span class="qe-doc-no">${item.doc_no}</span></td>
                <td><span class="qe-doc-type-badge ${docTypeClass}">${item.doc_type_display}</span></td>
                <td>${item.material_name}</td>
                <td>${item.category}</td>
                <td>${item.variety}</td>
                <td><span class="qe-quantity-cell">${item.quantity}</span></td>
                <td>${item.unit}</td>
                <td>${item.doc_date}</td>
                <td>${item.handler}</td>
                <td><span class="qe-status-badge ${statusClass}">${item.status_display}</span></td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function renderSummary(summary) {
        if (!summary) {
            summaryBar.style.display = 'none';
            return;
        }
        summaryBar.style.display = 'flex';
        document.getElementById('qe-s-total-count').textContent = summary.total_count || 0;
        document.getElementById('qe-s-total-quantity').textContent = summary.total_quantity || 0;
        document.getElementById('qe-s-inbound-count').textContent = summary.inbound_count || 0;
        document.getElementById('qe-s-inbound-qty').textContent = summary.inbound_quantity || 0;
        document.getElementById('qe-s-outbound-count').textContent = summary.outbound_count || 0;
        document.getElementById('qe-s-outbound-qty').textContent = summary.outbound_quantity || 0;
    }

    filterForm.addEventListener('submit', function (e) {
        e.preventDefault();
        currentPage = 1;
        doQuery();
    });

    clearBtn.addEventListener('click', function () {
        fMaterialName.value = '';
        fCategory.value = '';
        fVariety.innerHTML = '<option value="">全部品种</option>';
        fDocType.value = '';
        fDateStart.value = '';
        fDateEnd.value = '';
        fHandler.value = '';
        fStatus.value = '';
        currentPage = 1;
        doQuery();
    });

    exportBtn.addEventListener('click', function () {
        const params = buildQueryParams(1);
        params.delete('page');
        params.delete('page_size');
        window.location.href = `/api/query-export/?${params.toString()}`;
    });

    prevBtn.addEventListener('click', function () {
        if (currentPage > 1) {
            currentPage--;
            doQuery();
        }
    });

    nextBtn.addEventListener('click', function () {
        if (currentPage < totalPages) {
            currentPage++;
            doQuery();
        }
    });

    function loadTemplates() {
        fetch('/api/query-templates/?template_type=query_export', {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                const items = data.items || [];
                templateSelect.innerHTML = '<option value="">-- 选择筛选模板 --</option>';
                items.forEach(tpl => {
                    const opt = document.createElement('option');
                    opt.value = tpl.id;
                    opt.textContent = tpl.name;
                    opt.dataset.filterData = JSON.stringify(tpl.filter_data);
                    templateSelect.appendChild(opt);
                });
                templateDeleteBtn.disabled = true;
            })
            .catch(() => {});
    }

    templateSelect.addEventListener('change', function () {
        const selected = this.options[this.selectedIndex];
        templateDeleteBtn.disabled = !this.value;

        if (!this.value || !selected) return;

        try {
            const filterData = JSON.parse(selected.dataset.filterData);
            applyFilterData(filterData);
            currentPage = 1;
            doQuery();
        } catch (e) {
            UI.toast('模板数据解析失败', 'error');
        }
    });

    function applyFilterData(data) {
        fMaterialName.value = data.material_name || '';
        fCategory.value = data.category || '';

        if (data.category) {
            const selectedOpt = fCategory.options[fCategory.selectedIndex];
            const catId = selectedOpt ? selectedOpt.dataset.id : '';
            fVariety.innerHTML = '<option value="">全部品种</option>';
            if (catId) {
                const filtered = allVarieties.filter(v => String(v.category_id) === String(catId));
                filtered.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.name;
                    opt.textContent = v.name;
                    fVariety.appendChild(opt);
                });
            }
        } else {
            fVariety.innerHTML = '<option value="">全部品种</option>';
        }

        fVariety.value = data.variety || '';
        fDocType.value = data.doc_type || '';
        fDateStart.value = data.date_start || '';
        fDateEnd.value = data.date_end || '';
        fHandler.value = data.handler || '';
        fStatus.value = data.status || '';
    }

    function getCurrentFilterData() {
        return {
            material_name: fMaterialName.value.trim(),
            category: fCategory.value,
            variety: fVariety.value,
            doc_type: fDocType.value,
            date_start: fDateStart.value,
            date_end: fDateEnd.value,
            handler: fHandler.value,
            status: fStatus.value,
        };
    }

    templateSaveBtn.addEventListener('click', function () {
        templateNameInput.value = '';
        templateModal.style.display = 'flex';
    });

    templateModalCancel.addEventListener('click', function () {
        templateModal.style.display = 'none';
    });

    templateModalConfirm.addEventListener('click', function () {
        const name = templateNameInput.value.trim();
        if (!name) {
            UI.toast('请输入模板名称', 'error');
            return;
        }

        const filterData = getCurrentFilterData();

        fetch('/api/query-templates/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                name: name,
                template_type: 'query_export',
                filter_data: filterData,
            })
        })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    UI.toast(result.message);
                    templateModal.style.display = 'none';
                    loadTemplates();
                } else {
                    UI.toast(result.message || '保存失败', 'error');
                }
            })
            .catch(() => UI.toast('网络异常', 'error'));
    });

    templateDeleteBtn.addEventListener('click', function () {
        const tplId = templateSelect.value;
        if (!tplId) return;

        const tplName = templateSelect.options[templateSelect.selectedIndex].textContent;
        UI.confirmDanger('删除模板', `确定要删除筛选模板「${tplName}」吗？`, true, () => {
            fetch(`/api/query-templates/${tplId}/delete/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': csrfToken }
            })
                .then(r => r.json())
                .then(result => {
                    if (result.success) {
                        UI.toast(result.message);
                        loadTemplates();
                    } else {
                        UI.toast(result.message || '删除失败', 'error');
                    }
                })
                .catch(() => UI.toast('网络异常', 'error'));
        });
    });

    init();
})();
