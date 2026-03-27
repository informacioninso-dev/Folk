from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competition", "0002_evento_slug_organizador_usuario"),
    ]

    operations = [
        migrations.AddField(
            model_name="participante",
            name="email",
            field=models.EmailField(blank=True, default=""),
        ),
    ]
