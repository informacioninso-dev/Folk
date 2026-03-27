import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Avg
from django.utils.text import slugify


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ─── Organizador ──────────────────────────────────────────────────────────────

class Organizador(BaseModel):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organizador",
    )
    nombre         = models.CharField(max_length=150)
    nit_ruc        = models.CharField(max_length=32, unique=True)
    email_contacto = models.EmailField()
    # Perfil de empresa
    logo           = models.ImageField(upload_to="logos/", null=True, blank=True)
    direccion      = models.CharField(max_length=255, blank=True)
    descripcion    = models.TextField(blank=True)
    sitio_web      = models.URLField(blank=True)
    telefono       = models.CharField(max_length=30, blank=True)
    # Límite de eventos (Fase 1: cobro por evento)
    max_eventos    = models.PositiveIntegerField(default=1)
    # Equipo: usuarios adicionales con acceso al panel
    miembros       = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="org_miembros",
    )

    class Meta:
        ordering = ("nombre",)

    def __str__(self) -> str:
        return self.nombre


# ─── Evento ───────────────────────────────────────────────────────────────────

class Evento(BaseModel):
    class Estado(models.TextChoices):
        BORRADOR   = "borrador",   "Borrador"
        ACTIVA     = "activa",     "Activa"
        FINALIZADA = "finalizada", "Finalizada"

    organizador = models.ForeignKey(
        Organizador,
        on_delete=models.CASCADE,
        related_name="eventos",
    )
    nombre    = models.CharField(max_length=150)
    fecha     = models.DateField()
    ubicacion = models.CharField(max_length=255)
    activo    = models.BooleanField(default=False)
    slug      = models.SlugField(max_length=220, unique=True, blank=True)
    estado    = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.BORRADOR,
    )
    # Portal público
    banner           = models.ImageField(upload_to="banners/", null=True, blank=True)
    descripcion_portal = models.TextField(blank=True, default="")
    portal_activo    = models.BooleanField(default=False)
    destacado        = models.BooleanField(default=False)
    # Cobro Folk (Fase 1)
    pago_folk_confirmado = models.BooleanField(default=False)
    monto_folk           = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    notas_pago           = models.TextField(blank=True, default="")
    # Configuración de participación
    permitir_multimodalidad  = models.BooleanField(default=False)
    categorias_tienen_costo  = models.BooleanField(default=False)

    class Meta:
        ordering = ("-fecha", "nombre")
        constraints = [
            models.UniqueConstraint(
                fields=("organizador", "nombre", "fecha"),
                name="uq_evento_por_organizador",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.nombre}-{self.fecha}")
            self.slug = f"{base}-{str(uuid.uuid4())[:8]}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.nombre} ({self.fecha})"


# ─── Categoría de ritmo ───────────────────────────────────────────────────────

class CategoriaRitmo(BaseModel):
    class Modalidad(models.TextChoices):
        SOLISTA = "solista", "Solista"
        PAREJA  = "pareja",  "Pareja"
        GRUPO   = "grupo",   "Grupo"

    evento      = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name="categorias_ritmo",
    )
    nombre_ritmo    = models.CharField(max_length=100)
    modalidad       = models.CharField(max_length=20, choices=Modalidad.choices)
    edad_min        = models.PositiveSmallIntegerField(null=True, blank=True)
    edad_max        = models.PositiveSmallIntegerField(null=True, blank=True)
    precio_adicional   = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal("0.00")
    )
    incluido_full_pass = models.BooleanField(default=True)

    class Meta:
        ordering = ("nombre_ritmo", "modalidad")
        constraints = [
            models.UniqueConstraint(
                fields=("evento", "nombre_ritmo", "modalidad"),
                name="uq_categoria_ritmo_por_evento",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.nombre_ritmo} - {self.get_modalidad_display()}"


# ─── Inscripción ──────────────────────────────────────────────────────────────

class Inscripcion(BaseModel):
    class EstadoInscripcion(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente validación"
        APROBADA  = "aprobada",  "Aprobada"
        RECHAZADA = "rechazada", "Rechazada"

    categoria_ritmo = models.ForeignKey(
        CategoriaRitmo,
        on_delete=models.CASCADE,
        related_name="inscripciones",
    )
    nombre_acto    = models.CharField(max_length=150)
    academia       = models.CharField(max_length=150, blank=True, default="")
    estado_pago    = models.BooleanField(default=False)
    estado_inscripcion = models.CharField(
        max_length=20,
        choices=EstadoInscripcion.choices,
        default=EstadoInscripcion.PENDIENTE,
    )
    foto_url                  = models.URLField(blank=True, default="")
    pista_musical_url         = models.URLField(blank=True, default="")
    comprobante_categoria_url = models.URLField(blank=True, default="")
    nota_rechazo              = models.TextField(blank=True, default="")
    participante_solista      = models.ForeignKey(
        "ParticipanteGeneral",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="inscripciones_solista",
    )
    puntaje_final = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        ordering = ("nombre_acto",)
        constraints = [
            models.UniqueConstraint(
                fields=("categoria_ritmo", "nombre_acto"),
                name="uq_inscripcion_por_categoria",
            ),
        ]

    def __str__(self) -> str:
        return self.nombre_acto

    def recalcular_puntaje_final(self) -> Decimal:
        promedio = self.calificaciones.aggregate(promedio=Avg("puntaje"))["promedio"]
        self.puntaje_final = promedio or Decimal("0.00")
        self.save(update_fields=["puntaje_final", "updated_at"])
        return self.puntaje_final


# ─── Participante (miembro de una inscripción) ────────────────────────────────

class Participante(BaseModel):
    """Persona dentro de una inscripción (existente, no romper)."""
    inscripcion      = models.ForeignKey(
        Inscripcion,
        on_delete=models.CASCADE,
        related_name="participantes",
    )
    nombre_completo  = models.CharField(max_length=150)
    identificacion   = models.CharField(max_length=32)
    edad             = models.PositiveSmallIntegerField()
    email            = models.EmailField(blank=True, default="")

    class Meta:
        ordering = ("nombre_completo",)
        constraints = [
            models.UniqueConstraint(
                fields=("inscripcion", "identificacion"),
                name="uq_participante_por_inscripcion",
            ),
        ]

    def __str__(self) -> str:
        return self.nombre_completo


# ─── Participante General (registro top-level — Módulo 1) ─────────────────────

class ParticipanteGeneral(BaseModel):
    """Registro independiente de un participante antes de inscribirse en una modalidad."""

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente_validacion", "Pendiente de validación"
        ACTIVO    = "activo",               "Activo"
        RECHAZADO = "rechazado",            "Rechazado"

    usuario             = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="participaciones",
    )
    evento              = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name="participantes_generales",
    )
    nombre_completo     = models.CharField(max_length=150)
    cedula              = models.CharField(max_length=32)
    edad                = models.PositiveSmallIntegerField()
    correo_electronico  = models.EmailField()
    telefono            = models.CharField(max_length=30)
    comprobante_pago_url = models.URLField(blank=True, default="")
    estado              = models.CharField(
        max_length=25,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
    )
    nota_rechazo        = models.TextField(blank=True, default="")

    class Meta:
        ordering = ("nombre_completo",)
        constraints = [
            models.UniqueConstraint(
                fields=("evento", "cedula"),
                name="uq_participante_general_por_evento",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.nombre_completo} ({self.cedula})"


# ─── Grupo ────────────────────────────────────────────────────────────────────

class Grupo(BaseModel):
    inscripcion           = models.OneToOneField(
        Inscripcion,
        on_delete=models.CASCADE,
        related_name="grupo",
        null=True,
        blank=True,
    )
    nombre                = models.CharField(max_length=150)
    representante         = models.CharField(max_length=150)
    cedula_representante  = models.CharField(max_length=32)
    academia              = models.CharField(max_length=150, blank=True, default="")
    participantes         = models.ManyToManyField(
        ParticipanteGeneral,
        related_name="grupos",
        blank=True,
    )

    def __str__(self) -> str:
        return self.nombre


# ─── Pareja ───────────────────────────────────────────────────────────────────

class Pareja(BaseModel):
    inscripcion          = models.OneToOneField(
        Inscripcion,
        on_delete=models.CASCADE,
        related_name="pareja",
        null=True,
        blank=True,
    )
    nombre               = models.CharField(max_length=150)
    representante        = models.CharField(max_length=150)
    cedula_representante = models.CharField(max_length=32)
    academia             = models.CharField(max_length=150, blank=True, default="")
    participante_1       = models.ForeignKey(
        ParticipanteGeneral,
        on_delete=models.SET_NULL,
        null=True,
        related_name="parejas_como_1",
    )
    participante_2       = models.ForeignKey(
        ParticipanteGeneral,
        on_delete=models.SET_NULL,
        null=True,
        related_name="parejas_como_2",
    )

    def __str__(self) -> str:
        return self.nombre


# ─── Juez ─────────────────────────────────────────────────────────────────────

class Juez(BaseModel):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="asignaciones_como_juez",
    )
    evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name="jueces",
    )
    categorias = models.ManyToManyField(
        CategoriaRitmo,
        blank=True,
        related_name="jueces",
    )

    class Meta:
        ordering = ("evento", "usuario")
        constraints = [
            models.UniqueConstraint(
                fields=("usuario", "evento"),
                name="uq_juez_por_evento",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.usuario} - {self.evento.nombre}"


# ─── Criterio de evaluación ───────────────────────────────────────────────────

class CriterioEvaluacion(BaseModel):
    evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name="criterios_evaluacion",
    )
    nombre = models.CharField(max_length=100)

    class Meta:
        ordering = ("nombre",)
        constraints = [
            models.UniqueConstraint(
                fields=("evento", "nombre"),
                name="uq_criterio_por_evento",
            ),
        ]

    def __str__(self) -> str:
        return self.nombre


# ─── Calificación ─────────────────────────────────────────────────────────────

class Calificacion(BaseModel):
    juez = models.ForeignKey(
        Juez,
        on_delete=models.CASCADE,
        related_name="calificaciones",
    )
    inscripcion = models.ForeignKey(
        Inscripcion,
        on_delete=models.CASCADE,
        related_name="calificaciones",
    )
    criterio = models.ForeignKey(
        CriterioEvaluacion,
        on_delete=models.CASCADE,
        related_name="calificaciones",
    )
    puntaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    comentario        = models.TextField(blank=True)
    bloqueada         = models.BooleanField(default=False)
    feedback_audio_url = models.URLField(blank=True, default="")

    class Meta:
        ordering = ("inscripcion", "criterio", "juez")
        constraints = [
            models.UniqueConstraint(
                fields=("juez", "inscripcion", "criterio"),
                name="uq_calificacion_por_juez_inscripcion_criterio",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.inscripcion} - {self.criterio} - {self.puntaje}"

    def clean(self) -> None:
        errors = {}
        evento_inscripcion_id = self.inscripcion.categoria_ritmo.evento_id

        if self.juez.evento_id != evento_inscripcion_id:
            errors["juez"] = "El juez debe pertenecer al mismo evento de la inscripcion."

        if self.criterio.evento_id != evento_inscripcion_id:
            errors["criterio"] = "El criterio debe pertenecer al mismo evento de la inscripcion."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Si ya estaba bloqueada y es una actualización, impedir cambio de puntaje
        if self.pk and self.bloqueada:
            original = Calificacion.objects.filter(pk=self.pk).values("bloqueada").first()
            if original and original["bloqueada"]:
                raise ValidationError("Esta calificación está bloqueada y no puede modificarse.")
        self.full_clean()
        super().save(*args, **kwargs)
        self.inscripcion.recalcular_puntaje_final()

    def delete(self, *args, **kwargs):
        inscripcion = self.inscripcion
        super().delete(*args, **kwargs)
        inscripcion.recalcular_puntaje_final()


# ─── Configuración global del sitio (singleton) ───────────────────────────────

class SiteConfig(models.Model):
    """Registro único de configuración global. Siempre usar id=1."""
    whatsapp_numero  = models.CharField(max_length=30, blank=True, default="",
                                        help_text="Número en formato internacional, ej: 593999999999")
    whatsapp_mensaje = models.CharField(max_length=300, blank=True,
                                        default="Hola! Quiero más información sobre Folk.")
    politica_privacidad_version = models.CharField(max_length=40, blank=True, default="2026-03")
    politica_privacidad_url = models.URLField(blank=True, default="")
    aviso_privacidad_corto = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Configuración del sitio"

    def __str__(self) -> str:
        return "Configuración global"

    @classmethod
    def get(cls) -> "SiteConfig":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


# ─── Ranking ──────────────────────────────────────────────────────────────────


class ConsentimientoDatosPersonales(BaseModel):
    class Flujo(models.TextChoices):
        REGISTRO_GENERAL = "registro_general", "Registro general"
        FULL_PASS = "full_pass", "Full Pass"
        INSCRIPCION_CATEGORIA = "inscripcion_categoria", "Inscripción de categoría"

    evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name="consentimientos_datos",
    )
    flujo = models.CharField(max_length=40, choices=Flujo.choices)
    version_politica = models.CharField(max_length=40)
    politica_privacidad_url = models.URLField(blank=True, default="")
    aviso_privacidad = models.TextField(blank=True, default="")
    titular_nombre = models.CharField(max_length=150)
    titular_documento = models.CharField(max_length=32)
    titular_correo = models.EmailField(blank=True, default="")
    es_menor_edad = models.BooleanField(default=False)
    aceptado_por_representante = models.BooleanField(default=False)
    nombre_representante_legal = models.CharField(max_length=150, blank=True, default="")
    cedula_representante_legal = models.CharField(max_length=32, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, default="")
    participante_general = models.ForeignKey(
        "ParticipanteGeneral",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consentimientos_datos",
    )
    pago_full_pass = models.ForeignKey(
        "PagoFullPass",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consentimientos_datos",
    )
    inscripcion = models.ForeignKey(
        "Inscripcion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consentimientos_datos",
    )

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.get_flujo_display()} - {self.titular_nombre} ({self.titular_documento})"


class Ranking(BaseModel):
    class Estado(models.TextChoices):
        BORRADOR   = "borrador",   "Borrador"
        PUBLICADO  = "publicado",  "Publicado"

    evento       = models.OneToOneField(
        Evento,
        on_delete=models.CASCADE,
        related_name="ranking",
    )
    estado       = models.CharField(
        max_length=15,
        choices=Estado.choices,
        default=Estado.BORRADOR,
    )
    publicado_en = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"Ranking {self.evento.nombre} [{self.estado}]"


# ─── Cronograma ───────────────────────────────────────────────────────────────

class Cronograma(BaseModel):
    evento = models.OneToOneField(
        Evento,
        on_delete=models.CASCADE,
        related_name="cronograma",
    )

    def __str__(self) -> str:
        return f"Cronograma {self.evento.nombre}"


class ItemCronograma(BaseModel):
    cronograma        = models.ForeignKey(
        Cronograma,
        on_delete=models.CASCADE,
        related_name="items",
    )
    # Actividad libre
    titulo            = models.CharField(max_length=200, blank=True)
    responsable       = models.CharField(max_length=150, blank=True)
    descripcion       = models.TextField(blank=True)
    hora_inicio       = models.TimeField(null=True, blank=True)
    hora_fin          = models.TimeField(null=True, blank=True)
    # Inscripción (opcional — para presentaciones de competencia)
    inscripcion       = models.ForeignKey(
        Inscripcion,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="items_cronograma",
    )
    fecha             = models.DateField(null=True, blank=True)
    orden             = models.PositiveSmallIntegerField()
    duracion_segundos = models.PositiveSmallIntegerField(default=0)
    tiempo_extra      = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("cronograma", "orden")

    def __str__(self) -> str:
        return f"#{self.orden} — {self.titulo or (self.inscripcion.nombre_acto if self.inscripcion else 'Item')}"


# ─── Full Pass Config ──────────────────────────────────────────────────────────

class FullPassConfig(BaseModel):
    """Configuración del Full Pass para un evento. Uno por evento."""
    evento       = models.OneToOneField(
        Evento,
        on_delete=models.CASCADE,
        related_name="full_pass_config",
    )
    nombre       = models.CharField(max_length=100, default="Full Pass")
    precio       = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    es_requerido = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.nombre} — {self.evento.nombre}"


# ─── Pago Full Pass ────────────────────────────────────────────────────────────

class PagoFullPass(BaseModel):
    """Registro de pago del Full Pass por participante."""

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        APROBADO  = "aprobado",  "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"

    evento               = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name="pagos_full_pass",
    )
    cedula               = models.CharField(max_length=32)
    nombre_completo      = models.CharField(max_length=150)
    correo_electronico   = models.EmailField()
    telefono             = models.CharField(max_length=30, blank=True, default="")
    comprobante_imagen   = models.ImageField(upload_to="comprobantes/full_pass/", null=True, blank=True)
    numero_comprobante   = models.CharField(max_length=100, blank=True, default="")
    estado               = models.CharField(
        max_length=15,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
    )
    nota_rechazo         = models.TextField(blank=True, default="")

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("evento", "cedula"),
                name="uq_pago_full_pass_por_evento",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.nombre_completo} ({self.cedula}) — {self.evento.nombre} [{self.estado}]"


# ─── Pago Categoría ───────────────────────────────────────────────────────────

class PagoCategoria(BaseModel):
    """Registro de pago de categorías por participante."""

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        APROBADO  = "aprobado",  "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"

    pago_full_pass     = models.ForeignKey(
        PagoFullPass,
        on_delete=models.CASCADE,
        related_name="pagos_categoria",
    )
    inscripcion        = models.OneToOneField(
        Inscripcion,
        on_delete=models.CASCADE,
        related_name="pago_categoria",
        null=True, blank=True,
    )
    comprobante_imagen = models.ImageField(upload_to="comprobantes/categorias/", null=True, blank=True)
    numero_comprobante = models.CharField(max_length=100, blank=True, default="")
    estado             = models.CharField(
        max_length=15,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
    )
    nota_rechazo       = models.TextField(blank=True, default="")

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"PagoCategoria {self.id} — {self.pago_full_pass.cedula} [{self.estado}]"


# ─── Bloque Horario (Modo 1 agenda) ───────────────────────────────────────────

class BloqueHorario(BaseModel):
    """Franja horaria disponible para el evento (usada en generación automática de agenda)."""
    evento      = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name="bloques_horario",
    )
    fecha       = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin    = models.TimeField()
    orden       = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("fecha", "hora_inicio")

    def __str__(self) -> str:
        return f"{self.evento.nombre} | {self.fecha} {self.hora_inicio}–{self.hora_fin}"


# ─── Orden Ritmo Agenda (Modo 2 agenda) ───────────────────────────────────────

class OrdenRitmoAgenda(BaseModel):
    """Orden de presentación de ritmos y modalidades para generación de agenda."""
    evento    = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name="ordenes_ritmo",
    )
    ritmo     = models.CharField(max_length=100)
    modalidad = models.CharField(
        max_length=20,
        choices=CategoriaRitmo.Modalidad.choices,
    )
    orden     = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ("evento", "orden")
        constraints = [
            models.UniqueConstraint(
                fields=("evento", "ritmo", "modalidad"),
                name="uq_orden_ritmo_por_evento",
            ),
        ]

    def __str__(self) -> str:
        return f"#{self.orden} {self.ritmo} {self.modalidad} — {self.evento.nombre}"
