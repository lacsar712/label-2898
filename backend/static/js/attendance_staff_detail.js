(function () {
    const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
    const csrfToken = csrfTokenMeta ? csrfTokenMeta.content : (document.querySelector('[name=csrfmiddlewaretoken]') ? document.querySelector('[name=csrfmiddlewaretoken]').value : '');

    const staffId = window.STAFF_ID || (window.location.pathname.match(/\/attendance-staff\/(\d+)\//) || [])[1];

    const profileContent = document.getElementById('asd-profile-content');
    const summaryContent = document.getElementById('asd-summary-content');
    const recordsBody = document.getElementById('asd-records-body');
    const pageInfo = document.getElementById('asd-page-info');
    const prevBtn = document.getElementById('asd-page-prev');
    const nextBtn = document.getElementById('asd-page-next');
    const filterBtn = document.getElementById('asd-filter-btn');
    const resetBtn = document.getElementById('asd-reset-btn');

    let currentRecordPage = 1;
    let totalRecordPages = 1;
    let currentStaff = null;

    function init() {
        if (!staffId) {
            UI.toast('缺少人员ID参数', 'error');
            return;
        }
        loadStaffDetail();
        bindEvents();
    }

    function bindEvents() {
        filterBtn.addEventListener('click', function () {
            currentRecordPage = 1;
            loadStaffDetail();
        });

        resetBtn.addEventListener('click', function () {
            document.getElementById('asd-filter-date-start').value = '';
            document.getElementById('asd-filter-date-end').value = '';
            document.getElementById('asd-filter-att-status').value = '';
            currentRecordPage = 1;
            loadStaffDetail();
        });

        prevBtn.addEventListener('click', function () {
            if (currentRecordPage > 1) {
                currentRecordPage--;
                loadStaffDetail();
            }
        });

        nextBtn.addEventListener('click', function () {
            if (currentRecordPage < totalRecordPages) {
                currentRecordPage++;
                loadStaffDetail();
            }
        });
    }

    function loadStaffDetail() {
        const params = new URLSearchParams();
        params.set('record_page', currentRecordPage);
        params.set('record_page_size', '20');

        const dateStart = document.getElementById('asd-filter-date-start').value.trim();
        const dateEnd = document.getElementById('asd-filter-date-end').value.trim();
        const attStatus = document.getElementById('asd-filter-att-status').value;

        if (dateStart) params.set('date_start', dateStart);
        if (dateEnd) params.set('date_end', dateEnd);
        if (attStatus) params.set('att_status', attStatus);

        UI.showLoader();
        fetch(`/api/attendance-staff/${staffId}/?${params.toString()}`, {
            headers: { 'X-CSRFToken': csrfToken }
        })
            .then(r => r.json())
            .then(data => {
                UI.hideLoader();
                if (data.success === false) {
                    UI.toast(data.message || '加载人员详情失败', 'error');
                    return;
                }
                currentStaff = data;
                totalRecordPages = data.records_total_pages || 1;
                renderProfile(data);
                renderSummary(data.attendance_summary);
                renderRecords(data.records);
                pageInfo.textContent = `共 ${data.records_total || 0} 条记录 / 第 ${data.records_page || 1} 页 / 共 ${data.records_total_pages || 1} 页`;
                prevBtn.disabled = currentRecordPage <= 1;
                nextBtn.disabled = currentRecordPage >= totalRecordPages;
            })
            .catch(() => {
                UI.hideLoader();
                UI.toast('加载人员详情失败', 'error');
            });
    }

    function renderProfile(staff) {
        const page = document.getElementById('asd-page');
        if (staff.status === 'inactive') {
            page.classList.add('asd-row-inactive');
        } else {
            page.classList.remove('asd-row-inactive');
        }

        const avatarText = staff.name ? staff.name.charAt(0) : '?';

        const statusBadge = staff.status === 'active'
            ? '<span class="asm-status-badge asm-status-active">在职</span>'
            : '<span class="asm-status-badge asm-status-inactive">离职</span>';

        const statusDot = staff.status === 'active'
            ? '<span class="asm-status-dot"></span>'
            : '';

        const companyHtml = staff.company ? `<span><i class="bi bi-building"></i>${escapeHtml(staff.company)}</span>` : '';
        const positionHtml = staff.position ? `<span><i class="bi bi-briefcase"></i>${escapeHtml(staff.position)}</span>` : '';
        const hireDateHtml = staff.hire_date ? `<span><i class="bi bi-calendar-check"></i>入职：${escapeHtml(staff.hire_date)}</span>` : '';

        profileContent.innerHTML = `
            <div class="asd-profile-header">
                <div class="asd-avatar">${escapeHtml(avatarText)}</div>
                <div class="asd-profile-info">
                    <div class="asd-profile-name-row">
                        <div class="asd-profile-name">
                            ${statusDot}
                            ${escapeHtml(staff.name)}
                        </div>
                        <div class="asd-profile-no">${escapeHtml(staff.employee_no)}</div>
                        ${statusBadge}
                    </div>
                    <div class="asd-profile-meta">
                        ${companyHtml}
                        ${positionHtml}
                        ${hireDateHtml}
                    </div>
                </div>
            </div>

            <div class="asd-section-title">
                <i class="bi bi-person-lines-fill"></i>
                <span>基本信息</span>
            </div>

            <div class="asd-info-grid">
                <div class="asd-info-item">
                    <div class="asd-info-label">工号</div>
                    <div class="asd-info-value">${escapeHtml(staff.employee_no)}</div>
                </div>
                <div class="asd-info-item">
                    <div class="asd-info-label">姓名</div>
                    <div class="asd-info-value">${escapeHtml(staff.name)}</div>
                </div>
                <div class="asd-info-item">
                    <div class="asd-info-label">所属连队</div>
                    <div class="asd-info-value">${staff.company ? escapeHtml(staff.company) : '<span class="empty">- 未设置 -</span>'}</div>
                </div>
                <div class="asd-info-item">
                    <div class="asd-info-label">职务</div>
                    <div class="asd-info-value">${staff.position ? escapeHtml(staff.position) : '<span class="empty">- 未设置 -</span>'}</div>
                </div>
                <div class="asd-info-item">
                    <div class="asd-info-label">联系电话</div>
                    <div class="asd-info-value">${staff.phone ? escapeHtml(staff.phone) : '<span class="empty">- 未设置 -</span>'}</div>
                </div>
                <div class="asd-info-item">
                    <div class="asd-info-label">入职日期</div>
                    <div class="asd-info-value">${staff.hire_date ? escapeHtml(staff.hire_date) : '<span class="empty">- 未设置 -</span>'}</div>
                </div>
                <div class="asd-info-item">
                    <div class="asd-info-label">紧急联系人</div>
                    <div class="asd-info-value">${staff.emergency_contact ? escapeHtml(staff.emergency_contact) : '<span class="empty">- 未设置 -</span>'}</div>
                </div>
                <div class="asd-info-item">
                    <div class="asd-info-label">紧急联系电话</div>
                    <div class="asd-info-value">${staff.emergency_phone ? escapeHtml(staff.emergency_phone) : '<span class="empty">- 未设置 -</span>'}</div>
                </div>
                <div class="asd-info-item">
                    <div class="asd-info-label">在职状态</div>
                    <div class="asd-info-value">${statusBadge}</div>
                </div>
                <div class="asd-info-item">
                    <div class="asd-info-label">创建时间</div>
                    <div class="asd-info-value">${escapeHtml(staff.created_at)}</div>
                </div>
                <div class="asd-info-item" style="grid-column: 1 / -1;">
                    <div class="asd-info-label">备注</div>
                    <div class="asd-info-value">${staff.remarks ? escapeHtml(staff.remarks) : '<span class="empty">- 暂无备注 -</span>'}</div>
                </div>
            </div>
        `;
    }

    function renderSummary(summary) {
        summary = summary || {};
        summaryContent.innerHTML = `
            <div class="asd-summary-card total">
                <div class="asd-summary-value">${summary.total_days || 0}</div>
                <div class="asd-summary-label">累计考勤天数</div>
            </div>
            <div class="asd-summary-card present">
                <div class="asd-summary-value">${summary.present_days || 0}</div>
                <div class="asd-summary-label">正常出勤</div>
            </div>
            <div class="asd-summary-card late">
                <div class="asd-summary-value">${summary.late_days || 0}</div>
                <div class="asd-summary-label">迟到次数</div>
            </div>
            <div class="asd-summary-card absent">
                <div class="asd-summary-value">${summary.absent_days || 0}</div>
                <div class="asd-summary-label">缺勤天数</div>
            </div>
            <div class="asd-summary-card leave">
                <div class="asd-summary-value">${summary.leave_days || 0}</div>
                <div class="asd-summary-label">请假天数</div>
            </div>
            <div class="asd-summary-card hours">
                <div class="asd-summary-value">${summary.total_hours || 0}</div>
                <div class="asd-summary-label">累计工时(h)</div>
            </div>
        `;
    }

    function renderRecords(records) {
        recordsBody.innerHTML = '';

        if (!records || records.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="6">
                    <div class="asd-empty-hint">
                        <i class="bi bi-calendar-x"></i>
                        <p>暂无考勤记录</p>
                    </div>
                </td>
            `;
            recordsBody.appendChild(tr);
            return;
        }

        records.forEach(r => {
            const tr = document.createElement('tr');
            const statusClass = getAttStatusClass(r.attendance_status);

            tr.innerHTML = `
                <td class="asd-date-cell">${escapeHtml(r.attendance_date)}</td>
                <td class="asd-time-cell">${r.check_in_time ? escapeHtml(r.check_in_time) : '<span style="color:rgba(255,255,255,0.3)">-</span>'}</td>
                <td class="asd-time-cell">${r.check_out_time ? escapeHtml(r.check_out_time) : '<span style="color:rgba(255,255,255,0.3)">-</span>'}</td>
                <td class="asd-hours-cell">${escapeHtml(r.work_hours)}</td>
                <td><span class="asd-att-status ${statusClass}">${escapeHtml(r.attendance_status_display)}</span></td>
                <td style="color:rgba(255,255,255,0.5);font-size:0.85rem;">${r.remarks ? escapeHtml(r.remarks) : '-'}</td>
            `;
            recordsBody.appendChild(tr);
        });
    }

    function getAttStatusClass(status) {
        const classMap = {
            'present': 'asd-att-present',
            'late': 'asd-att-late',
            'early_leave': 'asd-att-early',
            'absent': 'asd-att-absent',
            'leave': 'asd-att-leave',
            'overtime': 'asd-att-overtime',
        };
        return classMap[status] || '';
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    init();
})();
