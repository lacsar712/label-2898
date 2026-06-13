from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('', views.dashboard, name='dashboard'),
    path('goods-entry/', views.menu_page, {'page_name': 'goods-entry'}, name='goods-entry'),
    path('unit-management/', views.menu_page, {'page_name': 'unit-management'}, name='unit-management'),
    path('category-management/', views.menu_page, {'page_name': 'category-management'}, name='category-management'),
    path('variety-management/', views.menu_page, {'page_name': 'variety-management'}, name='variety-management'),
    path('query-export/', views.menu_page, {'page_name': 'query-export'}, name='query-export'),
    path('daily-report/', views.menu_page, {'page_name': 'daily-report'}, name='daily-report'),
    path('warning/', views.menu_page, {'page_name': 'warning'}, name='warning'),
    path('approval/', views.menu_page, {'page_name': 'approval'}, name='approval'),
    path('attendance-staff/', views.menu_page, {'page_name': 'attendance-staff'}, name='attendance-staff'),
    path('outbound-staff/', views.menu_page, {'page_name': 'outbound-staff'}, name='outbound-staff'),
]
