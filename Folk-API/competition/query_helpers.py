from django.db.models import Q

from .models import Inscripcion


def build_inscripcion_lookup_q(cedula: str) -> Q:
    cedula = cedula.strip()
    return (
        Q(participante_solista__cedula=cedula)
        | Q(pareja__participante_1__cedula=cedula)
        | Q(pareja__participante_2__cedula=cedula)
        | Q(grupo__participantes__cedula=cedula)
        | Q(participantes__identificacion=cedula)
        | Q(pago_categoria__pago_full_pass__cedula=cedula)
    )


def get_inscripciones_for_cedula(evento, cedula: str):
    cedula = cedula.strip()
    if not cedula:
        return Inscripcion.objects.none()

    return (
        Inscripcion.objects.filter(categoria_ritmo__evento=evento)
        .filter(build_inscripcion_lookup_q(cedula))
        .select_related("categoria_ritmo")
        .distinct()
    )
