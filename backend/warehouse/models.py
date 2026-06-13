from django.db import models
from datetime import datetime
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()


class Unit(models.Model):
    code = models.CharField(max_length=20, unique=True, verbose_name='单位编码')
    name = models.CharField(max_length=50, verbose_name='单位名称')
    english_abbr = models.CharField(max_length=20, blank=True, default='', verbose_name='英文缩写')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    sort_weight = models.IntegerField(default=0, verbose_name='排序权重')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '计量单位'
        verbose_name_plural = '计量单位'
        ordering = ['sort_weight', 'id']

    def __str__(self):
        return self.name

    def clean(self):
        if self.pk:
            original = Unit.objects.filter(pk=self.pk).first()
            if original and original.code != self.code:
                raise ValidationError({'code': '单位编码创建后不可变更'})

    def is_referenced(self):
        return self.variety_set.exists() or self.unitarchive_set.exists() or self.varieties.exists()


class CategoryArchive(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name='品类名称')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '品类档案'
        verbose_name_plural = '品类档案'
        ordering = ['id']

    def __str__(self):
        return self.name


class MaterialCategory(models.Model):
    code = models.CharField(max_length=50, unique=True, verbose_name='品类编码')
    name = models.CharField(max_length=100, verbose_name='品类名称')
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='上级品类'
    )
    sort_weight = models.IntegerField(default=0, verbose_name='排序号')
    icon = models.CharField(max_length=50, blank=True, default='', verbose_name='图标标识')
    description = models.TextField(blank=True, default='', verbose_name='描述备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '物资品类'
        verbose_name_plural = '物资品类'
        ordering = ['sort_weight', 'id']

    def __str__(self):
        return f'[{self.code}] {self.name}'

    def clean(self):
        if self.parent:
            max_depth = 1
            depth = 0
            ancestor = self.parent
            while ancestor:
                depth += 1
                if depth > max_depth:
                    raise ValidationError({'parent': '品类层级最多支持两级'})
                ancestor = ancestor.parent

    def has_children(self):
        return self.children.exists()

    def get_reference_info(self):
        info = {
            'has_children': self.has_children(),
            'children_count': self.children.count() if self.has_children() else 0,
            'variety_count': self.variety_set.count(),
            'varieties_count': self.varieties.count(),
            'unit_count': self.unitarchive_set.count(),
            'goods_entry_count': GoodsEntry.objects.filter(category=self.name).count(),
        }
        info['is_referenced'] = (
            info['has_children'] or
            info['variety_count'] > 0 or
            info['varieties_count'] > 0 or
            info['unit_count'] > 0 or
            info['goods_entry_count'] > 0
        )
        return info

    def is_referenced(self):
        info = self.get_reference_info()
        return info['is_referenced']


class VarietyArchive(models.Model):
    name = models.CharField(max_length=50, verbose_name='品种名称')
    category = models.ForeignKey(
        CategoryArchive, on_delete=models.CASCADE,
        related_name='varieties', verbose_name='所属品类档案'
    )
    material_category = models.ForeignKey(
        MaterialCategory, on_delete=models.CASCADE,
        related_name='variety_set', null=True, blank=True,
        verbose_name='所属物资品类'
    )
    unit = models.ForeignKey(
        Unit, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='variety_set', verbose_name='计量单位'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '品种档案'
        verbose_name_plural = '品种档案'
        unique_together = ('name', 'category')
        ordering = ['id']

    def __str__(self):
        return self.name


class UnitArchive(models.Model):
    name = models.CharField(max_length=20, verbose_name='单位名称')
    category = models.ForeignKey(
        CategoryArchive, on_delete=models.CASCADE,
        related_name='units', verbose_name='所属品类档案'
    )
    material_category = models.ForeignKey(
        MaterialCategory, on_delete=models.CASCADE,
        related_name='unitarchive_set', null=True, blank=True,
        verbose_name='所属物资品类'
    )
    unit_ref = models.ForeignKey(
        Unit, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='unitarchive_set', verbose_name='全局单位引用'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '单位档案'
        verbose_name_plural = '单位档案'
        unique_together = ('name', 'category')
        ordering = ['id']

    def __str__(self):
        return self.name


class Variety(models.Model):
    code = models.CharField(max_length=50, unique=True, verbose_name='品种编码')
    name = models.CharField(max_length=100, verbose_name='品种名称')
    specification = models.CharField(max_length=100, blank=True, default='', verbose_name='规格型号')
    shelf_life_days = models.IntegerField(default=0, verbose_name='保质期天数')
    min_stock_warning = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='最低库存预警值')
    default_storage_area = models.CharField(max_length=100, blank=True, default='', verbose_name='默认存放库区')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    remarks = models.TextField(blank=True, default='', verbose_name='备注')

    category = models.ForeignKey(
        MaterialCategory,
        on_delete=models.PROTECT,
        related_name='varieties',
        verbose_name='所属品类'
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.PROTECT,
        related_name='varieties',
        verbose_name='计量单位'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '物资品种'
        verbose_name_plural = '物资品种'
        ordering = ['code']

    def __str__(self):
        return f'[{self.code}] {self.name}'

    def clean(self):
        if self.pk:
            original = Variety.objects.filter(pk=self.pk).first()
            if original and original.code != self.code:
                raise ValidationError({'code': '品种编码创建后不可变更'})

    @staticmethod
    def generate_next_code(category_id):
        category = MaterialCategory.objects.filter(pk=category_id).first()
        if not category:
            return ''

        prefix = category.code

        existing = Variety.objects.filter(
            category_id=category_id,
            code__startswith=prefix
        ).order_by('-code')

        max_seq = 0
        for v in existing:
            suffix = v.code[len(prefix):]
            if suffix.isdigit() and len(suffix) == 3:
                try:
                    seq = int(suffix)
                    if seq > max_seq:
                        max_seq = seq
                except ValueError:
                    continue

        next_seq = max_seq + 1
        return f'{prefix}{next_seq:03d}'

    def is_referenced(self):
        from django.db.models import Q
        return GoodsEntry.objects.filter(
            Q(variety=self.name) | Q(material_name=self.name)
        ).exists()

    def get_inventory_summary(self):
        from django.db.models import Sum
        entries = GoodsEntry.objects.filter(
            Q(variety=self.name) | Q(material_name=self.name),
            status='effective',
            is_deleted=False
        )
        agg = entries.aggregate(total=Sum('quantity'))
        return {
            'current_stock': float(agg['total'] or 0),
            'unit': self.unit.name if self.unit else '',
            'entry_count': entries.count()
        }

    def get_recent_transactions(self, limit=10):
        from django.db.models import Q
        entries = GoodsEntry.objects.filter(
            Q(variety=self.name) | Q(material_name=self.name),
            is_deleted=False
        ).order_by('-entry_date', '-created_at')[:limit]

        transactions = []
        for entry in entries:
            transactions.append({
                'entry_no': entry.entry_no,
                'type': '入库',
                'quantity': float(entry.quantity),
                'unit': entry.unit,
                'date': entry.entry_date.strftime('%Y-%m-%d'),
                'handler': entry.handler,
                'supplier': entry.supplier,
                'storage_area': entry.storage_area,
                'status': entry.get_status_display(),
            })
        return transactions

    def get_stock_status(self):
        summary = self.get_inventory_summary()
        current_stock = summary['current_stock']
        warning_value = float(self.min_stock_warning)

        if current_stock <= 0:
            return {'level': 'out_of_stock', 'label': '缺货', 'color': '#ff4136'}
        elif current_stock <= warning_value * 0.5:
            return {'level': 'critical', 'label': '严重不足', 'color': '#ff6b6b'}
        elif current_stock <= warning_value:
            return {'level': 'warning', 'label': '库存预警', 'color': '#ffa502'}
        elif current_stock <= warning_value * 2:
            return {'level': 'normal', 'label': '库存正常', 'color': '#4ecdc4'}
        else:
            return {'level': 'sufficient', 'label': '库存充足', 'color': '#00ff88'}


class GoodsEntry(models.Model):
    STATUS_CHOICES = [
        ('effective', '有效'),
        ('voided', '已作废'),
    ]

    APPROVAL_STATUS_CHOICES = [
        ('draft', '草稿'),
        ('pending', '待审批'),
        ('approved', '已通过'),
        ('rejected', '已驳回'),
    ]

    entry_no = models.CharField(max_length=20, unique=True, verbose_name='入库单号')
    material_name = models.CharField(max_length=100, verbose_name='物资名称')
    category = models.CharField(max_length=50, verbose_name='品类')
    variety = models.CharField(max_length=50, verbose_name='品种')
    quantity = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='数量')
    unit = models.CharField(max_length=20, verbose_name='计量单位')
    entry_date = models.DateField(verbose_name='入库日期')
    handler = models.CharField(max_length=50, verbose_name='经办人')
    supplier = models.CharField(max_length=100, verbose_name='供应商')
    storage_area = models.CharField(max_length=50, verbose_name='存放库区')
    remarks = models.TextField(blank=True, default='', verbose_name='备注')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='effective', verbose_name='单据状态')
    is_deleted = models.BooleanField(default=False, verbose_name='软删除')
    voided_at = models.DateTimeField(null=True, blank=True, verbose_name='作废时间')
    voided_by = models.CharField(max_length=50, blank=True, default='', verbose_name='作废人')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    approval_status = models.CharField(
        max_length=20, choices=APPROVAL_STATUS_CHOICES,
        default='draft', verbose_name='审批状态'
    )
    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='submitted_entries', verbose_name='提交人'
    )
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='提交时间')
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_entries', verbose_name='审批人'
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='审批时间')
    approval_opinion = models.TextField(blank=True, default='', verbose_name='审批意见')

    class Meta:
        verbose_name = '货物入库'
        verbose_name_plural = '货物入库'
        ordering = ['-created_at']

    def __str__(self):
        return self.entry_no

    @staticmethod
    def generate_entry_no():
        today = datetime.now()
        date_str = today.strftime('%Y%m%d')
        prefix = f'RK{date_str}'
        existing = GoodsEntry.objects.filter(entry_no__startswith=prefix).order_by('-entry_no')
        if existing.exists():
            last_no = existing.first().entry_no
            try:
                seq = int(last_no[-4:]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        return f'{prefix}{seq:04d}'

    def get_approval_status_display(self):
        return dict(self.APPROVAL_STATUS_CHOICES).get(self.approval_status, self.approval_status)

    def is_overdue(self, timeout_hours=24):
        if self.approval_status != 'pending' or not self.submitted_at:
            return False
        from django.utils import timezone
        now = timezone.now()
        elapsed = now - self.submitted_at
        return elapsed.total_seconds() > timeout_hours * 3600

    def get_approval_timeline(self):
        timeline = []
        timeline.append({
            'action': '创建',
            'operator': self.submitted_by.username if self.submitted_by else '系统',
            'timestamp': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'opinion': '创建入库单',
            'type': 'create',
        })
        if self.submitted_at and self.submitted_by:
            timeline.append({
                'action': '提交审批',
                'operator': self.submitted_by.username,
                'timestamp': self.submitted_at.strftime('%Y-%m-%d %H:%M:%S'),
                'opinion': '提交审批',
                'type': 'submit',
            })
        for record in self.approval_records.all().order_by('created_at'):
            timeline.append({
                'action': record.get_action_display(),
                'operator': record.operator.username if record.operator else '系统',
                'timestamp': record.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'opinion': record.opinion,
                'type': record.action,
            })
        return timeline


class GoodsOutbound(models.Model):
    STATUS_CHOICES = [
        ('effective', '有效'),
        ('voided', '已作废'),
    ]

    outbound_no = models.CharField(max_length=20, unique=True, verbose_name='出库单号')
    material_name = models.CharField(max_length=100, verbose_name='物资名称')
    category = models.CharField(max_length=50, verbose_name='品类')
    variety = models.CharField(max_length=50, verbose_name='品种')
    quantity = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='数量')
    unit = models.CharField(max_length=20, verbose_name='计量单位')
    outbound_date = models.DateField(verbose_name='出库日期')
    handler = models.CharField(max_length=50, verbose_name='经办人')
    receiver = models.CharField(max_length=100, blank=True, default='', verbose_name='领取人')
    storage_area = models.CharField(max_length=50, verbose_name='出库库区')
    remarks = models.TextField(blank=True, default='', verbose_name='备注')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='effective', verbose_name='单据状态')
    is_deleted = models.BooleanField(default=False, verbose_name='软删除')
    voided_at = models.DateTimeField(null=True, blank=True, verbose_name='作废时间')
    voided_by = models.CharField(max_length=50, blank=True, default='', verbose_name='作废人')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '货物出库'
        verbose_name_plural = '货物出库'
        ordering = ['-created_at']

    def __str__(self):
        return self.outbound_no

    @staticmethod
    def generate_outbound_no():
        today = datetime.now()
        date_str = today.strftime('%Y%m%d')
        prefix = f'CK{date_str}'
        existing = GoodsOutbound.objects.filter(outbound_no__startswith=prefix).order_by('-outbound_no')
        if existing.exists():
            last_no = existing.first().outbound_no
            try:
                seq = int(last_no[-4:]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        return f'{prefix}{seq:04d}'


class QueryTemplate(models.Model):
    TEMPLATE_TYPE_CHOICES = [
        ('query_export', '查询导出'),
        ('daily_report', '每日报表'),
    ]

    name = models.CharField(max_length=100, verbose_name='模板名称')
    template_type = models.CharField(max_length=30, choices=TEMPLATE_TYPE_CHOICES, default='query_export', verbose_name='模板类型')
    filter_data = models.TextField(blank=True, default='', verbose_name='筛选条件JSON')
    user = models.CharField(max_length=100, blank=True, default='', verbose_name='所属用户')
    is_default = models.BooleanField(default=False, verbose_name='是否默认')
    sort_weight = models.IntegerField(default=0, verbose_name='排序权重')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '查询模板'
        verbose_name_plural = '查询模板'
        ordering = ['sort_weight', '-created_at']

    def __str__(self):
        return self.name


class DailyReport(models.Model):
    report_date = models.DateField(unique=True, verbose_name='报表日期')
    inbound_count = models.IntegerField(default=0, verbose_name='入库笔数')
    inbound_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='入库总量')
    outbound_count = models.IntegerField(default=0, verbose_name='出库笔数')
    outbound_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='出库总量')
    net_change = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='库存变动净值')
    snapshot_data = models.TextField(blank=True, default='', verbose_name='快照数据JSON')
    generated_at = models.DateTimeField(auto_now_add=True, verbose_name='生成时间')
    generated_by = models.CharField(max_length=100, blank=True, default='', verbose_name='生成人')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '每日报表'
        verbose_name_plural = '每日报表'
        ordering = ['-report_date']

    def __str__(self):
        return f'日报-{self.report_date.strftime("%Y-%m-%d")}'

    def calculate_net_change(self):
        self.net_change = self.inbound_quantity - self.outbound_quantity
        return self.net_change


class StockWarningSnapshot(models.Model):
    WARNING_LEVEL_CHOICES = [
        ('critical', '紧缺'),
        ('low', '偏低'),
        ('normal', '正常'),
    ]

    snapshot_date = models.DateField(verbose_name='快照日期')
    variety_code = models.CharField(max_length=50, verbose_name='品种编码')
    variety_name = models.CharField(max_length=100, verbose_name='品种名称')
    category_code = models.CharField(max_length=50, blank=True, default='', verbose_name='品类编码')
    category_name = models.CharField(max_length=100, blank=True, default='', verbose_name='品类名称')
    unit_name = models.CharField(max_length=50, blank=True, default='', verbose_name='单位名称')
    current_stock = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='当前库存')
    warning_threshold = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='预警阈值')
    warning_level = models.CharField(max_length=20, choices=WARNING_LEVEL_CHOICES, default='normal', verbose_name='预警等级')
    gap_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='缺口数量')
    suggested_replenish = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='建议补货量')
    specification = models.CharField(max_length=100, blank=True, default='', verbose_name='规格型号')
    default_storage_area = models.CharField(max_length=100, blank=True, default='', verbose_name='默认库区')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '库存预警快照'
        verbose_name_plural = '库存预警快照'
        ordering = ['-snapshot_date', '-id']
        unique_together = ('snapshot_date', 'variety_code')

    def __str__(self):
        return f'{self.snapshot_date.strftime("%Y-%m-%d")} - {self.variety_name}'


class ApprovalRecord(models.Model):
    ACTION_CHOICES = [
        ('approve', '通过'),
        ('reject', '驳回'),
    ]

    goods_entry = models.ForeignKey(
        GoodsEntry, on_delete=models.CASCADE,
        related_name='approval_records', verbose_name='入库单'
    )
    operator = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name='操作人'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name='操作类型')
    opinion = models.TextField(verbose_name='审批意见')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='操作时间')

    class Meta:
        verbose_name = '审批记录'
        verbose_name_plural = '审批记录'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.goods_entry.entry_no} - {self.get_action_display()}'

    def get_action_display(self):
        return dict(self.ACTION_CHOICES).get(self.action, self.action)


class AttendanceStaff(models.Model):
    STATUS_CHOICES = [
        ('active', '在职'),
        ('inactive', '离职'),
    ]

    employee_no = models.CharField(max_length=30, unique=True, verbose_name='工号')
    name = models.CharField(max_length=50, verbose_name='姓名')
    company = models.CharField(max_length=100, verbose_name='所属连队')
    position = models.CharField(max_length=50, blank=True, default='', verbose_name='职务')
    phone = models.CharField(max_length=20, blank=True, default='', verbose_name='联系电话')
    hire_date = models.DateField(null=True, blank=True, verbose_name='入职日期')
    emergency_contact = models.CharField(max_length=50, blank=True, default='', verbose_name='紧急联系人')
    emergency_phone = models.CharField(max_length=20, blank=True, default='', verbose_name='紧急联系电话')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active', verbose_name='在职状态')
    remarks = models.TextField(blank=True, default='', verbose_name='备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '考勤人员'
        verbose_name_plural = '考勤人员'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.employee_no}] {self.name}'

    def clean(self):
        if self.pk:
            original = AttendanceStaff.objects.filter(pk=self.pk).first()
            if original and original.employee_no != self.employee_no:
                raise ValidationError({'employee_no': '工号创建后不可变更'})

    def get_attendance_summary(self, start_date=None, end_date=None):
        from django.db.models import Count, Sum, Q
        records = self.attendance_records.all()
        if start_date:
            records = records.filter(attendance_date__gte=start_date)
        if end_date:
            records = records.filter(attendance_date__lte=end_date)

        total_days = records.count()
        present_days = records.filter(attendance_status='present').count()
        late_days = records.filter(attendance_status='late').count()
        absent_days = records.filter(attendance_status='absent').count()
        leave_days = records.filter(attendance_status='leave').count()

        total_hours = 0
        for r in records:
            if r.work_hours:
                total_hours += float(r.work_hours)

        return {
            'total_days': total_days,
            'present_days': present_days,
            'late_days': late_days,
            'absent_days': absent_days,
            'leave_days': leave_days,
            'total_hours': round(total_hours, 2),
        }


class AttendanceRecord(models.Model):
    ATTENDANCE_STATUS_CHOICES = [
        ('present', '正常出勤'),
        ('late', '迟到'),
        ('early_leave', '早退'),
        ('absent', '缺勤'),
        ('leave', '请假'),
        ('overtime', '加班'),
    ]

    staff = models.ForeignKey(
        AttendanceStaff,
        on_delete=models.CASCADE,
        related_name='attendance_records',
        verbose_name='考勤人员'
    )
    attendance_date = models.DateField(verbose_name='日期')
    check_in_time = models.TimeField(null=True, blank=True, verbose_name='签到时间')
    check_out_time = models.TimeField(null=True, blank=True, verbose_name='签退时间')
    work_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name='工时(小时)')
    attendance_status = models.CharField(
        max_length=15,
        choices=ATTENDANCE_STATUS_CHOICES,
        default='present',
        verbose_name='出勤状态'
    )
    remarks = models.CharField(max_length=200, blank=True, default='', verbose_name='备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '考勤记录'
        verbose_name_plural = '考勤记录'
        ordering = ['-attendance_date', 'staff__employee_no']
        unique_together = ('staff', 'attendance_date')

    def __str__(self):
        return f'{self.staff.name} - {self.attendance_date.strftime("%Y-%m-%d")}'

    def get_attendance_status_display_cn(self):
        return dict(self.ATTENDANCE_STATUS_CHOICES).get(self.attendance_status, self.attendance_status)
