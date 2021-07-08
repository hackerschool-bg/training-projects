from django.urls import path


from . import views


urlpatterns = [
    path('', views.index, name='index'),
    path(r'<str:search>', views.index, name='index')
]