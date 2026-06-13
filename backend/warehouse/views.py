from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.utils import timezone
from django.db.models import Q
import json

from .models import CategoryArchive, VarietyArchive, UnitArchive, GoodsEntry, Unit, MaterialCategory, Variety, GoodsOutbound, QueryTemplate, DailyReport


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


def _build_union_queryset(filters):
    from django.db.models import F, Value, CharField
    from django.db.models.functions import Coalesce

    entries = GoodsEntry.objects.filter(is_deleted=False).annotate(
        doc_type=Value('inbound', output_field=CharField()),
        doc_type_display=Value('入库', output_field=CharField()),
        doc_no=F('entry_no'),
        doc_date=F('entry_date'),
    ).values(
        'id', 'doc_type', 'doc_type_display', 'doc_no', 'doc_date',
        'material_name', 'category', 'variety', 'quantity', 'unit',
        'handler', 'status', 'created_at'
    )

    outbounds = GoodsOutbound.objects.filter(is_deleted=False).annotate(
        doc_type=Value('outbound', output_field=CharField()),
        doc_type_display=Value('出库', output_field=CharField()),
        doc_no=F('outbound_no'),
        doc_date=F('outbound_date'),
    ).values(
        'id', 'doc_type', 'doc_type_display', 'doc_no', 'doc_date',
        'material_name', 'category', 'variety', 'quantity', 'unit',
        'handler', 'status', 'created_at'
    )

    material_name = filters.get('material_name', '').strip()
    category = filters.get('category', '').strip()
    variety = filters.get('variety', '').strip()
    doc_type = filters.get('doc_type', '').strip()
    date_start = filters.get('date_start', '').strip()
    date_end = filters.get('date_end', '').strip()
    handler = filters.get('handler', '').strip()
    status = filters.get('status', '').strip()

    if material_name:
        entries = entries.filter(material_name__icontains=material_name)
        outbounds = outbounds.filter(material_name__icontains=material_name)
    if category:
        entries = entries.filter(category=category)
        outbounds = outbounds.filter(category=category)
    if variety:
        entries = entries.filter(variety=variety)
        outbounds = outbounds.filter(variety=variety)
    if handler:
        entries = entries.filter(handler__icontains=handler)
        outbounds = outbounds.filter(handler__icontains=handler)
    if status:
        entries = entries.filter(status=status)
        outbounds = outbounds.filter(status=status)
    if date_start:
        entries = entries.filter(entry_date__gte=date_start)
        outbounds = outbounds.filter(outbound_date__gte=date_start)
    if date_end:
        entries = entries.filter(entry_date__lte=date_end)
        outbounds = outbounds.filter(outbound_date__lte=date_end)

    if doc_type == 'inbound':
        return entries
    elif doc_type == 'outbound':
        return outbounds
    else:
        return entries.union(outbounds)


@login_required
def api_query_records(request):
    try:
        filters = {
            'material_name': request.GET.get('material_name', ''),
            'category': request.GET.get('category', ''),
            'variety': request.GET.get('variety', ''),
            'doc_type': request.GET.get('doc_type', ''),
            'date_start': request.GET.get('date_start', ''),
            'date_end': request.GET.get('date_end', ''),
            'handler': request.GET.get('handler', ''),
            'status': request.GET.get('status', ''),
        }

        has_filter = any(v.strip() for v in filters.values())

        if not has_filter:
            from datetime import timedelta
            thirty_days_ago = (timezone.now().date() - timedelta(days=30)).strftime('%Y-%m-%d')
            filters['date_start'] = thirty_days_ago

        queryset = _build_union_queryset(filters)
        queryset = queryset.order_by('-doc_date', '-created_at')

        page_num = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        paginator = Paginator(queryset, page_size)
        page = paginator.get_page(page_num)

        items = []
        for obj in page.object_list:
            status_display = '有效' if obj['status'] == 'effective' else '已作废'
            items.append({
                'id': obj['id'],
                'doc_type': obj['doc_type'],
                'doc_type_display': obj['doc_type_display'],
                'doc_no': obj['doc_no'],
                'doc_date': obj['doc_date'].strftime('%Y-%m-%d') if hasattr(obj['doc_date'], 'strftime') else str(obj['doc_date']),
                'material_name': obj['material_name'],
                'category': obj['category'],
                'variety': obj['variety'],
                'quantity': str(obj['quantity']),
                'unit': obj['unit'],
                'handler': obj['handler'],
                'status': obj['status'],
                'status_display': status_display,
            })

        total_count = paginator.count

        all_items = list(queryset)
        total_quantity = 0
        for item in all_items:
            try:
                total_quantity += float(item['quantity'])
            except (ValueError, TypeError):
                pass

        inbound_count = 0
        outbound_count = 0
        inbound_qty = 0
        outbound_qty = 0
        for item in all_items:
            qty = float(item['quantity']) if item['quantity'] else 0
            if item['doc_type'] == 'inbound':
                inbound_count += 1
                inbound_qty += qty
            else:
                outbound_count += 1
                outbound_qty += qty

        return JsonResponse({
            'items': items,
            'total': total_count,
            'page': page_num,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'summary': {
                'total_count': total_count,
                'total_quantity': round(total_quantity, 2),
                'inbound_count': inbound_count,
                'outbound_count': outbound_count,
                'inbound_quantity': round(inbound_qty, 2),
                'outbound_quantity': round(outbound_qty, 2),
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_export_csv(request):
    import csv
    from django.http import HttpResponse
    from io import StringIO

    try:
        filters = {
            'material_name': request.GET.get('material_name', ''),
            'category': request.GET.get('category', ''),
            'variety': request.GET.get('variety', ''),
            'doc_type': request.GET.get('doc_type', ''),
            'date_start': request.GET.get('date_start', ''),
            'date_end': request.GET.get('date_end', ''),
            'handler': request.GET.get('handler', ''),
            'status': request.GET.get('status', ''),
        }

        has_filter = any(v.strip() for v in filters.values())

        if not has_filter:
            from datetime import timedelta
            thirty_days_ago = (timezone.now().date() - timedelta(days=30)).strftime('%Y-%m-%d')
            filters['date_start'] = thirty_days_ago

        queryset = _build_union_queryset(filters)
        queryset = queryset.order_by('-doc_date', '-created_at')

        buffer = StringIO()
        writer = csv.writer(buffer)

        headers = ['单号', '单据类型', '物资名称', '品类', '品种', '数量', '单位', '日期', '经办人', '状态']
        writer.writerow(headers)

        for obj in queryset:
            status_display = '有效' if obj['status'] == 'effective' else '已作废'
            doc_date = obj['doc_date'].strftime('%Y-%m-%d') if hasattr(obj['doc_date'], 'strftime') else str(obj['doc_date'])
            writer.writerow([
                obj['doc_no'],
                obj['doc_type_display'],
                obj['material_name'],
                obj['category'],
                obj['variety'],
                str(obj['quantity']),
                obj['unit'],
                doc_date,
                obj['handler'],
                status_display,
            ])

        csv_content = buffer.getvalue()
        buffer.close()

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        filename = f'出入库记录_{timezone.now().strftime("%Y%m%d%H%M%S")}.csv'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        response.write('\ufeff'.encode('utf-8'))
        response.write(csv_content.encode('utf-8'))

        return response
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_query_filter_options(request):
    try:
        from django.db.models import Q

        entry_handlers = GoodsEntry.objects.filter(is_deleted=False).values_list('handler', flat=True).distinct()
        outbound_handlers = GoodsOutbound.objects.filter(is_deleted=False).values_list('handler', flat=True).distinct()
        handlers = sorted(set(list(entry_handlers) + list(outbound_handlers)))
        handlers = [h for h in handlers if h and h.strip()]

        categories = list(MaterialCategory.objects.filter(
            parent__isnull=True
        ).order_by('sort_weight', 'id').values('id', 'code', 'name'))

        varieties = list(Variety.objects.filter(
            is_active=True
        ).select_related('category').order_by('code').values('id', 'name', 'category_id', 'category__name'))

        return JsonResponse({
            'handlers': handlers,
            'categories': [{'id': c['id'], 'name': c['name'], 'code': c['code']} for c in categories],
            'varieties': [{'id': v['id'], 'name': v['name'], 'category_id': v['category_id'], 'category_name': v['category__name']} for v in varieties],
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def query_export_page(request):
    return render(request, 'pages/query_export.html', {'title': '查询导出', 'page_name': 'query-export'})


@login_required
def api_query_templates(request):
    try:
        template_type = request.GET.get('template_type', 'query_export')
        templates = QueryTemplate.objects.filter(
            template_type=template_type,
            user=request.user.username if request.user.is_authenticated else ''
        ).order_by('sort_weight', '-created_at')

        items = []
        for tpl in templates:
            items.append({
                'id': tpl.id,
                'name': tpl.name,
                'template_type': tpl.template_type,
                'filter_data': json.loads(tpl.filter_data) if tpl.filter_data else {},
                'is_default': tpl.is_default,
                'sort_weight': tpl.sort_weight,
                'created_at': tpl.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': tpl.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            })

        return JsonResponse({'items': items})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_query_template_create(request):
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        template_type = data.get('template_type', 'query_export')
        filter_data = data.get('filter_data', {})
        sort_weight = int(data.get('sort_weight', 0) or 0)

        if not name:
            return JsonResponse({'success': False, 'message': '模板名称不能为空'}, status=400)

        username = request.user.username if request.user.is_authenticated else ''

        existing = QueryTemplate.objects.filter(
            name=name,
            template_type=template_type,
            user=username
        ).first()
        if existing:
            return JsonResponse({'success': False, 'message': '模板名称已存在'}, status=400)

        tpl = QueryTemplate.objects.create(
            name=name,
            template_type=template_type,
            filter_data=json.dumps(filter_data, ensure_ascii=False),
            user=username,
            sort_weight=sort_weight,
        )

        return JsonResponse({
            'success': True,
            'id': tpl.id,
            'message': f'模板 {name} 创建成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_query_template_update(request, pk):
    try:
        tpl = get_object_or_404(QueryTemplate, pk=pk)
        data = json.loads(request.body)

        new_name = data.get('name', tpl.name).strip()
        if new_name != tpl.name:
            username = request.user.username if request.user.is_authenticated else ''
            if QueryTemplate.objects.filter(
                name=new_name,
                template_type=tpl.template_type,
                user=username
            ).exclude(pk=pk).exists():
                return JsonResponse({'success': False, 'message': '模板名称已存在'}, status=400)
            tpl.name = new_name

        if 'filter_data' in data:
            tpl.filter_data = json.dumps(data['filter_data'], ensure_ascii=False)
        if 'sort_weight' in data:
            tpl.sort_weight = int(data['sort_weight'] or 0)
        if 'is_default' in data:
            tpl.is_default = data['is_default']

        tpl.save()
        return JsonResponse({
            'success': True,
            'message': f'模板 {tpl.name} 更新成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@require_POST
@login_required
def api_query_template_delete(request, pk):
    try:
        tpl = get_object_or_404(QueryTemplate, pk=pk)
        name = tpl.name
        tpl.delete()
        return JsonResponse({
            'success': True,
            'message': f'模板 {name} 删除成功',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_query_template_detail(request, pk):
    try:
        tpl = get_object_or_404(QueryTemplate, pk=pk)
        return JsonResponse({
            'id': tpl.id,
            'name': tpl.name,
            'template_type': tpl.template_type,
            'filter_data': json.loads(tpl.filter_data) if tpl.filter_data else {},
            'is_default': tpl.is_default,
            'sort_weight': tpl.sort_weight,
            'created_at': tpl.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': tpl.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def daily_report_page(request):
    return render(request, 'pages/daily_report.html', {'title': '每日报表', 'page_name': 'daily-report'})


@require_POST
@login_required
def api_daily_report_generate(request):
    try:
        from django.db.models import Sum, Count
        from datetime import datetime

        data = json.loads(request.body) if request.body else {}
        report_date_str = data.get('report_date', '')
        overwrite = data.get('overwrite', False)

        if not report_date_str:
            report_date = timezone.now().date()
        else:
            report_date = datetime.strptime(report_date_str, '%Y-%m-%d').date()

        existing = DailyReport.objects.filter(report_date=report_date).first()
        if existing and not overwrite:
            return JsonResponse({
                'success': False,
                'message': '该日期日报已存在，是否覆盖更新？',
                'exists': True,
            }, status=400)

        inbound_entries = GoodsEntry.objects.filter(
            entry_date=report_date,
            status='effective',
            is_deleted=False
        )
        inbound_agg = inbound_entries.aggregate(
            count=Count('id'),
            total=Sum('quantity')
        )
        inbound_count = inbound_agg['count'] or 0
        inbound_quantity = float(inbound_agg['total'] or 0)

        outbound_entries = GoodsOutbound.objects.filter(
            outbound_date=report_date,
            status='effective',
            is_deleted=False
        )
        outbound_agg = outbound_entries.aggregate(
            count=Count('id'),
            total=Sum('quantity')
        )
        outbound_count = outbound_agg['count'] or 0
        outbound_quantity = float(outbound_agg['total'] or 0)

        net_change = inbound_quantity - outbound_quantity

        inbound_list = []
        for entry in inbound_entries:
            inbound_list.append({
                'id': entry.id,
                'doc_no': entry.entry_no,
                'doc_type': 'inbound',
                'doc_type_display': '入库',
                'material_name': entry.material_name,
                'category': entry.category,
                'variety': entry.variety,
                'quantity': str(entry.quantity),
                'unit': entry.unit,
                'handler': entry.handler,
                'supplier': entry.supplier,
                'storage_area': entry.storage_area,
                'remarks': entry.remarks,
                'status': entry.status,
                'status_display': entry.get_status_display(),
            })

        outbound_list = []
        for entry in outbound_entries:
            outbound_list.append({
                'id': entry.id,
                'doc_no': entry.outbound_no,
                'doc_type': 'outbound',
                'doc_type_display': '出库',
                'material_name': entry.material_name,
                'category': entry.category,
                'variety': entry.variety,
                'quantity': str(entry.quantity),
                'unit': entry.unit,
                'handler': entry.handler,
                'receiver': entry.receiver,
                'storage_area': entry.storage_area,
                'remarks': entry.remarks,
                'status': entry.status,
                'status_display': entry.get_status_display(),
            })

        snapshot = {
            'inbound_list': inbound_list,
            'outbound_list': outbound_list,
        }

        username = request.user.username if request.user.is_authenticated else ''

        if existing:
            existing.inbound_count = inbound_count
            existing.inbound_quantity = inbound_quantity
            existing.outbound_count = outbound_count
            existing.outbound_quantity = outbound_quantity
            existing.net_change = net_change
            existing.snapshot_data = json.dumps(snapshot, ensure_ascii=False)
            existing.generated_by = username
            existing.save()
            report = existing
            message = f'{report_date.strftime("%Y-%m-%d")} 日报已更新'
        else:
            report = DailyReport.objects.create(
                report_date=report_date,
                inbound_count=inbound_count,
                inbound_quantity=inbound_quantity,
                outbound_count=outbound_count,
                outbound_quantity=outbound_quantity,
                net_change=net_change,
                snapshot_data=json.dumps(snapshot, ensure_ascii=False),
                generated_by=username,
            )
            message = f'{report_date.strftime("%Y-%m-%d")} 日报生成成功'

        return JsonResponse({
            'success': True,
            'message': message,
            'report': {
                'id': report.id,
                'report_date': report.report_date.strftime('%Y-%m-%d'),
                'inbound_count': report.inbound_count,
                'inbound_quantity': str(report.inbound_quantity),
                'outbound_count': report.outbound_count,
                'outbound_quantity': str(report.outbound_quantity),
                'net_change': str(report.net_change),
                'generated_at': report.generated_at.strftime('%Y-%m-%d %H:%M:%S'),
                'generated_by': report.generated_by,
                'snapshot': snapshot,
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_daily_report_detail(request):
    try:
        from datetime import datetime

        report_date_str = request.GET.get('report_date', '')
        if not report_date_str:
            report_date = timezone.now().date()
        else:
            report_date = datetime.strptime(report_date_str, '%Y-%m-%d').date()

        report = DailyReport.objects.filter(report_date=report_date).first()
        if not report:
            return JsonResponse({
                'success': False,
                'message': '该日期尚未生成日报',
                'exists': False,
            }, status=404)

        snapshot = json.loads(report.snapshot_data) if report.snapshot_data else {}

        return JsonResponse({
            'id': report.id,
            'report_date': report.report_date.strftime('%Y-%m-%d'),
            'inbound_count': report.inbound_count,
            'inbound_quantity': str(report.inbound_quantity),
            'outbound_count': report.outbound_count,
            'outbound_quantity': str(report.outbound_quantity),
            'net_change': str(report.net_change),
            'generated_at': report.generated_at.strftime('%Y-%m-%d %H:%M:%S'),
            'generated_by': report.generated_by,
            'updated_at': report.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            'snapshot': snapshot,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_daily_report_list(request):
    try:
        from datetime import datetime

        year_month = request.GET.get('year_month', '')
        if not year_month:
            year_month = timezone.now().strftime('%Y-%m')

        year, month = map(int, year_month.split('-'))
        queryset = DailyReport.objects.filter(
            report_date__year=year,
            report_date__month=month
        ).order_by('-report_date')

        items = []
        for report in queryset:
            items.append({
                'id': report.id,
                'report_date': report.report_date.strftime('%Y-%m-%d'),
                'inbound_count': report.inbound_count,
                'inbound_quantity': str(report.inbound_quantity),
                'outbound_count': report.outbound_count,
                'outbound_quantity': str(report.outbound_quantity),
                'net_change': str(report.net_change),
                'generated_at': report.generated_at.strftime('%Y-%m-%d %H:%M:%S'),
                'generated_by': report.generated_by,
            })

        return JsonResponse({
            'items': items,
            'year_month': year_month,
            'total': len(items),
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_daily_report_calendar_marks(request):
    try:
        from datetime import datetime

        year_month = request.GET.get('year_month', '')
        if not year_month:
            year_month = timezone.now().strftime('%Y-%m')

        year, month = map(int, year_month.split('-'))
        reports = DailyReport.objects.filter(
            report_date__year=year,
            report_date__month=month
        ).values_list('report_date', flat=True)

        marked_dates = [d.strftime('%Y-%m-%d') for d in reports]

        return JsonResponse({
            'year_month': year_month,
            'marked_dates': marked_dates,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def api_daily_report_transactions(request):
    try:
        from datetime import datetime

        report_date_str = request.GET.get('report_date', '')
        if not report_date_str:
            report_date = timezone.now().date()
        else:
            report_date = datetime.strptime(report_date_str, '%Y-%m-%d').date()

        inbound_entries = GoodsEntry.objects.filter(
            entry_date=report_date,
            status='effective',
            is_deleted=False
        ).order_by('entry_no')

        outbound_entries = GoodsOutbound.objects.filter(
            outbound_date=report_date,
            status='effective',
            is_deleted=False
        ).order_by('outbound_no')

        transactions = []

        for entry in inbound_entries:
            transactions.append({
                'id': entry.id,
                'doc_no': entry.entry_no,
                'doc_type': 'inbound',
                'doc_type_display': '入库',
                'material_name': entry.material_name,
                'category': entry.category,
                'variety': entry.variety,
                'quantity': str(entry.quantity),
                'unit': entry.unit,
                'handler': entry.handler,
                'counterparty': entry.supplier,
                'storage_area': entry.storage_area,
                'remarks': entry.remarks,
            })

        for entry in outbound_entries:
            transactions.append({
                'id': entry.id,
                'doc_no': entry.outbound_no,
                'doc_type': 'outbound',
                'doc_type_display': '出库',
                'material_name': entry.material_name,
                'category': entry.category,
                'variety': entry.variety,
                'quantity': str(entry.quantity),
                'unit': entry.unit,
                'handler': entry.handler,
                'counterparty': entry.receiver,
                'storage_area': entry.storage_area,
                'remarks': entry.remarks,
            })

        transactions.sort(key=lambda x: x['doc_no'])

        return JsonResponse({
            'report_date': report_date.strftime('%Y-%m-%d'),
            'transactions': transactions,
            'total': len(transactions),
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)
