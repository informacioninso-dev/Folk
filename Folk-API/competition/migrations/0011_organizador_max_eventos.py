from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competition", "0010_evento_pago_folk"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizador",
            name="max_eventos",
            field=models.PositiveIntegerField(default=1),
        ),
    ]
