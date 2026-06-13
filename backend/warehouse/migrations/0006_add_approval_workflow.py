from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('warehouse', '0005_add_stockwarningsnapshot'),
    ]

    operations = [
        migrations.AddField(
            model_name='goodsentry',
            name='approval_status',
            field=models.CharField(
                choices=[
                    ('draft', '草稿'),
                    ('pending', '待审批'),
                    ('approved', '已通过'),
                    ('rejected', '已驳回'),
                ],
                default='draft',
                max_length=20,
                verbose_name='审批状态',
            ),
        ),
        migrations.AddField(
            model_name='goodsentry',
            name='submitted_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='submitted_entries',
                to='auth.user',
                verbose_name='提交人',
            ),
        ),
        migrations.AddField(
            model_name='goodsentry',
            name='submitted_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='提交时间',
            ),
        ),
        migrations.AddField(
            model_name='goodsentry',
            name='approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_entries',
                to='auth.user',
                verbose_name='审批人',
            ),
        ),
        migrations.AddField(
            model_name='goodsentry',
            name='approved_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='审批时间',
            ),
        ),
        migrations.AddField(
            model_name='goodsentry',
            name='approval_opinion',
            field=models.TextField(
                blank=True,
                default='',
                verbose_name='审批意见',
            ),
        ),
        migrations.CreateModel(
            name='ApprovalRecord',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID',
                )),
                ('action', models.CharField(
                    choices=[('approve', '通过'), ('reject', '驳回')],
                    max_length=20,
                    verbose_name='操作类型',
                )),
                ('opinion', models.TextField(verbose_name='审批意见')),
                ('created_at', models.DateTimeField(
                    auto_now_add=True,
                    verbose_name='操作时间',
                )),
                ('goods_entry', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='approval_records',
                    to='warehouse.goodsentry',
                    verbose_name='入库单',
                )),
                ('operator', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='auth.user',
                    verbose_name='操作人',
                )),
            ],
            options={
                'verbose_name': '审批记录',
                'verbose_name_plural': '审批记录',
                'ordering': ['-created_at'],
            },
        ),
    ]
