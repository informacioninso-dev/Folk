from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competition", "0016_siteconfig_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizador",
            name="whatsapp_numero",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Número en formato internacional, ej: 593999999999",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="organizador",
            name="whatsapp_mensaje",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Mensaje predeterminado al abrir el chat",
                max_length=300,
            ),
        ),
        migrations.AddField(
            model_name="evento",
            name="mostrar_whatsapp",
            field=models.BooleanField(
                default=False,
                help_text="Mostrar botón de WhatsApp del organizador en el portal del evento",
            ),
        ),
        migrations.AddField(
            model_name="evento",
            name="whatsapp_mensaje_evento",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Mensaje personalizado para este evento (opcional)",
                max_length=300,
            ),
        ),
    ]
