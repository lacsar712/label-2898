const state = {
    currentTab: 'pending',
    currentPage: 1,
    pageSize: 10,
    keyword: '',
    isStaff: false,
    selectedIds: [],
    currentDetailId: null,
    rejectTargetId: null,
    batchTargetIds: [],
};

const elements = {};

function initElements() {
    elements.tabs = document.querySelectorAll('.tab-item');
    elements.searchInput = document.getElementById('search-input');
    elements.tableBody = document.getElementById('approval-table-body');
    elements.emptyState = document.getElementById('empty-state');
    elements.paginationInfo = document.getElementById('pagination-info');
    elements.pageNumbers = document.getElementById('page-numbers');
    elements.btnPrev = document.getElementById('btn-prev');
    elements.btnNext = document.getElementById('btn-next');
    elements.pageSize = document.getElementById('page-size');
    elements.checkAll = document.getElementById('check-all');
    elements.batchActions = document.getElementById('batch-actions');
    elements.btnBatchApprove = document.getElementById('btn-batch-approve');
    elements.statPending = document.getElementById('stat-pending');
    elements.statApproved = document.getElementById('stat-approved');
    elements.statRejected = document.getElementById('stat-rejected');
    elements.tabPendingCount = document.getElementById('tab-pending-count');
    elements.tabApprovedCount = document.getElementById('tab-approved-count');
    elements.tabRejectedCount = document.getElementById('tab-rejected-count');

    elements.detailModal = document.getElementById('detail-modal');
    elements.btnCloseDetail = document.getElementById('btn-close-detail');
    elements.detailBasic = document.getElementById('detail-basic');
    elements.detailTimeline = document.getElementById('detail-timeline');
    elements.approvalForm = document.getElementById('approval-form');
    elements.approvalOpinion = document.getElementById('approval-opinion');
    elements.btnApprove = document.getElementById('btn-approve');
    elements.btnReject = document.getElementById('btn-reject');

    elements.rejectModal = document.getElementById('reject-modal');
    elements.rejectReason = document.getElementById('reject-reason');
    elements.btnCancelReject = document.getElementById('btn-cancel-reject');
    elements.btnConfirmReject = document.getElementById('btn-confirm-reject');

    elements.batchOpinionModal = document.getElementById('batch-opinion-modal');
    elements.batchOpinion = document.getElementById('batch-opinion');
    elements.selectedCountInfo = document.getElementById('selected-count-info');
    elements.btnCancelBatch = document.getElementById('btn-cancel-batch');
    elements.btnConfirmBatch = document.getElementById('btn-confirm-batch');
}

function initEvents() {
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });

    let searchTimer;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.keyword = e.target.value.trim();
            state.currentPage = 1;
            loadList();
        }, 300);
    });

    elements.pageSize.addEventListener('change', (e) => {
        state.pageSize = parseInt(e.target.value);
        state.currentPage = 1;
        loadList();
    });

    elements.btnPrev.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            loadList();
        }
    });

    elements.btnNext.addEventListener('click', () => {
        state.currentPage++;
        loadList();
    });

    elements.checkAll.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.cm-check-item');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            const id = parseInt(cb.dataset.id);
            if (e.target.checked) {
                if (!state.selectedIds.includes(id)) {
                    state.selectedIds.push(id);
                }
            } else {
                state.selectedIds = state.selectedIds.filter(i => i !== id);
            }
        });
        updateBatchActions();
    });

    elements.btnBatchApprove.addEventListener('click', () => {
        if (state.selectedIds.length === 0) {
            showToast('请先选择要审批的单据', 'error');
            return;
        }
        state.batchTargetIds = [...state.selectedIds];
        elements.selectedCountInfo.textContent = `已选择 ${state.selectedIds.length} 条单据`;
        elements.batchOpinion.value = '';
        elements.batchOpinionModal.style.display = 'flex';
    });

    elements.btnCloseDetail.addEventListener('click', closeDetailModal);
    elements.detailModal.addEventListener('click', (e) => {
        if (e.target === elements.detailModal) {
            closeDetailModal();
        }
    });

    elements.btnApprove.addEventListener('click', handleApprove);
    elements.btnReject.addEventListener('click', handleRejectClick);

    elements.btnCancelReject.addEventListener('click', () => {
        elements.rejectModal.style.display = 'none';
        elements.rejectReason.value = '';
        state.rejectTargetId = null;
    });
    elements.rejectModal.addEventListener('click', (e) => {
        if (e.target === elements.rejectModal) {
            elements.rejectModal.style.display = 'none';
            elements.rejectReason.value = '';
            state.rejectTargetId = null;
        }
    });
    elements.btnConfirmReject.addEventListener('click', handleConfirmReject);

    elements.btnCancelBatch.addEventListener('click', () => {
        elements.batchOpinionModal.style.display = 'none';
        elements.batchOpinion.value = '';
        state.batchTargetIds = [];
    });
    elements.batchOpinionModal.addEventListener('click', (e) => {
        if (e.target === elements.batchOpinionModal) {
            elements.batchOpinionModal.style.display = 'none';
            elements.batchOpinion.value = '';
            state.batchTargetIds = [];
        }
    });
    elements.btnConfirmBatch.addEventListener('click', handleBatchApprove);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDetailModal();
            elements.rejectModal.style.display = 'none';
            elements.batchOpinionModal.style.display = 'none';
        }
    });
}

function switchTab(tab) {
    state.currentTab = tab;
    state.currentPage = 1;
    state.selectedIds = [];

    elements.tabs.forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });

    if (tab === 'pending' && state.isStaff) {
        elements.checkAll.style.display = 'inline-block';
        elements.batchActions.style.display = 'flex';
    } else {
        elements.checkAll.style.display = 'none';
        elements.batchActions.style.display = 'none';
    }

    loadList();
}

async function loadList() {
    showLoader();
    try {
        const params = new URLSearchParams({
            approval_status: state.currentTab,
            keyword: state.keyword,
            page: state.currentPage,
            page_size: state.pageSize,
        });

        const response = await fetch(`/api/approval/list/?${params}`);
        const data = await response.json();

        if (data.success === false) {
            showToast(data.message, 'error');
            return;
        }

        state.isStaff = data.is_staff;

        updateStats(data.stats);
        renderTable(data.items);
        renderPagination(data);
        updateBatchActions();

        if (state.currentTab === 'pending' && state.isStaff) {
            elements.checkAll.style.display = 'inline-block';
            elements.batchActions.style.display = 'flex';
        } else {
            elements.checkAll.style.display = 'none';
            elements.batchActions.style.display = 'none';
        }

    } catch (error) {
        console.error('加载列表失败:', error);
        showToast('加载列表失败', 'error');
    } finally {
        hideLoader();
    }
}

function updateStats(stats) {
    elements.statPending.textContent = stats.pending;
    elements.statApproved.textContent = stats.approved;
    elements.statRejected.textContent = stats.rejected;

    elements.tabPendingCount.textContent = stats.pending;
    elements.tabApprovedCount.textContent = stats.approved;
    elements.tabRejectedCount.textContent = stats.rejected;
}

function renderTable(items) {
    if (!items || items.length === 0) {
        elements.tableBody.innerHTML = '';
        elements.emptyState.style.display = 'block';
        elements.checkAll.checked = false;
        return;
    }

    elements.emptyState.style.display = 'none';

    const rows = items.map(item => {
        const overdueBadge = item.is_overdue ? '<span class="cm-overdue-badge">超时</span>' : '';
        const checkbox = state.currentTab === 'pending' && state.isStaff
            ? `<input type="checkbox" class="cm-check cm-check-item" data-id="${item.id}" ${state.selectedIds.includes(item.id) ? 'checked' : ''}>`
            : '';

        let actions = '';
        if (item.can_approve) {
            actions = `
                <div class="cm-actions-cell">
                    <button class="btn-tech success cm-btn-sm" onclick="viewDetail(${item.id})">
                        <i class="bi bi-eye"></i> 审批
                    </button>
                </div>
            `;
        } else {
            actions = `
                <div class="cm-actions-cell">
                    <button class="btn-tech cm-btn-sm" onclick="viewDetail(${item.id})">
                        <i class="bi bi-eye"></i> 查看
                    </button>
                </div>
            `;
        }

        const rowClass = item.is_overdue ? 'overdue' : '';

        return `
            <tr class="${rowClass}">
                <td>${checkbox}</td>
                <td>
                    <span class="cm-entry-no" onclick="viewDetail(${item.id})">
                        ${item.entry_no}
                    </span>
                </td>
                <td>${escapeHtml(item.material_name)}</td>
                <td>${item.quantity} ${escapeHtml(item.unit)}</td>
                <td>${escapeHtml(item.handler)}</td>
                <td>${escapeHtml(item.supplier)}</td>
                <td>${escapeHtml(item.submitted_by)}</td>
                <td>${item.submitted_at}</td>
                <td>
                    <span class="cm-status ${item.approval_status}">
                        ${item.approval_status_display}
                    </span>
                    ${overdueBadge}
                </td>
                <td>${actions}</td>
            </tr>
        `;
    }).join('');

    elements.tableBody.innerHTML = rows;

    document.querySelectorAll('.cm-check-item').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                if (!state.selectedIds.includes(id)) {
                    state.selectedIds.push(id);
                }
            } else {
                state.selectedIds = state.selectedIds.filter(i => i !== id);
            }
            updateCheckAllState();
            updateBatchActions();
        });
    });
}

function updateCheckAllState() {
    const checkboxes = document.querySelectorAll('.cm-check-item');
    const checkedCount = document.querySelectorAll('.cm-check-item:checked').length;
    elements.checkAll.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
}

function updateBatchActions() {
    if (state.currentTab === 'pending' && state.isStaff && state.selectedIds.length > 0) {
        elements.batchActions.style.display = 'flex';
        elements.btnBatchApprove.textContent = `批量通过 (${state.selectedIds.length})`;
    } else {
        elements.batchActions.style.display = 'none';
    }
}

function renderPagination(data) {
    const { total, page, page_size, total_pages } = data;

    elements.paginationInfo.textContent = `共 ${total} 条记录，第 ${page}/${total_pages} 页`;

    elements.btnPrev.disabled = page <= 1;
    elements.btnNext.disabled = page >= total_pages;

    let pageNumbers = '';
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(total_pages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
        pageNumbers += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (start > 2) {
            pageNumbers += `<span style="color: rgba(255,255,255,0.5); padding: 0 5px;">...</span>`;
        }
    }

    for (let i = start; i <= end; i++) {
        const active = i === page ? 'active' : '';
        pageNumbers += `<button class="page-btn ${active}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (end < total_pages) {
        if (end < total_pages - 1) {
            pageNumbers += `<span style="color: rgba(255,255,255,0.5); padding: 0 5px;">...</span>`;
        }
        pageNumbers += `<button class="page-btn" onclick="goToPage(${total_pages})">${total_pages}</button>`;
    }

    elements.pageNumbers.innerHTML = pageNumbers;
}

function goToPage(page) {
    state.currentPage = page;
    loadList();
}

async function viewDetail(id) {
    state.currentDetailId = id;
    showLoader();

    try {
        const response = await fetch(`/api/approval/${id}/`);
        const data = await response.json();

        if (data.success === false) {
            showToast(data.message, 'error');
            return;
        }

        renderDetail(data);
        elements.detailModal.style.display = 'flex';

    } catch (error) {
        console.error('加载详情失败:', error);
        showToast('加载详情失败', 'error');
    } finally {
        hideLoader();
    }
}

function renderDetail(data) {
    const basicFields = [
        { label: '入库单号', value: data.entry_no },
        { label: '审批状态', value: `<span class="cm-status ${data.approval_status}">${data.approval_status_display}</span>` },
        { label: '物资名称', value: escapeHtml(data.material_name) },
        { label: '品类', value: escapeHtml(data.category) },
        { label: '品种', value: escapeHtml(data.variety) },
        { label: '数量', value: `${data.quantity} ${escapeHtml(data.unit)}` },
        { label: '入库日期', value: data.entry_date },
        { label: '经办人', value: escapeHtml(data.handler) },
        { label: '供应商', value: escapeHtml(data.supplier) },
        { label: '存放库区', value: escapeHtml(data.storage_area) },
        { label: '提交人', value: escapeHtml(data.submitted_by) },
        { label: '提交时间', value: data.submitted_at },
        { label: '审批人', value: escapeHtml(data.approved_by) || '-' },
        { label: '审批时间', value: data.approved_at || '-' },
    ];

    if (data.approval_opinion) {
        basicFields.push({ label: '审批意见', value: escapeHtml(data.approval_opinion) });
    }

    basicFields.push({ label: '备注', value: escapeHtml(data.remarks) || '-', fullWidth: true });

    let basicHtml = basicFields.map(field => {
        const colClass = field.fullWidth ? 'style="grid-column: 1 / -1;"' : '';
        const valueClass = field.label === '备注' ? 'remarks' : '';
        return `
            <div class="detail-item" ${colClass}>
                <span class="detail-label">${field.label}</span>
                <span class="detail-value ${valueClass}">${field.value}</span>
            </div>
        `;
    }).join('');

    elements.detailBasic.innerHTML = basicHtml;

    const timelineHtml = data.timeline.map(item => `
        <div class="timeline-item ${item.type}">
            <div class="timeline-header">
                <div>
                    <span class="timeline-action">${item.action}</span>
                    <span class="timeline-operator" style="margin-left: 10px;">
                        <i class="bi bi-person"></i> ${escapeHtml(item.operator)}
                    </span>
                </div>
                <span class="timestamp">
                    <i class="bi bi-clock"></i> ${item.timestamp}
                </span>
            </div>
            ${item.opinion ? `<div class="timeline-opinion">${escapeHtml(item.opinion)}</div>` : ''}
        </div>
    `).join('');

    elements.detailTimeline.innerHTML = timelineHtml;

    if (data.can_approve) {
        elements.approvalForm.style.display = 'block';
        elements.approvalOpinion.value = '';
    } else {
        elements.approvalForm.style.display = 'none';
    }
}

function closeDetailModal() {
    elements.detailModal.style.display = 'none';
    state.currentDetailId = null;
    elements.approvalOpinion.value = '';
}

async function handleApprove() {
    if (!state.currentDetailId) return;

    const opinion = elements.approvalOpinion.value.trim();

    if (!confirm('确定要通过该入库单吗？')) {
        return;
    }

    showLoader();

    try {
        const response = await fetch(`/api/approval/${state.currentDetailId}/approve/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opinion })
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            closeDetailModal();
            loadList();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('审批失败:', error);
        showToast('审批失败', 'error');
    } finally {
        hideLoader();
    }
}

function handleRejectClick() {
    if (!state.currentDetailId) return;
    state.rejectTargetId = state.currentDetailId;
    elements.rejectReason.value = '';
    elements.rejectModal.style.display = 'flex';
}

async function handleConfirmReject() {
    const reason = elements.rejectReason.value.trim();

    if (!reason) {
        showToast('请填写驳回原因', 'error');
        return;
    }

    if (!confirm('确定要驳回该入库单吗？')) {
        return;
    }

    showLoader();

    try {
        const response = await fetch(`/api/approval/${state.rejectTargetId}/reject/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opinion: reason })
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            elements.rejectModal.style.display = 'none';
            elements.rejectReason.value = '';
            state.rejectTargetId = null;
            closeDetailModal();
            loadList();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('驳回失败:', error);
        showToast('驳回失败', 'error');
    } finally {
        hideLoader();
    }
}

async function handleBatchApprove() {
    if (state.batchTargetIds.length === 0) {
        showToast('请先选择要审批的单据', 'error');
        return;
    }

    const opinion = elements.batchOpinion.value.trim();

    if (!confirm(`确定要批量通过选中的 ${state.batchTargetIds.length} 条单据吗？`)) {
        return;
    }

    showLoader();

    try {
        const response = await fetch('/api/approval/batch-approve/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ids: state.batchTargetIds,
                opinion: opinion
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, data.fail_count > 0 ? 'error' : 'success');
            if (data.fail_messages && data.fail_messages.length > 0) {
                setTimeout(() => {
                    alert('以下单据审批失败：\n' + data.fail_messages.join('\n'));
                }, 500);
            }
            elements.batchOpinionModal.style.display = 'none';
            elements.batchOpinion.value = '';
            state.batchTargetIds = [];
            state.selectedIds = [];
            elements.checkAll.checked = false;
            loadList();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('批量审批失败:', error);
        showToast('批量审批失败', 'error');
    } finally {
        hideLoader();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-tech ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `
        <i class="bi ${type === 'error' ? 'bi-exclamation-circle' : 'bi-check-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('active'), 10);

    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function showLoader() {
    const loader = document.querySelector('.loader-overlay');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.querySelector('.loader-overlay');
    if (loader) loader.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEvents();
    loadList();
});

window.viewDetail = viewDetail;
window.goToPage = goToPage;
