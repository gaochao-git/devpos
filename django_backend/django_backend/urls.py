from django.contrib import admin
from django.urls import path
from apps import views
from apps import inception

urlpatterns = [
    path('admin/', admin.site.urls),
    path('get_cluster_info/', views.get_cluster_info_func),
    path('get_search_cluster_info/', views.get_search_cluster_info_func),
    path('check_sql_info/', inception.check_sql_func),
]