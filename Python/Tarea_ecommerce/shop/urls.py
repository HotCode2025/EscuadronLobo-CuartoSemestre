from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("registro/", views.register, name="register"),
    path("perfil/", views.profile, name="profile"),
    path("producto/<slug:slug>/", views.product_detail, name="product_detail"),
    path("carrito/", views.cart_detail, name="cart_detail"),
    path("carrito/agregar/<int:product_id>/", views.cart_add, name="cart_add"),
    path("carrito/actualizar/<int:item_id>/", views.cart_update, name="cart_update"),
    path("carrito/eliminar/<int:item_id>/", views.cart_remove, name="cart_remove"),
    path("checkout/", views.checkout, name="checkout"),
    path("pedidos/", views.orders, name="orders"),
    path("pedidos/<int:order_id>/", views.order_detail, name="order_detail"),
]