from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0003_add_unit_materialcategory_variety'),
    ]

    operations = [
        migrations.CreateModel(
            name='GoodsOutbound',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('outbound_no', models.CharField(max_length=20, unique=True, verbose_name='出库单号')),
                ('material_name', models.CharField(max_length=100, verbose_name='物资名称')),
                ('category', models.CharField(max_length=50, verbose_name='品类')),
                ('variety', models.CharField(max_length=50, verbose_name='品种')),
                ('quantity', models.DecimalField(max_digits=12, decimal_places=2, verbose_name='数量')),
                ('unit', models.CharField(max_length=20, verbose_name='计量单位')),
                ('outbound_date', models.DateField(verbose_name='出库日期')),
                ('handler', models.CharField(max_length=50, verbose_name='经办人')),
                ('receiver', models.CharField(blank=True, default='', max_length=100, verbose_name='领取人')),
                ('storage_area', models.CharField(max_length=50, verbose_name='出库库区')),
                ('remarks', models.TextField(blank=True, default='', verbose_name='备注')),
                ('status', models.CharField(choices=[('effective', '有效'), ('voided', '已作废')], default='effective', max_length=10, verbose_name='单据状态')),
                ('is_deleted', models.BooleanField(default=False, verbose_name='软删除')),
                ('voided_at', models.DateTimeField(blank=True, null=True, verbose_name='作废时间')),
                ('voided_by', models.CharField(blank=True, default='', max_length=50, verbose_name='作废人')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'verbose_name': '货物出库',
                'verbose_name_plural': '货物出库',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='QueryTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, verbose_name='模板名称')),
                ('template_type', models.CharField(choices=[('query_export', '查询导出'), ('daily_report', '每日报表')], default='query_export', max_length=30, verbose_name='模板类型')),
                ('filter_data', models.TextField(blank=True, default='', verbose_name='筛选条件JSON')),
                ('user', models.CharField(blank=True, default='', max_length=100, verbose_name='所属用户')),
                ('is_default', models.BooleanField(default=False, verbose_name='是否默认')),
                ('sort_weight', models.IntegerField(default=0, verbose_name='排序权重')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'verbose_name': '查询模板',
                'verbose_name_plural': '查询模板',
                'ordering': ['sort_weight', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='DailyReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('report_date', models.DateField(unique=True, verbose_name='报表日期')),
                ('inbound_count', models.IntegerField(default=0, verbose_name='入库笔数')),
                ('inbound_quantity', models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='入库总量')),
                ('outbound_count', models.IntegerField(default=0, verbose_name='出库笔数')),
                ('outbound_quantity', models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='出库总量')),
                ('net_change', models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='库存变动净值')),
                ('snapshot_data', models.TextField(blank=True, default='', verbose_name='快照数据JSON')),
                ('generated_at', models.DateTimeField(auto_now_add=True, verbose_name='生成时间')),
                ('generated_by', models.CharField(blank=True, default='', max_length=100, verbose_name='生成人')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'verbose_name': '每日报表',
                'verbose_name_plural': '每日报表',
                'ordering': ['-report_date'],
            },
        ),
    ]
