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
        return self.variety_set.exists() or self.unitarchive_set.exists()


class CategoryArchive(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name='品类名称')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '品类档案'
        verbose_name_plural = '品类档案'
        ordering = ['id']

    def __str__(self):
        return self.name


class VarietyArchive(models.Model):
    name = models.CharField(max_length=50, verbose_name='品种名称')
    category = models.ForeignKey(
        CategoryArchive, on_delete=models.CASCADE,
        related_name='varieties', verbose_name='所属品类'
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
        related_name='units', verbose_name='所属品类'
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
