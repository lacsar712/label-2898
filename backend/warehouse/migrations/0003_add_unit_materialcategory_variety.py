from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0002_seed_archive_data'),
    ]

    operations = [
        migrations.CreateModel(
            name='Unit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=20, unique=True, verbose_name='单位编码')),
                ('name', models.CharField(max_length=50, verbose_name='单位名称')),
                ('english_abbr', models.CharField(blank=True, default='', max_length=20, verbose_name='英文缩写')),
                ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                ('sort_weight', models.IntegerField(default=0, verbose_name='排序权重')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
            ],
            options={
                'verbose_name': '计量单位',
                'verbose_name_plural': '计量单位',
                'ordering': ['sort_weight', 'id'],
            },
        ),
        migrations.CreateModel(
            name='MaterialCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50, unique=True, verbose_name='品类编码')),
                ('name', models.CharField(max_length=100, verbose_name='品类名称')),
                ('sort_weight', models.IntegerField(default=0, verbose_name='排序号')),
                ('icon', models.CharField(blank=True, default='', max_length=50, verbose_name='图标标识')),
                ('description', models.TextField(blank=True, default='', verbose_name='描述备注')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='warehouse.materialcategory', verbose_name='上级品类')),
            ],
            options={
                'verbose_name': '物资品类',
                'verbose_name_plural': '物资品类',
                'ordering': ['sort_weight', 'id'],
            },
        ),
        migrations.CreateModel(
            name='Variety',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50, unique=True, verbose_name='品种编码')),
                ('name', models.CharField(max_length=100, verbose_name='品种名称')),
                ('specification', models.CharField(blank=True, default='', max_length=100, verbose_name='规格型号')),
                ('shelf_life_days', models.IntegerField(default=0, verbose_name='保质期天数')),
                ('min_stock_warning', models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='最低库存预警值')),
                ('default_storage_area', models.CharField(blank=True, default='', max_length=100, verbose_name='默认存放库区')),
                ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                ('remarks', models.TextField(blank=True, default='', verbose_name='备注')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='varieties', to='warehouse.materialcategory', verbose_name='所属品类')),
                ('unit', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='varieties', to='warehouse.unit', verbose_name='计量单位')),
            ],
            options={
                'verbose_name': '物资品种',
                'verbose_name_plural': '物资品种',
                'ordering': ['code'],
            },
        ),
        migrations.AddField(
            model_name='varietyarchive',
            name='material_category',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='variety_set', to='warehouse.materialcategory', verbose_name='所属物资品类'),
        ),
        migrations.AddField(
            model_name='varietyarchive',
            name='unit',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='variety_set', to='warehouse.unit', verbose_name='计量单位'),
        ),
        migrations.AddField(
            model_name='unitarchive',
            name='material_category',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='unitarchive_set', to='warehouse.materialcategory', verbose_name='所属物资品类'),
        ),
        migrations.AddField(
            model_name='unitarchive',
            name='unit_ref',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='unitarchive_set', to='warehouse.unit', verbose_name='全局单位引用'),
        ),
    ]
