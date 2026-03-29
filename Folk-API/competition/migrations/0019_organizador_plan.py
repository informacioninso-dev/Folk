from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competition", "0018_organizador_notas_internas"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizador",
            name="plan_nombre",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Nombre del plan (ej: Básico, Pro, Enterprise)",
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name="organizador",
            name="plan_fecha_venc",
            field=models.DateField(
                blank=True,
                null=True,
                help_text="Fecha de vencimiento del plan",
            ),
        ),
        migrations.AddField(
            model_name="organizador",
            name="plan_notas",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Notas sobre el plan o historial de pagos a Folk",
            ),
        ),
    ]
