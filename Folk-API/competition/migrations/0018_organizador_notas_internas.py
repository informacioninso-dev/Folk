from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competition", "0017_organizador_whatsapp_evento_whatsapp"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizador",
            name="notas_internas",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Notas privadas del equipo Folk sobre este cliente",
            ),
        ),
    ]
