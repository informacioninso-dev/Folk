from __future__ import annotations

from typing import Iterable

from django.conf import settings
from django.core.mail import get_connection, send_mail

from .models import SiteConfig


def get_email_connection_and_from() -> tuple[object | None, str]:
    """
    Build SMTP connection from SiteConfig when configured.
    Falls back to Django email settings when SMTP is not set in panel.
    """
    config = SiteConfig.get()

    if (
        config.email_provider == SiteConfig.EmailProvider.GMAIL_APP
        and config.gmail_sender_email
        and config.gmail_app_password
    ):
        connection = get_connection(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host="smtp.gmail.com",
            port=587,
            username=config.gmail_sender_email,
            password=config.gmail_app_password,
            use_tls=True,
            fail_silently=False,
        )
        from_email = config.email_from or config.gmail_sender_email or settings.DEFAULT_FROM_EMAIL
        return connection, from_email

    if config.email_host:
        connection = get_connection(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host=config.email_host,
            port=config.email_port,
            username=config.email_host_user,
            password=config.email_host_password,
            use_tls=config.email_use_tls,
            fail_silently=False,
        )
        from_email = config.email_from or config.email_host_user or settings.DEFAULT_FROM_EMAIL
        return connection, from_email

    return None, settings.DEFAULT_FROM_EMAIL


def folk_send_mail(
    *,
    subject: str,
    message: str,
    recipient_list: Iterable[str],
    html_message: str | None = None,
    fail_silently: bool = False,
) -> int:
    connection, from_email = get_email_connection_and_from()
    return send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=list(recipient_list),
        html_message=html_message,
        connection=connection,
        fail_silently=fail_silently,
    )
