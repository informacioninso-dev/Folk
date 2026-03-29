from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competition", "0015_siteconfig_aviso_privacidad_corto_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="email_host",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Ej: smtp.gmail.com",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="email_port",
            field=models.PositiveIntegerField(
                default=587,
                help_text="Puerto SMTP (587 para TLS, 465 para SSL)",
            ),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="email_use_tls",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="email_host_user",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Usuario / dirección del remitente",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="email_host_password",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Contraseña o App Password",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="email_from",
            field=models.EmailField(
                blank=True,
                default="",
                help_text="Dirección que verá el destinatario (From:)",
            ),
        ),
    ]
