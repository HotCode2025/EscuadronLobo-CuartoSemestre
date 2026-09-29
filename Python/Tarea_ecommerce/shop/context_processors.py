def cart_count(request):
    if request.user.is_authenticated:
        from .models import Cart

        return {"cart_count": sum(Cart.objects.filter(user=request.user).values_list("quantity", flat=True))}
    return {"cart_count": 0}