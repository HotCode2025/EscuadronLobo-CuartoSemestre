from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Customer(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer")
    name = models.CharField("nombre completo", max_length=160)
    email = models.EmailField()
    address = models.CharField("direccion", max_length=255, blank=True)
    locality = models.CharField("localidad", max_length=100, blank=True)
    province = models.CharField("provincia", max_length=100, blank=True)
    postal_code = models.CharField("codigo postal", max_length=20, blank=True)

    def __str__(self):
        return self.name or self.user.get_username()


class Address(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField("etiqueta", max_length=60, default="Casa")
    name = models.CharField("destinatario", max_length=160)
    address = models.CharField("direccion", max_length=255)
    locality = models.CharField("localidad", max_length=100)
    province = models.CharField("provincia", max_length=100)
    postal_code = models.CharField("codigo postal", max_length=20)
    is_default = models.BooleanField("predeterminada", default=False)

    class Meta:
        ordering = ["-is_default", "label"]

    def __str__(self):
        return f"{self.label}: {self.address}, {self.locality}"


class Category(models.Model):
    name = models.CharField("nombre", max_length=80, unique=True)
    slug = models.SlugField(unique=True)
    description = models.CharField("descripcion", max_length=240, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categorias"

    def __str__(self):
        return self.name


class Product(models.Model):
    title = models.CharField("titulo", max_length=180)
    slug = models.SlugField(unique=True)
    price = models.DecimalField("precio de venta", max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    discounted_price = models.DecimalField("precio con descuento", max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0.01"))])
    description = models.TextField("descripcion")
    brand = models.CharField("marca", max_length=100, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    image = models.ImageField("imagen", upload_to="products/", blank=True)
    image_url = models.URLField("URL de imagen", blank=True)
    stock = models.PositiveIntegerField("stock", default=0)
    is_active = models.BooleanField("publicado", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def current_price(self):
        return self.discounted_price if self.discounted_price is not None else self.price

    @property
    def image_source(self):
        if self.image:
            return self.image.url
        return self.image_url or "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=85"

    @property
    def has_discount(self):
        return self.discounted_price is not None and self.discounted_price < self.price

    def __str__(self):
        return self.title


class Cart(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["added_at"]
        constraints = [models.UniqueConstraint(fields=["user", "product"], name="unique_product_per_user_cart")]

    @property
    def subtotal(self):
        return self.product.current_price * self.quantity

    def __str__(self):
        return f"{self.user} - {self.product} x {self.quantity}"


class OrderPlaced(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        ACCEPTED = "accepted", "Aceptado"
        PACKED = "packed", "Empacado"
        IN_TRANSIT = "in_transit", "En camino"
        DELIVERED = "delivered", "Entregado"
        CANCELLED = "cancelled", "Cancelado"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="orders")
    ordered_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    shipping_name = models.CharField(max_length=160)
    shipping_address = models.CharField(max_length=255)
    shipping_locality = models.CharField(max_length=100)
    shipping_province = models.CharField(max_length=100)
    shipping_postal_code = models.CharField(max_length=20)

    class Meta:
        ordering = ["-ordered_date"]

    @property
    def total(self):
        return sum((item.subtotal for item in self.items.all()), Decimal("0.00"))

    def __str__(self):
        return f"Pedido #{self.pk} - {self.user}"


class OrderItem(models.Model):
    order = models.ForeignKey(OrderPlaced, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    product_title = models.CharField(max_length=180)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.product_title} x {self.quantity}"


class Payment(models.Model):
    class Method(models.TextChoices):
        CARD = "card", "Tarjeta (simulacion)"
        TRANSFER = "transfer", "Transferencia"

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        COMPLETED = "completed", "Aprobado (simulado)"
        FAILED = "failed", "Rechazado"

    order = models.OneToOneField(OrderPlaced, on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=20, choices=Method.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=80, unique=True)
    paid_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Pago {self.transaction_id} - {self.get_status_display()}"