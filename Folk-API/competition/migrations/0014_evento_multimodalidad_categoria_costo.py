from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competition", "0013_siteconfig"),
    ]

    operations = [
        migrations.AddField(
            model_name="evento",
            name="permitir_multimodalidad",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="evento",
            name="categorias_tienen_costo",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="categoriaritmo",
            name="incluido_full_pass",
            field=models.BooleanField(default=True),
        ),
    ]
