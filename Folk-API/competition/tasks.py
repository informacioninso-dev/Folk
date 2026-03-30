from celery import shared_task
from django.conf import settings

from .emailing import folk_send_mail
from .models import Inscripcion, ParticipanteGeneral, Ranking


@shared_task
def send_inscripcion_confirmada_email(inscripcion_id: int) -> int:
    inscripcion = Inscripcion.objects.select_related(
        "categoria_ritmo__evento__organizador"
    ).prefetch_related(
        "participantes",
        "pareja__participante_1",
        "pareja__participante_2",
        "grupo__participantes",
    ).get(pk=inscripcion_id)
    evento = inscripcion.categoria_ritmo.evento

    subject = f"Inscripcion registrada - {evento.nombre}"
    message = (
        f"Tu inscripcion para '{evento.nombre}' fue registrada y esta pendiente de validacion.\n"
        f"ID de registro: #{inscripcion.id}\n"
        f"Categoria: {inscripcion.categoria_ritmo.nombre_ritmo} "
        f"({inscripcion.categoria_ritmo.get_modalidad_display()})\n"
        f"Acto: {inscripcion.nombre_acto}\n"
        f"Organizador: {evento.organizador.nombre}\n"
        f"Contacto del organizador: {evento.organizador.email_contacto}\n\n"
        "El organizador revisara tu inscripcion y recibiras una notificacion con el resultado."
    )

    recipients = set()
    recipients.add(evento.organizador.email_contacto)

    # Admin-flow: Participante FK records
    for p in inscripcion.participantes.all():
        if p.email:
            recipients.add(p.email)

    # M2-flow: ParticipanteGeneral via Pareja/Grupo
    try:
        pareja = inscripcion.pareja
        for pg in [pareja.participante_1, pareja.participante_2]:
            if pg and pg.correo_electronico:
                recipients.add(pg.correo_electronico)
    except Exception:
        pass

    try:
        for pg in inscripcion.grupo.participantes.all():
            if pg.correo_electronico:
                recipients.add(pg.correo_electronico)
    except Exception:
        pass

    return folk_send_mail(
        subject=subject,
        message=message,
        recipient_list=list(recipients),
        fail_silently=True,
    )


@shared_task
def send_registro_pendiente_email(participante_id: int) -> int:
    pg = ParticipanteGeneral.objects.select_related("evento__organizador").get(
        pk=participante_id
    )
    return folk_send_mail(
        subject=f"Registro recibido - {pg.evento.nombre}",
        message=(
            f"Hola {pg.nombre_completo},\n\n"
            f"Recibimos tu registro para '{pg.evento.nombre}'.\n\n"
            f"Numero de referencia: #{pg.id}\n\n"
            f"Organizador: {pg.evento.organizador.nombre}\n"
            f"Contacto del organizador: {pg.evento.organizador.email_contacto}\n\n"
            "Tu comprobante de pago esta siendo revisado por el organizador.\n"
            "Te notificaremos por correo cuando tu registro sea aprobado.\n\n"
            f"Guarda este numero de referencia: #{pg.id}"
        ),
        recipient_list=[pg.correo_electronico],
        fail_silently=True,
    )


@shared_task
def send_ranking_publicado_email(ranking_id: int) -> int:
    ranking = Ranking.objects.select_related("evento__organizador").get(pk=ranking_id)
    evento = ranking.evento

    recipients = list(
        evento.participantes_generales.filter(estado="activo").values_list(
            "correo_electronico", flat=True
        )
    )
    if not recipients:
        return 0

    frontend_url = getattr(settings, "FRONTEND_URL", "")
    ranking_url = f"{frontend_url}/ranking/{evento.slug}"

    return folk_send_mail(
        subject=f"Resultados publicados - {evento.nombre}",
        message=(
            f"Los resultados de '{evento.nombre}' ya estan disponibles.\n"
            f"Organizador: {evento.organizador.nombre}\n\n"
            f"Consulta el ranking completo en:\n{ranking_url}"
        ),
        recipient_list=recipients,
        fail_silently=True,
    )
