from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competition", "0011_organizador_max_eventos"),
    ]

    operations = [
        migrations.AddField(
            model_name="juez",
            name="categorias",
            field=models.ManyToManyField(
                blank=True,
                related_name="jueces",
                to="competition.categoriaritmo",
            ),
        ),
    ]
