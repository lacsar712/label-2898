from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0004_add_goodsoutbound_querytemplate_dailyreport'),
    ]

    operations = [
        migrations.CreateModel(
            name='StockWarningSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('snapshot_date', models.DateField(verbose_name='快照日期')),
                ('variety_code', models.CharField(max_length=50, verbose_name='品种编码')),
                ('variety_name', models.CharField(max_length=100, verbose_name='品种名称')),
                ('category_code', models.CharField(blank=True, default='', max_length=50, verbose_name='品类编码')),
                ('category_name', models.CharField(blank=True, default='', max_length=100, verbose_name='品类名称')),
                ('unit_name', models.CharField(blank=True, default='', max_length=50, verbose_name='单位名称')),
                ('current_stock', models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='当前库存')),
                ('warning_threshold', models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='预警阈值')),
                ('warning_level', models.CharField(choices=[('critical', '紧缺'), ('low', '偏低'), ('normal', '正常')], default='normal', max_length=20, verbose_name='预警等级')),
                ('gap_quantity', models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='缺口数量')),
                ('suggested_replenish', models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='建议补货量')),
                ('specification', models.CharField(blank=True, default='', max_length=100, verbose_name='规格型号')),
                ('default_storage_area', models.CharField(blank=True, default='', max_length=100, verbose_name='默认库区')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
            ],
            options={
                'verbose_name': '库存预警快照',
                'verbose_name_plural': '库存预警快照',
                'ordering': ['-snapshot_date', '-id'],
                'unique_together': {('snapshot_date', 'variety_code')},
            },
        ),
    ]
