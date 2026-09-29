from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from shop.models import Category, Product


class Command(BaseCommand):
    help = "Crea categorias y productos de muestra para explorar la tienda."

    def handle(self, *args, **options):
        catalog = {
            "Electronica": [
                ("Auriculares inalambricos", "audio-nodo", "LOBO", "Sonido claro y comodidad para todos los dias.", "68900.00", "54900.00", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85"),
                ("Parlante portatil", "parlante-portatil", "SONA", "Musica donde quieras, con bateria de larga duracion.", "79900.00", None, "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85"),
            ],
            "Indumentaria": [
                ("Mochila urbana", "mochila-urbana", "SUR", "Diseno liviano, interior amplio y materiales resistentes.", "54900.00", None, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85"),
                ("Buzo esencial", "buzo-esencial", "LOBO", "Un basico de calce relajado para todos los dias.", "62900.00", "49900.00", "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85"),
            ],
            "Accesorios": [
                ("Botella termica", "botella-termica", "TERMO", "Acero inoxidable para acompanarte todo el dia.", "28900.00", None, "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85"),
                ("Reloj clasico", "reloj-clasico", "TIEMPO", "Una pieza simple para sumar a tu rutina.", "89900.00", "74900.00", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85"),
            ],
        }
        for category_name, products in catalog.items():
            category, _ = Category.objects.get_or_create(
                slug=slugify(category_name),
                defaults={"name": category_name},
            )
            for title, slug, brand, description, price, discounted_price, image_url in products:
                product, created = Product.objects.get_or_create(
                    slug=slug,
                    defaults={
                        "title": title,
                        "brand": brand,
                        "description": description,
                        "price": Decimal(price),
                        "discounted_price": Decimal(discounted_price) if discounted_price else None,
                        "category": category,
                        "image_url": image_url,
                        "stock": 12,
                        "is_active": True,
                    },
                )
                if not created and not product.image and not product.image_url:
                    product.image_url = image_url
                    product.save(update_fields=["image_url"])
                if not created and product.brand == "NODO":
                    product.brand = "LOBO"
                    product.save(update_fields=["brand"])
        self.stdout.write(self.style.SUCCESS("Catalogo de muestra disponible."))