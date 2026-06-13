from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.utils import timezone
from django.db.models import Q
import json

from .models import CategoryArchive, VarietyArchive, UnitArchive, GoodsEntry, Unit, MaterialCategory, Variety


def user_login(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'success': False, 'message': '用户名或密码错误'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    return render(request, 'login.html')


def user_logout(request):
    logout(request)
    return redirect('login')


@login_required
def dashboard(request):
    return render(request, 'dashboard.html', {'title': '仪表盘', 'page_name': 'dashboard'})


@login_required
def menu_page(request, page_name):
    titles = {
        'goods-entry': '货物入库',
        'unit-management': '单位管理',
        'category-management': '品类管理',
        'variety-management': '品种管理',
        'query-export': '查询导出',
        'daily-report': '每日报表',
        'warning': '预警',
        'approval': '审批区域',
        'attendance-staff': '考勤人员管理',
        'outbound-staff': '出库人员管理',
    }
    title = titles.get(page_name, '页面')
    return render(request, 'pages/dev.html', {'title': title, 'page_name': page_name})


@login_required
def goods_entry_page(request):
    return render(request, 'pages/goods_entry.html', {'title': '货物入库', 'page_name': 'goods-entry'})


@login_required
def unit_management_page(request):
    return render(request, 'pages/unit_management.html', {'title': '单位管理', 'page_name': 'unit-management'})


@login_required
def category_management_page(request):
    return render(request, 'pages/category_management.html', {'title': '品类管理', 'page_name': 'category-management'})


@login_required
def variety_management_page(request):
    return render(request, 'pages/variety_management.html', {'title': '品种管理', 'page_name': 'variety-management'})


@login_required
def api_categories(request):
    categories = CategoryArchive.objects.all().values('id', 'name')
    return JsonResponse(list(categories), safe=False)


@login_required
def api_varieties_by_category(request, category_id):
    varieties = VarietyArchive.objects.filter(category_id=category_id).values('id', 'name')
    return JsonResponse(list(varieties), safe=False)


@login_required
def api_units_by_category(request, category_id):
    units = UnitArchive.objects.filter(category_id=category_id).values('id', 'name')
    return JsonResponse(list(units), safe=False)


@login_required
def api_goods_entries(request):
    queryset = GoodsEntry.objects.filter(is_deleted=False)

    date_start = request.GET.get('date_start')
    date_end = request.GET.get('date_end')
    handler = request.GET.get('handler', '').strip()
    status = request.GET.get('status', '').strip()

    if date_start:
        queryset = queryset.filter(entry_date__gte=date_start)
    if date_end:
        queryset = queryset.filter(entry_date__lte=date_end)
    if handler:
        queryset = queryset.filter(handler__icontains=handler)
    if status:
        queryset = queryset.filter(status=status)

    page_num = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 10))
    paginator = Paginator(queryset, page_size)
    page = paginator.get_page(page_num)

    items = []
    for obj in page.object_list:
        items.append({
            'id': obj.id,
            'entry_no': obj.entry_no,
            'material_name': obj.material_name,
            'category': obj.category,
            'variety': obj.variety,
            'quantity': str(obj.quantity),
            'unit': obj.unit,
            'entry_date': obj.entry_date.strftime('%Y-%m-%d'),
            'handler': obj.handler,
            'supplier': obj.supplier,
            'storage_area': obj.storage_area,
            'remarks': obj.remarks,
            'status': obj.status,
            'status_display': obj.get_status_display(),
            'voided_at': obj.voided_at.strftime('%Y-%m-%d %H:%M:%S') if obj.voided_at else '',
            'voided_by': obj.voided_by,
            'created_at': obj.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        })

    return JsonResponse({
        'items': items,
        'total': paginator.count,
        'page': page_num,
        'page_size': page_size,
        'total_pages': paginator.num_pages,
    })


@require_POST
@login_required
def api_goods_entry_create(request):
    try:
        data = json.loads(request.body)
        entry_no = GoodsEntry.generate_entry_no()

        obj = GoodsEntry.objects.create(
            entry_no=entry_no,
            material_name=data.get('material_name', ''),
            category=data.get('category', ''),
            variety=data.get('variety', ''),
            quantity=data.get('quantity', 0),
            unit=data.get('unit', ''),
            entry_date=data.get('entry_date', ''),
            handler=data.get('handler', ''),
            supplier=data.get('supplier', ''),
            storage_area=data.get('storage_area', ''),
            remarks=data.get('remarks', ''),
        )
        return JsonResponse({
            'success': True,
            'entry_no': obj.entry_no,
            'message': f'入库单 {obj.entry_no} 创建成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_goods_entry_void(request, pk):
    try:
        obj = get_object_or_404(GoodsEntry, pk=pk, is_deleted=False)
        if obj.status == 'voided':
            return JsonResponse({'success': False, 'message': '该单据已作废'}, status=400)
        obj.status = 'voided'
        obj.voided_at = timezone.now()
        obj.voided_by = request.user.username
        obj.save(update_fields=['status', 'voided_at', 'voided_by', 'updated_at'])
        return JsonResponse({
            'success': True,
            'message': f'入库单 {obj.entry_no} 已作废',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_inventory_hint(request):
    material_name = request.GET.get('material_name', '').strip()
    if not material_name:
        return JsonResponse({'total': 0, 'unit': ''})

    from django.db.models import Sum
    effective_entries = GoodsEntry.objects.filter(
        material_name__icontains=material_name,
        status='effective',
        is_deleted=False,
    )
    agg = effective_entries.aggregate(total=Sum('quantity'))
    first = effective_entries.first()
    unit = first.unit if first else ''

    return JsonResponse({
        'total': str(agg['total'] or 0),
        'unit': unit,
    })


@login_required
def api_units(request):
    queryset = Unit.objects.all()

    name = request.GET.get('name', '').strip()
    is_active = request.GET.get('is_active', '').strip()

    if name:
        queryset = queryset.filter(name__icontains=name)
    if is_active in ['true', 'false']:
        queryset = queryset.filter(is_active=(is_active == 'true'))

    page_num = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 10))
    paginator = Paginator(queryset, page_size)
    page = paginator.get_page(page_num)

    items = []
    for obj in page.object_list:
        items.append({
            'id': obj.id,
            'code': obj.code,
            'name': obj.name,
            'english_abbr': obj.english_abbr,
            'is_active': obj.is_active,
            'sort_weight': obj.sort_weight,
            'is_referenced': obj.is_referenced(),
            'created_at': obj.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        })

    return JsonResponse({
        'items': items,
        'total': paginator.count,
        'page': page_num,
        'page_size': page_size,
        'total_pages': paginator.num_pages,
    })


@require_POST
@login_required
def api_unit_create(request):
    try:
        data = json.loads(request.body)
        code = data.get('code', '').strip()
        name = data.get('name', '').strip()
        english_abbr = data.get('english_abbr', '').strip()
        is_active = data.get('is_active', True)
        sort_weight = data.get('sort_weight', 0)

        if not code:
            return JsonResponse({'success': False, 'message': '单位编码不能为空'}, status=400)
        if not name:
            return JsonResponse({'success': False, 'message': '单位名称不能为空'}, status=400)
        if Unit.objects.filter(code=code).exists():
            return JsonResponse({'success': False, 'message': '单位编码已存在'}, status=400)

        obj = Unit.objects.create(
            code=code,
            name=name,
            english_abbr=english_abbr,
            is_active=is_active,
            sort_weight=sort_weight,
        )
        return JsonResponse({
            'success': True,
            'id': obj.id,
            'message': f'单位 {obj.name} 创建成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_unit_update(request, pk):
    try:
        obj = get_object_or_404(Unit, pk=pk)
        data = json.loads(request.body)

        if data.get('code') and data['code'] != obj.code:
            return JsonResponse({'success': False, 'message': '单位编码创建后不可变更'}, status=400)

        obj.name = data.get('name', obj.name).strip()
        obj.english_abbr = data.get('english_abbr', obj.english_abbr).strip()
        obj.is_active = data.get('is_active', obj.is_active)
        obj.sort_weight = data.get('sort_weight', obj.sort_weight)

        if not obj.name:
            return JsonResponse({'success': False, 'message': '单位名称不能为空'}, status=400)

        obj.save()
        return JsonResponse({
            'success': True,
            'message': f'单位 {obj.name} 更新成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_unit_delete(request, pk):
    try:
        obj = get_object_or_404(Unit, pk=pk)

        if obj.is_referenced():
            return JsonResponse({'success': False, 'message': '该单位已被引用，无法删除'}, status=400)

        obj.delete()
        return JsonResponse({
            'success': True,
            'message': f'单位 {obj.name} 删除成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


def _build_category_tree(categories, parent_id=None):
    tree = []
    for cat in categories:
        if (parent_id is None and cat.parent_id is None) or (cat.parent_id == parent_id):
            children = _build_category_tree(categories, cat.id)
            ref_info = cat.get_reference_info()
            tree.append({
                'id': cat.id,
                'code': cat.code,
                'name': cat.name,
                'parent_id': cat.parent_id,
                'sort_weight': cat.sort_weight,
                'icon': cat.icon,
                'description': cat.description,
                'has_children': len(children) > 0,
                'is_referenced': ref_info['is_referenced'],
                'reference_info': ref_info,
                'children': children,
                'created_at': cat.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            })
    return tree


@login_required
def api_material_categories_tree(request):
    try:
        all_cats = MaterialCategory.objects.all().order_by('sort_weight', 'id')
        tree = _build_category_tree(list(all_cats))
        return JsonResponse(tree, safe=False)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_material_categories_flat(request):
    try:
        parent_only = request.GET.get('parent_only', '') == 'true'
        if parent_only:
            queryset = MaterialCategory.objects.filter(parent__isnull=True)
        else:
            queryset = MaterialCategory.objects.all()

        queryset = queryset.order_by('sort_weight', 'id')
        items = []
        for obj in queryset:
            ref_info = obj.get_reference_info()
            items.append({
                'id': obj.id,
                'code': obj.code,
                'name': obj.name,
                'parent_id': obj.parent_id,
                'sort_weight': obj.sort_weight,
                'icon': obj.icon,
                'description': obj.description,
                'has_children': obj.has_children(),
                'is_referenced': ref_info['is_referenced'],
                'reference_info': ref_info,
                'created_at': obj.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            })
        return JsonResponse({'items': items})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_material_category_create(request):
    try:
        data = json.loads(request.body)
        code = data.get('code', '').strip()
        name = data.get('name', '').strip()
        parent_id = data.get('parent_id')
        sort_weight = data.get('sort_weight', 0)
        icon = data.get('icon', '').strip()
        description = data.get('description', '').strip()

        if not code:
            return JsonResponse({'success': False, 'message': '品类编码不能为空'}, status=400)
        if not name:
            return JsonResponse({'success': False, 'message': '品类名称不能为空'}, status=400)
        if MaterialCategory.objects.filter(code=code).exists():
            return JsonResponse({'success': False, 'message': '品类编码已存在'}, status=400)

        parent = None
        if parent_id:
            parent = MaterialCategory.objects.filter(pk=parent_id).first()
            if not parent:
                return JsonResponse({'success': False, 'message': '上级品类不存在'}, status=400)
            if parent.parent_id is not None:
                return JsonResponse({'success': False, 'message': '品类层级最多支持两级，子品类下不可再创建'}, status=400)

        obj = MaterialCategory.objects.create(
            code=code,
            name=name,
            parent=parent,
            sort_weight=sort_weight,
            icon=icon,
            description=description,
        )
        return JsonResponse({
            'success': True,
            'id': obj.id,
            'message': f'品类 {obj.name} 创建成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_material_category_update(request, pk):
    try:
        obj = get_object_or_404(MaterialCategory, pk=pk)
        data = json.loads(request.body)

        new_code = data.get('code', obj.code).strip()
        if new_code != obj.code:
            if MaterialCategory.objects.filter(code=new_code).exclude(pk=pk).exists():
                return JsonResponse({'success': False, 'message': '品类编码已存在'}, status=400)
            obj.code = new_code

        parent_id = data.get('parent_id', obj.parent_id)
        if parent_id != obj.parent_id:
            if parent_id:
                parent = MaterialCategory.objects.filter(pk=parent_id).first()
                if not parent:
                    return JsonResponse({'success': False, 'message': '上级品类不存在'}, status=400)
                if parent.parent_id is not None:
                    return JsonResponse({'success': False, 'message': '品类层级最多支持两级'}, status=400)
                if parent_id == pk:
                    return JsonResponse({'success': False, 'message': '不能将自己设为上级品类'}, status=400)
            obj.parent_id = parent_id

        obj.name = data.get('name', obj.name).strip()
        obj.sort_weight = data.get('sort_weight', obj.sort_weight)
        obj.icon = data.get('icon', obj.icon).strip()
        obj.description = data.get('description', obj.description).strip()

        if not obj.name:
            return JsonResponse({'success': False, 'message': '品类名称不能为空'}, status=400)

        obj.save()
        return JsonResponse({
            'success': True,
            'message': f'品类 {obj.name} 更新成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_material_category_delete(request, pk):
    try:
        obj = get_object_or_404(MaterialCategory, pk=pk)
        ref_info = obj.get_reference_info()

        reasons = []
        if ref_info['has_children']:
            reasons.append(f'存在 {ref_info["children_count"]} 个子品类')
        if ref_info['variety_count'] > 0:
            reasons.append(f'被 {ref_info["variety_count"]} 个品种档案引用')
        if ref_info['unit_count'] > 0:
            reasons.append(f'被 {ref_info["unit_count"]} 个单位档案引用')
        if ref_info['goods_entry_count'] > 0:
            reasons.append(f'被 {ref_info["goods_entry_count"]} 条入库记录引用')

        if reasons:
            return JsonResponse({
                'success': False,
                'message': '删除被拦截：' + '；'.join(reasons),
                'reference_info': ref_info,
            }, status=400)

        name = obj.name
        obj.delete()
        return JsonResponse({
            'success': True,
            'message': f'品类 {name} 删除成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_material_category_reorder(request, pk):
    try:
        obj = get_object_or_404(MaterialCategory, pk=pk)
        data = json.loads(request.body)
        direction = data.get('direction', 'up')

        siblings = MaterialCategory.objects.filter(parent_id=obj.parent_id).order_by('sort_weight', 'id')
        sibling_list = list(siblings)
        current_idx = next((i for i, s in enumerate(sibling_list) if s.id == obj.id), -1)

        if direction == 'up':
            if current_idx <= 0:
                return JsonResponse({'success': False, 'message': '已是第一个'}, status=400)
            swap_obj = sibling_list[current_idx - 1]
        else:
            if current_idx >= len(sibling_list) - 1:
                return JsonResponse({'success': False, 'message': '已是最后一个'}, status=400)
            swap_obj = sibling_list[current_idx + 1]

        obj.sort_weight, swap_obj.sort_weight = swap_obj.sort_weight, obj.sort_weight
        obj.save(update_fields=['sort_weight'])
        swap_obj.save(update_fields=['sort_weight'])

        return JsonResponse({
            'success': True,
            'message': '排序更新成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_varieties(request):
    try:
        queryset = Variety.objects.all()

        category_id = request.GET.get('category_id', '').strip()
        name = request.GET.get('name', '').strip()
        is_active = request.GET.get('is_active', '').strip()

        if category_id:
            cat_ids = [int(category_id)]
            children = MaterialCategory.objects.filter(parent_id=int(category_id)).values_list('id', flat=True)
            cat_ids.extend(list(children))
            queryset = queryset.filter(category_id__in=cat_ids)

        if name:
            queryset = queryset.filter(Q(name__icontains=name) | Q(code__icontains=name))

        if is_active in ['true', 'false']:
            queryset = queryset.filter(is_active=(is_active == 'true'))

        queryset = queryset.select_related('category', 'unit')

        page_num = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        paginator = Paginator(queryset, page_size)
        page = paginator.get_page(page_num)

        items = []
        for obj in page.object_list:
            stock_status = obj.get_stock_status()
            inventory = obj.get_inventory_summary()
            items.append({
                'id': obj.id,
                'code': obj.code,
                'name': obj.name,
                'specification': obj.specification,
                'shelf_life_days': obj.shelf_life_days,
                'min_stock_warning': str(obj.min_stock_warning),
                'default_storage_area': obj.default_storage_area,
                'is_active': obj.is_active,
                'remarks': obj.remarks,
                'category_id': obj.category_id,
                'category_code': obj.category.code,
                'category_name': obj.category.name,
                'unit_id': obj.unit_id,
                'unit_name': obj.unit.name,
                'unit_abbr': obj.unit.english_abbr,
                'current_stock': inventory['current_stock'],
                'stock_unit': inventory['unit'],
                'stock_status': stock_status,
                'is_referenced': obj.is_referenced(),
                'created_at': obj.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            })

        return JsonResponse({
            'items': items,
            'total': paginator.count,
            'page': page_num,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_variety_next_code(request):
    try:
        category_id = request.GET.get('category_id', '').strip()
        if not category_id:
            return JsonResponse({'success': False, 'message': '请选择品类'}, status=400)

        next_code = Variety.generate_next_code(int(category_id))
        return JsonResponse({
            'success': True,
            'code': next_code,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_variety_detail(request, pk):
    try:
        obj = get_object_or_404(Variety, pk=pk)
        stock_status = obj.get_stock_status()
        inventory = obj.get_inventory_summary()
        transactions = obj.get_recent_transactions(10)

        return JsonResponse({
            'id': obj.id,
            'code': obj.code,
            'name': obj.name,
            'specification': obj.specification,
            'shelf_life_days': obj.shelf_life_days,
            'min_stock_warning': str(obj.min_stock_warning),
            'default_storage_area': obj.default_storage_area,
            'is_active': obj.is_active,
            'remarks': obj.remarks,
            'category_id': obj.category_id,
            'category_code': obj.category.code,
            'category_name': obj.category.name,
            'unit_id': obj.unit_id,
            'unit_name': obj.unit.name,
            'unit_abbr': obj.unit.english_abbr,
            'current_stock': inventory['current_stock'],
            'stock_unit': inventory['unit'],
            'entry_count': inventory['entry_count'],
            'stock_status': stock_status,
            'transactions': transactions,
            'created_at': obj.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': obj.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_variety_create(request):
    try:
        data = json.loads(request.body)

        category_id = data.get('category_id')
        name = data.get('name', '').strip()
        specification = data.get('specification', '').strip()
        shelf_life_days = int(data.get('shelf_life_days', 0) or 0)
        min_stock_warning = float(data.get('min_stock_warning', 0) or 0)
        default_storage_area = data.get('default_storage_area', '').strip()
        is_active = data.get('is_active', True)
        remarks = data.get('remarks', '').strip()
        unit_id = data.get('unit_id')

        if not category_id:
            return JsonResponse({'success': False, 'message': '请选择所属品类'}, status=400)
        if not name:
            return JsonResponse({'success': False, 'message': '品种名称不能为空'}, status=400)
        if not unit_id:
            return JsonResponse({'success': False, 'message': '请选择计量单位'}, status=400)

        category = MaterialCategory.objects.filter(pk=category_id).first()
        if not category:
            return JsonResponse({'success': False, 'message': '所选品类不存在'}, status=400)

        unit = Unit.objects.filter(pk=unit_id).first()
        if not unit:
            return JsonResponse({'success': False, 'message': '所选单位不存在'}, status=400)

        code = data.get('code', '').strip()
        if not code:
            code = Variety.generate_next_code(category_id)

        if Variety.objects.filter(code=code).exists():
            return JsonResponse({'success': False, 'message': '品种编码已存在'}, status=400)

        obj = Variety.objects.create(
            code=code,
            name=name,
            specification=specification,
            shelf_life_days=shelf_life_days,
            min_stock_warning=min_stock_warning,
            default_storage_area=default_storage_area,
            is_active=is_active,
            remarks=remarks,
            category=category,
            unit=unit,
        )

        return JsonResponse({
            'success': True,
            'id': obj.id,
            'code': obj.code,
            'message': f'品种 {obj.name} 创建成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_variety_update(request, pk):
    try:
        obj = get_object_or_404(Variety, pk=pk)
        data = json.loads(request.body)

        if data.get('code') and data['code'] != obj.code:
            return JsonResponse({'success': False, 'message': '品种编码创建后不可变更'}, status=400)

        category_id = data.get('category_id', obj.category_id)
        unit_id = data.get('unit_id', obj.unit_id)

        if category_id != obj.category_id:
            category = MaterialCategory.objects.filter(pk=category_id).first()
            if not category:
                return JsonResponse({'success': False, 'message': '所选品类不存在'}, status=400)
            obj.category = category

        if unit_id != obj.unit_id:
            unit = Unit.objects.filter(pk=unit_id).first()
            if not unit:
                return JsonResponse({'success': False, 'message': '所选单位不存在'}, status=400)
            obj.unit = unit

        obj.name = data.get('name', obj.name).strip()
        obj.specification = data.get('specification', obj.specification).strip()
        obj.shelf_life_days = int(data.get('shelf_life_days', obj.shelf_life_days) or 0)
        obj.min_stock_warning = float(data.get('min_stock_warning', obj.min_stock_warning) or 0)
        obj.default_storage_area = data.get('default_storage_area', obj.default_storage_area).strip()
        obj.is_active = data.get('is_active', obj.is_active)
        obj.remarks = data.get('remarks', obj.remarks).strip()

        if not obj.name:
            return JsonResponse({'success': False, 'message': '品种名称不能为空'}, status=400)

        obj.save()
        return JsonResponse({
            'success': True,
            'message': f'品种 {obj.name} 更新成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_variety_delete(request, pk):
    try:
        obj = get_object_or_404(Variety, pk=pk)

        if obj.is_referenced():
            return JsonResponse({
                'success': False,
                'message': '该品种已被入库记录引用，无法删除',
            }, status=400)

        name = obj.name
        obj.delete()
        return JsonResponse({
            'success': True,
            'message': f'品种 {name} 删除成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_storage_areas(request):
    try:
        areas = GoodsEntry.objects.order_by().values_list('storage_area', flat=True).distinct()
        area_list = [a for a in areas if a and a.strip()]
        return JsonResponse(area_list, safe=False)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)
