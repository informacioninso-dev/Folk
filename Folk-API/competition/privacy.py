from django.conf import settings

from .models import ConsentimientoDatosPersonales, SiteConfig


DEFAULT_PRIVACY_VERSION = "2026-03"
DEFAULT_PRIVACY_NOTICE = (
    "Autorizo el tratamiento de mis datos personales para gestionar mi registro, "
    "pagos, inscripciones, agenda y comunicaciones relacionadas con el evento."
)


def get_request_ip(request):
    forwarded_for = (request.META.get("HTTP_X_FORWARDED_FOR", "") or "").split(",")[0].strip()
    if forwarded_for:
        return forwarded_for
    return (request.META.get("REMOTE_ADDR", "") or "").strip() or None


def get_event_privacy_config(evento):
    site_config = SiteConfig.get()
    version = (site_config.politica_privacidad_version or "").strip() or DEFAULT_PRIVACY_VERSION
    custom_url = (site_config.politica_privacidad_url or "").strip()
    policy_url = custom_url or f"{settings.FRONTEND_URL}/evento/{evento.slug}/privacidad"
    notice = (site_config.aviso_privacidad_corto or "").strip() or DEFAULT_PRIVACY_NOTICE
    contact_email = (evento.organizador.email_contacto or "").strip()
    return {
        "version": version,
        "policy_url": policy_url,
        "notice": notice,
        "contact_email": contact_email,
    }


def record_privacy_consent(
    *,
    evento,
    flujo,
    titular_nombre,
    titular_documento,
    titular_correo="",
    es_menor_edad=False,
    aceptado_por_representante=False,
    nombre_representante_legal="",
    cedula_representante_legal="",
    participante_general=None,
    pago_full_pass=None,
    inscripcion=None,
    request=None,
):
    privacy = get_event_privacy_config(evento)
    return ConsentimientoDatosPersonales.objects.create(
        evento=evento,
        flujo=flujo,
        version_politica=privacy["version"],
        politica_privacidad_url=privacy["policy_url"],
        aviso_privacidad=privacy["notice"],
        titular_nombre=titular_nombre,
        titular_documento=titular_documento,
        titular_correo=titular_correo,
        es_menor_edad=es_menor_edad,
        aceptado_por_representante=aceptado_por_representante,
        nombre_representante_legal=nombre_representante_legal,
        cedula_representante_legal=cedula_representante_legal,
        ip_address=get_request_ip(request) if request else None,
        user_agent=((request.META.get("HTTP_USER_AGENT", "") or "")[:255] if request else ""),
        participante_general=participante_general,
        pago_full_pass=pago_full_pass,
        inscripcion=inscripcion,
    )
