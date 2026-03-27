from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

from .models import Inscripcion, ParticipanteGeneral, Ranking


@shared_task
def send_inscripcion_confirmada_email(inscripcion_id: int) -> int:
    inscripcion = Inscripcion.objects.select_related(
        "categoria_ritmo__evento__organizador"
    ).prefetch_related("participantes").get(pk=inscripcion_id)
    evento = inscripcion.categoria_ritmo.evento

    subject = f"Inscripcion confirmada #{inscripcion.id}"
    message = (
        f"Su inscripcion para '{evento.nombre}' ha sido confirmada.\n"
        f"ID de registro: {inscripcion.id}\n"
        f"Categoria: {inscripcion.categoria_ritmo.nombre_ritmo} "
        f"({inscripcion.categoria_ritmo.get_modalidad_display()})\n"
        f"Acto: {inscripcion.nombre_acto}\n"
    )

    recipients = [evento.organizador.email_contacto]

    # Agregar emails de participantes si los registraron
    participant_emails = [p.email for p in inscripcion.participantes.all() if p.email]
    recipients.extend(participant_emails)

    return send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
    )


@shared_task
def send_registro_pendiente_email(participante_id: int) -> int:
    pg = ParticipanteGeneral.objects.select_related("evento").get(pk=participante_id)
    return send_mail(
        subject=f"Registro recibido — {pg.evento.nombre}",
        message=(
            f"Hola {pg.nombre_completo},\n\n"
            f"Recibimos tu registro para '{pg.evento.nombre}'.\n\n"
            f"Número de referencia: #{pg.id}\n\n"
            f"Tu comprobante de pago está siendo revisado por el organizador.\n"
            f"Te notificaremos por correo cuando tu registro sea aprobado.\n\n"
            f"Guarda este número de referencia: #{pg.id}"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[pg.correo_electronico],
        fail_silently=True,
    )


@shared_task
def send_ranking_publicado_email(ranking_id: int) -> int:
    from .models import Ranking
    ranking = Ranking.objects.select_related("evento").get(pk=ranking_id)
    evento = ranking.evento

    recipients = list(
        evento.participantes_generales
        .filter(estado="activo")
        .values_list("correo_electronico", flat=True)
    )
    if not recipients:
        return 0

    frontend_url = getattr(settings, "FRONTEND_URL", "")
    ranking_url = f"{frontend_url}/ranking/{evento.slug}"

    return send_mail(
        subject=f"Resultados publicados — {evento.nombre}",
        message=(
            f"Los resultados de '{evento.nombre}' ya están disponibles.\n\n"
            f"Consulta el ranking completo en:\n{ranking_url}"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        fail_silently=True,
    )
