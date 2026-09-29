from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("cuenta/ingresar/", auth_views.LoginView.as_view(template_name="shop/login.html"), name="login"),
    path("cuenta/salir/", auth_views.LogoutView.as_view(), name="logout"),
    path("cuenta/clave/", auth_views.PasswordChangeView.as_view(template_name="shop/password_change.html", success_url="/cuenta/clave/cambiada/"), name="password_change"),
    path("cuenta/clave/cambiada/", auth_views.PasswordChangeDoneView.as_view(template_name="shop/password_change_done.html"), name="password_change_done"),
    path("", include("shop.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)