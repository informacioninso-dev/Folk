from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competition", "0012_juez_categorias"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("whatsapp_numero",  models.CharField(blank=True, default="", max_length=30,
                                                      help_text="Número en formato internacional, ej: 593999999999")),
                ("whatsapp_mensaje", models.CharField(blank=True, default="Hola! Quiero más información sobre Folk.",
                                                      max_length=300)),
            ],
            options={"verbose_name": "Configuración del sitio"},
        ),
    ]
