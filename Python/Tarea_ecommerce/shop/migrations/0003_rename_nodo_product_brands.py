from django.db import migrations


def rename_product_brands(apps, schema_editor):
    Product = apps.get_model("shop", "Product")
    Product.objects.filter(brand="NODO").update(brand="LOBO")


class Migration(migrations.Migration):
    dependencies = [
        ("shop", "0002_product_image_url"),
    ]

    operations = [
        migrations.RunPython(rename_product_brands, migrations.RunPython.noop),
    ]