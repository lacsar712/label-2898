from django.db import migrations


def load_seed_data(apps, schema_editor):
    CategoryArchive = apps.get_model('warehouse', 'CategoryArchive')
    VarietyArchive = apps.get_model('warehouse', 'VarietyArchive')
    UnitArchive = apps.get_model('warehouse', 'UnitArchive')

    seed = [
        {
            'name': '被装物资',
            'varieties': ['棉被', '毛毯', '床单', '被罩'],
            'units': ['条', '套', '件'],
        },
        {
            'name': '给养物资',
            'varieties': ['大米', '面粉', '食用油', '罐头'],
            'units': ['公斤', '吨', '箱'],
        },
        {
            'name': '卫生物资',
            'varieties': ['消毒液', '医用口罩', '绷带', '药品'],
            'units': ['瓶', '盒', '包'],
        },
        {
            'name': '建材物资',
            'varieties': ['水泥', '钢材', '木材', '砖块'],
            'units': ['吨', '立方米', '块'],
        },
        {
            'name': '通讯器材',
            'varieties': ['对讲机', '电缆', '天线', '电池组'],
            'units': ['台', '米', '组'],
        },
    ]

    for cat_data in seed:
        cat = CategoryArchive.objects.create(name=cat_data['name'])
        for v_name in cat_data['varieties']:
            VarietyArchive.objects.create(name=v_name, category=cat)
        for u_name in cat_data['units']:
            UnitArchive.objects.create(name=u_name, category=cat)


def reverse_seed(apps, schema_editor):
    CategoryArchive = apps.get_model('warehouse', 'CategoryArchive')
    CategoryArchive.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_seed_data, reverse_seed),
    ]
