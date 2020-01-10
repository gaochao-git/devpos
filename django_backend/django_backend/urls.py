from django.contrib import admin
from django.urls import path
from apps import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('get_cluster_info/', views.get_cluster_info_func),
]