import uuid
from decimal import Decimal

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import F, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import AddressForm, CheckoutForm, CustomerProfileForm, RegisterForm
from .models import Address, Cart, Category, Customer, OrderItem, OrderPlaced, Payment, Product


def home(request):
    products = Product.objects.filter(is_active=True).select_related("category")
    category_slug = request.GET.get("categoria", "")
    query = request.GET.get("q", "").strip()
    if category_slug:
        products = products.filter(category__slug=category_slug)
    if query:
        products = products.filter(Q(title__icontains=query) | Q(brand__icontains=query) | Q(description__icontains=query))
    return render(request, "shop/home.html", {
        "products": products,
        "categories": Category.objects.all(),
        "active_category": category_slug,
        "search_query": query,
    })


def product_detail(request, slug):
    product = get_object_or_404(Product.objects.select_related("category"), slug=slug, is_active=True)
    return render(request, "shop/product_detail.html", {"product": product})


def register(request):
    if request.user.is_authenticated:
        return redirect("home")
    form = RegisterForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.save()
        login(request, user)
        messages.success(request, "Tu cuenta ya esta lista.")
        return redirect("home")
    return render(request, "shop/register.html", {"form": form})


@login_required
def profile(request):
    customer, _ = Customer.objects.get_or_create(
        user=request.user,
        defaults={"name": request.user.get_full_name(), "email": request.user.email},
    )
    if request.method == "POST":
        action = request.POST.get("action")
        if action == "profile":
            form = CustomerProfileForm(request.POST, instance=customer)
            if form.is_valid():
                form.save()
                request.user.email = form.cleaned_data["email"]
                request.user.first_name = form.cleaned_data["name"].split(" ")[0]
                request.user.save(update_fields=["email", "first_name"])
                messages.success(request, "Perfil actualizado.")
                return redirect("profile")
        elif action == "address":
            form = AddressForm(request.POST)
            if form.is_valid():
                address = form.save(commit=False)
                address.customer = customer
                if not customer.addresses.exists():
                    address.is_default = True
                address.save()
                messages.success(request, "Direccion guardada.")
                return redirect("profile")
        elif action in {"default", "delete"}:
            address = get_object_or_404(Address, pk=request.POST.get("address_id"), customer=customer)
            if action == "default":
                customer.addresses.update(is_default=False)
                address.is_default = True
                address.save(update_fields=["is_default"])
            else:
                address.delete()
            return redirect("profile")
    else:
        form = CustomerProfileForm(instance=customer)
    address_form = AddressForm()
    return render(request, "shop/profile.html", {
        "form": form,
        "address_form": address_form,
        "addresses": customer.addresses.all(),
    })


@login_required
def cart_detail(request):
    items = Cart.objects.filter(user=request.user, product__is_active=True).select_related("product", "product__category")
    total = sum((item.subtotal for item in items), Decimal("0.00"))
    return render(request, "shop/cart.html", {"items": items, "total": total})


@login_required
@require_POST
def cart_add(request, product_id):
    product = get_object_or_404(Product, pk=product_id, is_active=True)
    if product.stock < 1:
        messages.error(request, "Este producto no tiene stock disponible.")
        return redirect(request.POST.get("next") or "cart_detail")
    try:
        quantity = max(1, int(request.POST.get("quantity", 1)))
    except (TypeError, ValueError):
        quantity = 1
    quantity = min(quantity, product.stock)
    item, created = Cart.objects.get_or_create(user=request.user, product=product, defaults={"quantity": quantity})
    if not created:
        item.quantity = min(item.quantity + quantity, product.stock)
        item.save(update_fields=["quantity"])
    messages.success(request, "Producto agregado al carrito.")
    return redirect(request.POST.get("next") or "cart_detail")


@login_required
@require_POST
def cart_update(request, item_id):
    item = get_object_or_404(Cart, pk=item_id, user=request.user)
    try:
        quantity = int(request.POST.get("quantity", "1"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "Cantidad no valida."}, status=400)
    if quantity < 1 or quantity > item.product.stock:
        return JsonResponse({"error": "La cantidad supera el stock disponible."}, status=400)
    item.quantity = quantity
    item.save(update_fields=["quantity"])
    items = Cart.objects.filter(user=request.user, product__is_active=True).select_related("product")
    total = sum((cart_item.subtotal for cart_item in items), Decimal("0.00"))
    return JsonResponse({"subtotal": f"{item.subtotal:.2f}", "total": f"{total:.2f}", "cart_count": sum(cart_item.quantity for cart_item in items)})


@login_required
@require_POST
def cart_remove(request, item_id):
    get_object_or_404(Cart, pk=item_id, user=request.user).delete()
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        return JsonResponse({"removed": True})
    return redirect("cart_detail")


@login_required
def checkout(request):
    items = list(Cart.objects.filter(user=request.user, product__is_active=True).select_related("product"))
    if not items:
        messages.info(request, "Tu carrito esta vacio.")
        return redirect("cart_detail")
    customer, _ = Customer.objects.get_or_create(
        user=request.user,
        defaults={"name": request.user.get_full_name(), "email": request.user.email},
    )
    default_address = customer.addresses.filter(is_default=True).first()
    initial = {}
    if default_address:
        initial = {field: getattr(default_address, field) for field in ("name", "address", "locality", "province", "postal_code")}
    form = CheckoutForm(request.POST or None, initial=initial)
    total = sum((item.subtotal for item in items), Decimal("0.00"))
    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            for item in items:
                product = Product.objects.select_for_update().get(pk=item.product_id)
                if product.stock < item.quantity:
                    form.add_error(None, f"No hay stock suficiente de {product.title}.")
                    return render(request, "shop/checkout.html", {"form": form, "items": items, "total": total})
            order = OrderPlaced.objects.create(
                user=request.user,
                customer=customer,
                shipping_name=form.cleaned_data["name"],
                shipping_address=form.cleaned_data["address"],
                shipping_locality=form.cleaned_data["locality"],
                shipping_province=form.cleaned_data["province"],
                shipping_postal_code=form.cleaned_data["postal_code"],
            )
            for item in items:
                product = Product.objects.select_for_update().get(pk=item.product_id)
                OrderItem.objects.create(order=order, product=product, product_title=product.title, quantity=item.quantity, unit_price=product.current_price)
                Product.objects.filter(pk=product.pk).update(stock=F("stock") - item.quantity)
            Payment.objects.create(
                order=order,
                method=form.cleaned_data["payment_method"],
                amount=total,
                transaction_id=f"SIM-{uuid.uuid4().hex[:16].upper()}",
            )
            Cart.objects.filter(user=request.user).delete()
        messages.success(request, "Pago simulado aprobado. Tu pedido fue registrado.")
        return redirect("order_detail", order_id=order.pk)
    return render(request, "shop/checkout.html", {"form": form, "items": items, "total": total})


@login_required
def orders(request):
    return render(request, "shop/orders.html", {"orders": request.user.orders.prefetch_related("items")})


@login_required
def order_detail(request, order_id):
    order = get_object_or_404(OrderPlaced.objects.prefetch_related("items").select_related("payment"), pk=order_id, user=request.user)
    return render(request, "shop/order_detail.html", {"order": order})