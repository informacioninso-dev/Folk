from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competition", "0009_categoriaritmo_precio_adicional_evento_banner_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="evento",
            name="pago_folk_confirmado",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="evento",
            name="monto_folk",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="evento",
            name="notas_pago",
            field=models.TextField(blank=True, default=""),
        ),
    ]
