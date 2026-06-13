from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0006_add_approval_workflow'),
    ]

    operations = [
        migrations.CreateModel(
            name='AttendanceStaff',
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
                ('company', models.CharField(
                    max_length=100,
                    verbose_name='所属连队',
                )),
                ('position', models.CharField(
                    blank=True,
                    default='',
                    max_length=50,
                    verbose_name='职务',
                )),
                ('phone', models.CharField(
                    blank=True,
                    default='',
                    max_length=20,
                    verbose_name='联系电话',
                )),
                ('hire_date', models.DateField(
                    blank=True,
                    null=True,
                    verbose_name='入职日期',
                )),
                ('emergency_contact', models.CharField(
                    blank=True,
                    default='',
                    max_length=50,
                    verbose_name='紧急联系人',
                )),
                ('emergency_phone', models.CharField(
                    blank=True,
                    default='',
                    max_length=20,
                    verbose_name='紧急联系电话',
                )),
                ('status', models.CharField(
                    choices=[('active', '在职'), ('inactive', '离职')],
                    default='active',
                    max_length=10,
                    verbose_name='在职状态',
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
                'verbose_name': '考勤人员',
                'verbose_name_plural': '考勤人员',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AttendanceRecord',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID',
                )),
                ('attendance_date', models.DateField(
                    verbose_name='日期',
                )),
                ('check_in_time', models.TimeField(
                    blank=True,
                    null=True,
                    verbose_name='签到时间',
                )),
                ('check_out_time', models.TimeField(
                    blank=True,
                    null=True,
                    verbose_name='签退时间',
                )),
                ('work_hours', models.DecimalField(
                    default=0,
                    decimal_places=2,
                    max_digits=5,
                    verbose_name='工时(小时)',
                )),
                ('attendance_status', models.CharField(
                    choices=[
                        ('present', '正常出勤'),
                        ('late', '迟到'),
                        ('early_leave', '早退'),
                        ('absent', '缺勤'),
                        ('leave', '请假'),
                        ('overtime', '加班'),
                    ],
                    default='present',
                    max_length=15,
                    verbose_name='出勤状态',
                )),
                ('remarks', models.CharField(
                    blank=True,
                    default='',
                    max_length=200,
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
                ('staff', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='attendance_records',
                    to='warehouse.attendancestaff',
                    verbose_name='考勤人员',
                )),
            ],
            options={
                'verbose_name': '考勤记录',
                'verbose_name_plural': '考勤记录',
                'ordering': ['-attendance_date', 'staff__employee_no'],
                'unique_together': {('staff', 'attendance_date')},
            },
        ),
    ]
