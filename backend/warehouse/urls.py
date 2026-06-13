from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('', views.dashboard, name='dashboard'),
    path('goods-entry/', views.goods_entry_page, name='goods-entry'),
    path('unit-management/', views.unit_management_page, name='unit-management'),
    path('category-management/', views.category_management_page, name='category-management'),
    path('variety-management/', views.menu_page, {'page_name': 'variety-management'}, name='variety-management'),
    path('query-export/', views.menu_page, {'page_name': 'query-export'}, name='query-export'),
    path('daily-report/', views.menu_page, {'page_name': 'daily-report'}, name='daily-report'),
    path('warning/', views.menu_page, {'page_name': 'warning'}, name='warning'),
    path('approval/', views.menu_page, {'page_name': 'approval'}, name='approval'),
    path('attendance-staff/', views.menu_page, {'page_name': 'attendance-staff'}, name='attendance-staff'),
    path('outbound-staff/', views.menu_page, {'page_name': 'outbound-staff'}, name='outbound-staff'),

    path('api/categories/', views.api_categories, name='api-categories'),
    path('api/categories/<int:category_id>/varieties/', views.api_varieties_by_category, name='api-varieties-by-category'),
    path('api/categories/<int:category_id>/units/', views.api_units_by_category, name='api-units-by-category'),
    path('api/goods-entries/', views.api_goods_entries, name='api-goods-entries'),
    path('api/goods-entries/create/', views.api_goods_entry_create, name='api-goods-entry-create'),
    path('api/goods-entries/<int:pk>/void/', views.api_goods_entry_void, name='api-goods-entry-void'),
    path('api/inventory-hint/', views.api_inventory_hint, name='api-inventory-hint'),
    path('api/units/', views.api_units, name='api-units'),
    path('api/units/create/', views.api_unit_create, name='api-unit-create'),
    path('api/units/<int:pk>/update/', views.api_unit_update, name='api-unit-update'),
    path('api/units/<int:pk>/delete/', views.api_unit_delete, name='api-unit-delete'),

    path('api/material-categories/tree/', views.api_material_categories_tree, name='api-material-categories-tree'),
    path('api/material-categories/flat/', views.api_material_categories_flat, name='api-material-categories-flat'),
    path('api/material-categories/create/', views.api_material_category_create, name='api-material-category-create'),
    path('api/material-categories/<int:pk>/update/', views.api_material_category_update, name='api-material-category-update'),
    path('api/material-categories/<int:pk>/delete/', views.api_material_category_delete, name='api-material-category-delete'),
    path('api/material-categories/<int:pk>/reorder/', views.api_material_category_reorder, name='api-material-category-reorder'),
]
