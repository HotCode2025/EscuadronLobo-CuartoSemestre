from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from shop.models import Cart, Category, Customer, OrderItem, OrderPlaced, Payment, Product


class ShoppingFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="comprador", password="Demo-pass-123")
        self.customer = Customer.objects.create(user=self.user, name="Ada Compradora", email="ada@example.com")
        self.category = Category.objects.create(name="Electronica", slug="electronica")
        self.product = Product.objects.create(
            title="Auriculares", slug="auriculares", price=Decimal("50000.00"),
            discounted_price=Decimal("42000.00"), description="Auriculares de prueba.",
            brand="LOBO", category=self.category, stock=5,
        )
        self.client.force_login(self.user)

    def test_catalog_displays_active_products(self):
        response = self.client.get(reverse("home"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Auriculares")
        self.assertContains(response, "$42000,00")

    def test_cart_checkout_records_payment_and_decrements_stock(self):
        self.client.post(reverse("cart_add", args=[self.product.pk]), {"quantity": 2})
        cart_item = Cart.objects.get(user=self.user, product=self.product)
        response = self.client.post(reverse("cart_update", args=[cart_item.pk]), {"quantity": 3})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total"], "126000.00")

        response = self.client.post(reverse("checkout"), {
            "label": "Casa",
            "name": "Ada Compradora",
            "address": "Av. Siempre Viva 123",
            "locality": "Cordoba",
            "province": "Cordoba",
            "postal_code": "5000",
            "payment_method": "card",
        })

        order = OrderPlaced.objects.get(user=self.user)
        self.assertRedirects(response, reverse("order_detail", args=[order.pk]))
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(OrderItem.objects.get(order=order).subtotal, Decimal("126000.00"))
        self.assertEqual(order.payment.status, Payment.Status.COMPLETED)
        self.assertEqual(order.payment.amount, Decimal("126000.00"))
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 2)
        self.assertFalse(Cart.objects.filter(user=self.user).exists())

    def test_checkout_rejects_quantity_above_available_stock(self):
        Cart.objects.create(user=self.user, product=self.product, quantity=6)
        response = self.client.post(reverse("checkout"), {
            "name": "Ada Compradora",
            "address": "Av. Siempre Viva 123",
            "locality": "Cordoba",
            "province": "Cordoba",
            "postal_code": "5000",
            "payment_method": "card",
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(OrderPlaced.objects.exists())
        self.assertEqual(self.product.stock, 5)