from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.utils import timezone
from django.db.models import Q
import json

from .models import CategoryArchive, VarietyArchive, UnitArchive, GoodsEntry, Unit


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
