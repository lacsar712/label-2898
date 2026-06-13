from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0007_add_attendance_staff'),
    ]

    operations = [
        migrations.CreateModel(
            name='OutboundStaff',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID',
                )),
                ('employee_no', models.CharField(
                    max_length=30,
                    unique=True,
                    verbose_name='工号',
                )),
                ('name', models.CharField(
                    max_length=50,
                    verbose_name='姓名',
                )),
                ('authorized_areas', models.CharField(
                    max_length=200,
                    verbose_name='授权库区',
                )),
                ('phone', models.CharField(
                    blank=True,
                    default='',
                    max_length=20,
                    verbose_name='联系电话',
                )),
                ('authorization_start_date', models.DateField(
                    verbose_name='授权开始日期',
                )),
                ('authorization_end_date', models.DateField(
                    verbose_name='授权结束日期',
                )),
                ('certificate_no', models.CharField(
                    blank=True,
                    default='',
                    max_length=50,
                    verbose_name='资质证书编号',
                )),
                ('status', models.CharField(
                    choices=[('active', '启用'), ('inactive', '禁用')],
                    default='active',
                    max_length=10,
                    verbose_name='启用状态',
                )),
                ('remarks', models.TextField(
                    blank=True,
                    default='',
                    verbose_name='备注',
                )),
                ('created_at', models.DateTimeField(
                    auto_now_add=True,
                    verbose_name='创建时间',
                )),
                ('updated_at', models.DateTimeField(
                    auto_now=True,
                    verbose_name='更新时间',
                )),
            ],
            options={
                'verbose_name': '出库人员',
                'verbose_name_plural': '出库人员',
                'ordering': ['-created_at'],
            },
        ),
    ]
