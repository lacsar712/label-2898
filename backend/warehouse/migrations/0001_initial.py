from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='CategoryArchive',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True, verbose_name='品类名称')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': '品类档案',
                'verbose_name_plural': '品类档案',
                'ordering': ['id'],
            },
        ),
        migrations.CreateModel(
            name='UnitArchive',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=20, verbose_name='单位名称')),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='units', to='warehouse.categoryarchive', verbose_name='所属品类')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': '单位档案',
                'verbose_name_plural': '单位档案',
                'unique_together': {('name', 'category')},
                'ordering': ['id'],
            },
        ),
        migrations.CreateModel(
            name='VarietyArchive',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, verbose_name='品种名称')),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='varieties', to='warehouse.categoryarchive', verbose_name='所属品类')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': '品种档案',
                'verbose_name_plural': '品种档案',
                'unique_together': {('name', 'category')},
                'ordering': ['id'],
            },
        ),
        migrations.CreateModel(
            name='GoodsEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('entry_no', models.CharField(max_length=20, unique=True, verbose_name='入库单号')),
                ('material_name', models.CharField(max_length=100, verbose_name='物资名称')),
                ('category', models.CharField(max_length=50, verbose_name='品类')),
                ('variety', models.CharField(max_length=50, verbose_name='品种')),
                ('quantity', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='数量')),
                ('unit', models.CharField(max_length=20, verbose_name='计量单位')),
                ('entry_date', models.DateField(verbose_name='入库日期')),
                ('handler', models.CharField(max_length=50, verbose_name='经办人')),
                ('supplier', models.CharField(max_length=100, verbose_name='供应商')),
                ('storage_area', models.CharField(max_length=50, verbose_name='存放库区')),
                ('remarks', models.TextField(blank=True, default='', verbose_name='备注')),
                ('status', models.CharField(choices=[('effective', '有效'), ('voided', '已作废')], default='effective', max_length=10, verbose_name='单据状态')),
                ('is_deleted', models.BooleanField(default=False, verbose_name='软删除')),
                ('voided_at', models.DateTimeField(blank=True, null=True, verbose_name='作废时间')),
                ('voided_by', models.CharField(blank=True, default='', max_length=50, verbose_name='作废人')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'verbose_name': '货物入库',
                'verbose_name_plural': '货物入库',
                'ordering': ['-created_at'],
            },
        ),
    ]
