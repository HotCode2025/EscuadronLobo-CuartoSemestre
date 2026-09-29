from django.contrib import admin

from .models import Address, Cart, Category, Customer, OrderItem, OrderPlaced, Payment, Product


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "user")
    search_fields = ("name", "email", "user__username")


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("label", "name", "locality", "province", "is_default")
    list_filter = ("province", "is_default")
    search_fields = ("name", "address", "locality", "customer__email")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "brand", "price", "discounted_price", "stock", "is_active")
    list_filter = ("category", "is_active", "brand")
    search_fields = ("title", "brand", "description")
    prepopulated_fields = {"slug": ("title",)}
    list_editable = ("price", "discounted_price", "stock", "is_active")


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("user", "product", "quantity", "added_at")
    list_filter = ("added_at",)
    search_fields = ("user__username", "product__title")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_title", "unit_price", "quantity")


@admin.register(OrderPlaced)
class OrderPlacedAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "customer", "ordered_date", "status", "total")
    list_filter = ("status", "ordered_date")
    search_fields = ("id", "user__username", "customer__email", "shipping_name")
    list_editable = ("status",)
    inlines = (OrderItemInline,)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("transaction_id", "order", "method", "status", "amount", "paid_at")
    list_filter = ("method", "status", "paid_at")
    search_fields = ("transaction_id", "order__user__username")
    readonly_fields = ("transaction_id", "amount", "paid_at")