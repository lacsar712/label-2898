from django.db import models
from datetime import datetime
from django.core.exceptions import ValidationError


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
