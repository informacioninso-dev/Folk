from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import (
    BloqueHorario,
    SiteConfig,
    Calificacion,
    CategoriaRitmo,
    Cronograma,
    CriterioEvaluacion,
    Evento,
    FullPassConfig,
    Grupo,
    Inscripcion,
    ItemCronograma,
    Juez,
    OrdenRitmoAgenda,
    Organizador,
    PagoCategoria,
    PagoFullPass,
    Pareja,
    Participante,
    ParticipanteGeneral,
    Ranking,
)
from .tasks import send_inscripcion_confirmada_email, send_registro_pendiente_email

User = get_user_model()


# ─── Organizador ──────────────────────────────────────────────────────────────

class OrganizadorSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()

    def get_username(self, obj):
        return obj.usuario.username if obj.usuario else None

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url

    class Meta:
        model = Organizador
        fields = (
            "id",
            "usuario",
            "username",
            "nombre",
            "nit_ruc",
            "email_contacto",
            "logo",
            "logo_url",
            "direccion",
            "descripcion",
            "sitio_web",
            "telefono",
            "max_eventos",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "usuario", "username", "logo_url", "created_at", "updated_at")
        extra_kwargs = {"logo": {"write_only": True, "required": False}}


class OrganizadorCreateSerializer(serializers.Serializer):
    """Superadmin: crea Organizador + User Django en un solo paso."""
    nombre = serializers.CharField(max_length=150)
    nit_ruc = serializers.CharField(max_length=32)
    email_contacto = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("El nombre de usuario ya está en uso.")
        return value

    def validate_nit_ruc(self, value):
        if Organizador.objects.filter(nit_ruc=value).exists():
            raise serializers.ValidationError("Ya existe un organizador con ese NIT/RUC.")
        return value

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data["username"],
                email=validated_data["email_contacto"],
                password=validated_data["password"],
            )
            organizador = Organizador.objects.create(
                usuario=user,
                nombre=validated_data["nombre"],
                nit_ruc=validated_data["nit_ruc"],
                email_contacto=validated_data["email_contacto"],
            )
        return organizador


# ─── Evento ───────────────────────────────────────────────────────────────────

class EventoSerializer(serializers.ModelSerializer):
    banner_url = serializers.SerializerMethodField()

    def get_banner_url(self, obj):
        if not obj.banner:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.banner.url) if request else obj.banner.url

    class Meta:
        model = Evento
        fields = (
            "id",
            "organizador",
            "nombre",
            "fecha",
            "ubicacion",
            "activo",
            "slug",
            "estado",
            "banner",
            "banner_url",
            "descripcion_portal",
            "portal_activo",
            "destacado",
            "pago_folk_confirmado",
            "monto_folk",
            "notas_pago",
            "permitir_multimodalidad",
            "categorias_tienen_costo",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "banner_url", "created_at", "updated_at")
        extra_kwargs = {"banner": {"write_only": True, "required": False}}


# ─── Categoría y Participante ─────────────────────────────────────────────────

class CategoriaRitmoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaRitmo
        fields = (
            "id",
            "evento",
            "nombre_ritmo",
            "modalidad",
            "edad_min",
            "edad_max",
            "precio_adicional",
            "incluido_full_pass",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ParticipanteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participante
        fields = (
            "id",
            "nombre_completo",
            "identificacion",
            "edad",
            "email",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


# ─── Inscripción ──────────────────────────────────────────────────────────────

class InscripcionSerializer(serializers.ModelSerializer):
    participantes = ParticipanteSerializer(many=True)

    class Meta:
        model = Inscripcion
        fields = (
            "id",
            "categoria_ritmo",
            "nombre_acto",
            "academia",
            "estado_pago",
            "estado_inscripcion",
            "nota_rechazo",
            "foto_url",
            "pista_musical_url",
            "comprobante_categoria_url",
            "puntaje_final",
            "participantes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "puntaje_final", "created_at", "updated_at")

    def validate_participantes(self, value):
        identificaciones = [item["identificacion"] for item in value]
        if len(identificaciones) != len(set(identificaciones)):
            raise serializers.ValidationError(
                "No se permiten participantes duplicados dentro de la misma inscripcion."
            )
        return value

    def create(self, validated_data):
        participantes_data = validated_data.pop("participantes", [])
        with transaction.atomic():
            inscripcion = Inscripcion.objects.create(**validated_data)
            for participante_data in participantes_data:
                Participante.objects.create(inscripcion=inscripcion, **participante_data)
            transaction.on_commit(
                lambda: send_inscripcion_confirmada_email.delay(inscripcion.id)
            )
        return inscripcion

    def update(self, instance, validated_data):
        participantes_data = validated_data.pop("participantes", None)
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            if participantes_data is not None:
                instance.participantes.all().delete()
                for participante_data in participantes_data:
                    Participante.objects.create(inscripcion=instance, **participante_data)
        return instance


# ─── Juez y Criterio ──────────────────────────────────────────────────────────

class JuezSerializer(serializers.ModelSerializer):
    usuario_email = serializers.EmailField(source="usuario.email", read_only=True)
    categorias = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CategoriaRitmo.objects.all(),
        required=False,
    )
    categorias_detalle = serializers.SerializerMethodField()

    def get_categorias_detalle(self, obj):
        try:
            return [
                {"id": c.id, "nombre_ritmo": c.nombre_ritmo, "modalidad": c.modalidad}
                for c in obj.categorias.all()
            ]
        except Exception:
            return []

    def validate(self, attrs):
        # Ensure all assigned categories belong to the same event as the judge
        evento = attrs.get("evento", getattr(self.instance, "evento", None))
        categorias = attrs.get("categorias")
        if evento and categorias:
            for cat in categorias:
                if cat.evento_id != evento.id:
                    raise serializers.ValidationError(
                        {"categorias": f"La categoría '{cat}' no pertenece a este evento."}
                    )
        return attrs

    def create(self, validated_data):
        categorias = validated_data.pop("categorias", [])
        juez = Juez.objects.create(**validated_data)
        if categorias:
            juez.categorias.set(categorias)
        return juez

    def update(self, instance, validated_data):
        categorias = validated_data.pop("categorias", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if categorias is not None:
            instance.categorias.set(categorias)
        return instance

    class Meta:
        model = Juez
        fields = (
            "id",
            "usuario",
            "usuario_email",
            "evento",
            "categorias",
            "categorias_detalle",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "usuario_email", "categorias_detalle", "created_at", "updated_at")


class CriterioEvaluacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriterioEvaluacion
        fields = (
            "id",
            "evento",
            "nombre",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


# ─── Ranking ──────────────────────────────────────────────────────────────────

class RankingInscripcionSerializer(serializers.ModelSerializer):
    posicion = serializers.IntegerField(read_only=True)
    participantes = ParticipanteSerializer(many=True, read_only=True)
    desglose = serializers.SerializerMethodField()

    class Meta:
        model = Inscripcion
        fields = (
            "posicion",
            "id",
            "nombre_acto",
            "puntaje_final",
            "estado_pago",
            "participantes",
            "desglose",
        )

    def get_desglose(self, obj):
        from django.db.models import Avg
        return list(
            obj.calificaciones
            .values("criterio__nombre")
            .annotate(promedio=Avg("puntaje"))
            .order_by("criterio__nombre")
        )


# ─── Calificación ─────────────────────────────────────────────────────────────

class CalificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Calificacion
        fields = (
            "id",
            "juez",
            "inscripcion",
            "criterio",
            "puntaje",
            "comentario",
            "bloqueada",
            "feedback_audio_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "bloqueada", "created_at", "updated_at")

    def validate(self, attrs):
        juez = attrs.get("juez", getattr(self.instance, "juez", None))
        inscripcion = attrs.get("inscripcion", getattr(self.instance, "inscripcion", None))
        criterio = attrs.get("criterio", getattr(self.instance, "criterio", None))

        if not juez or not inscripcion or not criterio:
            return attrs

        evento_inscripcion_id = inscripcion.categoria_ritmo.evento_id

        if juez.evento_id != evento_inscripcion_id:
            raise serializers.ValidationError(
                {"juez": "El juez debe pertenecer al mismo evento de la inscripcion."}
            )
        if criterio.evento_id != evento_inscripcion_id:
            raise serializers.ValidationError(
                {"criterio": "El criterio debe pertenecer al mismo evento de la inscripcion."}
            )
        return attrs


# ─── Públicos (sin autenticación) ─────────────────────────────────────────────

class EventoPublicoSerializer(serializers.ModelSerializer):
    """Info del evento para la página pública de inscripción."""
    categorias = serializers.SerializerMethodField()

    class Meta:
        model = Evento
        fields = ("id", "nombre", "fecha", "ubicacion", "categorias")

    def get_categorias(self, obj):
        return CategoriaRitmoSerializer(obj.categorias_ritmo.all(), many=True).data


class EventoPortalSerializer(serializers.ModelSerializer):
    """Info completa del portal público de un evento."""
    banner_url    = serializers.SerializerMethodField()
    organizador_nombre = serializers.CharField(source="organizador.nombre", read_only=True)
    full_pass     = serializers.SerializerMethodField()
    categorias    = serializers.SerializerMethodField()
    ranking_revelado = serializers.SerializerMethodField()

    def get_banner_url(self, obj):
        if not obj.banner:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.banner.url) if request else obj.banner.url

    def get_full_pass(self, obj):
        try:
            fp = obj.full_pass_config
            return {
                "nombre": fp.nombre,
                "precio": str(fp.precio),
                "es_requerido": fp.es_requerido,
            }
        except FullPassConfig.DoesNotExist:
            return None

    def get_categorias(self, obj):
        return CategoriaRitmoSerializer(obj.categorias_ritmo.all(), many=True).data

    def get_ranking_revelado(self, obj):
        try:
            return obj.ranking.estado == "publicado"
        except Exception:
            return False

    class Meta:
        model = Evento
        fields = (
            "id", "slug", "nombre", "fecha", "ubicacion",
            "organizador_nombre", "banner_url", "descripcion_portal",
            "full_pass", "categorias", "ranking_revelado",
        )


class EventoHomepageSerializer(serializers.ModelSerializer):
    """Serializer ligero para homepage — listado y slider."""
    banner_url = serializers.SerializerMethodField()
    organizador_nombre = serializers.CharField(source="organizador.nombre", read_only=True)

    def get_banner_url(self, obj):
        if not obj.banner:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.banner.url) if request else obj.banner.url

    class Meta:
        model = Evento
        fields = (
            "id", "slug", "nombre", "fecha", "ubicacion",
            "organizador_nombre", "banner_url", "destacado", "estado",
        )


class RegistroPublicoSerializer(serializers.Serializer):
    """Inscripción pública sin autenticación."""
    categoria_ritmo = serializers.PrimaryKeyRelatedField(
        queryset=CategoriaRitmo.objects.all()
    )
    nombre_acto = serializers.CharField(max_length=150)
    participantes = ParticipanteSerializer(many=True)

    def validate_participantes(self, value):
        if not value:
            raise serializers.ValidationError("Debe incluir al menos un participante.")
        ids = [p["identificacion"] for p in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Identificaciones duplicadas.")
        return value

    def create(self, validated_data):
        participantes_data = validated_data.pop("participantes")
        with transaction.atomic():
            inscripcion = Inscripcion.objects.create(**validated_data)
            for p in participantes_data:
                Participante.objects.create(inscripcion=inscripcion, **p)
            transaction.on_commit(
                lambda: send_inscripcion_confirmada_email.delay(inscripcion.id)
            )
        return inscripcion


# ─── Registro General Público ─────────────────────────────────────────────────

class RegistroGeneralPublicoSerializer(serializers.Serializer):
    """Registro público de ParticipanteGeneral sin autenticación."""
    nombre_completo      = serializers.CharField(max_length=150)
    cedula               = serializers.CharField(max_length=32)
    edad                 = serializers.IntegerField(min_value=1, max_value=120)
    correo_electronico   = serializers.EmailField()
    telefono             = serializers.CharField(max_length=30)
    comprobante_pago_url = serializers.URLField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        evento = self.context["evento"]
        if ParticipanteGeneral.objects.filter(evento=evento, cedula=attrs["cedula"]).exists():
            raise serializers.ValidationError(
                {"cedula": "Ya existe un registro con esa cédula para este evento."}
            )
        return attrs

    def create(self, validated_data):
        evento = self.context["evento"]
        with transaction.atomic():
            pg = ParticipanteGeneral.objects.create(evento=evento, **validated_data)
            transaction.on_commit(
                lambda: send_registro_pendiente_email.delay(pg.id)
            )
        return pg


# ─── Inscripción por modalidad (M2) ───────────────────────────────────────────

class InscripcionModalidadSerializer(serializers.Serializer):
    """Crea Inscripcion + Pareja/Grupo según la modalidad de la categoría."""
    categoria_ritmo            = serializers.PrimaryKeyRelatedField(queryset=CategoriaRitmo.objects.all())
    nombre_acto                = serializers.CharField(max_length=150)
    academia                   = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    foto_url                   = serializers.URLField(required=False, allow_blank=True, default="")
    pista_musical_url          = serializers.URLField(required=False, allow_blank=True, default="")
    comprobante_categoria_url  = serializers.URLField(required=False, allow_blank=True, default="")
    # Solista / Pareja
    cedula_1                   = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")
    cedula_2                   = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")
    # Grupo
    cedulas                    = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    # Representante (pareja y grupo)
    representante              = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    cedula_representante       = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")

    def _get_pg(self, evento, cedula, field_name):
        try:
            return ParticipanteGeneral.objects.get(
                evento=evento, cedula=cedula, estado=ParticipanteGeneral.Estado.ACTIVO
            )
        except ParticipanteGeneral.DoesNotExist:
            raise serializers.ValidationError(
                {field_name: f"No se encontró un participante activo con cédula {cedula}."}
            )

    def validate(self, attrs):
        evento    = self.context["evento"]
        modalidad = attrs["categoria_ritmo"].modalidad

        if modalidad == CategoriaRitmo.Modalidad.PAREJA:
            c1, c2 = attrs.get("cedula_1", ""), attrs.get("cedula_2", "")
            if not c1 or not c2:
                raise serializers.ValidationError("Se requieren dos cédulas para modalidad pareja.")
            if c1 == c2:
                raise serializers.ValidationError("Las dos cédulas no pueden ser iguales.")
            attrs["_pg1"] = self._get_pg(evento, c1, "cedula_1")
            attrs["_pg2"] = self._get_pg(evento, c2, "cedula_2")

        elif modalidad == CategoriaRitmo.Modalidad.GRUPO:
            cedulas = attrs.get("cedulas", [])
            if len(cedulas) < 3:
                raise serializers.ValidationError("Un grupo requiere al menos 3 participantes.")
            if len(cedulas) != len(set(cedulas)):
                raise serializers.ValidationError("Hay cédulas duplicadas en el grupo.")
            pgs = list(ParticipanteGeneral.objects.filter(
                evento=evento, cedula__in=cedulas, estado=ParticipanteGeneral.Estado.ACTIVO
            ))
            if len(pgs) != len(cedulas):
                raise serializers.ValidationError("Algunos participantes no están registrados o aprobados.")
            attrs["_pgs"] = pgs

        return attrs

    def create(self, validated_data):
        categoria = validated_data["categoria_ritmo"]
        modalidad = categoria.modalidad

        with transaction.atomic():
            inscripcion = Inscripcion.objects.create(
                categoria_ritmo           = categoria,
                nombre_acto               = validated_data["nombre_acto"],
                academia                  = validated_data.get("academia", ""),
                foto_url                  = validated_data.get("foto_url", ""),
                pista_musical_url         = validated_data.get("pista_musical_url", ""),
                comprobante_categoria_url = validated_data.get("comprobante_categoria_url", ""),
            )

            if modalidad == CategoriaRitmo.Modalidad.PAREJA:
                Pareja.objects.create(
                    inscripcion          = inscripcion,
                    nombre               = validated_data["nombre_acto"],
                    representante        = validated_data.get("representante", ""),
                    cedula_representante = validated_data.get("cedula_representante", ""),
                    academia             = validated_data.get("academia", ""),
                    participante_1       = validated_data["_pg1"],
                    participante_2       = validated_data["_pg2"],
                )
            elif modalidad == CategoriaRitmo.Modalidad.GRUPO:
                grupo = Grupo.objects.create(
                    inscripcion          = inscripcion,
                    nombre               = validated_data["nombre_acto"],
                    representante        = validated_data.get("representante", ""),
                    cedula_representante = validated_data.get("cedula_representante", ""),
                    academia             = validated_data.get("academia", ""),
                )
                grupo.participantes.set(validated_data["_pgs"])

            transaction.on_commit(
                lambda: send_inscripcion_confirmada_email.delay(inscripcion.id)
            )

        return inscripcion


# ─── Participante General ─────────────────────────────────────────────────────

class ParticipanteGeneralSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ParticipanteGeneral
        fields = (
            "id", "evento", "nombre_completo", "cedula", "edad",
            "correo_electronico", "telefono", "comprobante_pago_url",
            "estado", "nota_rechazo", "created_at", "updated_at",
        )
        read_only_fields = ("id", "estado", "nota_rechazo", "created_at", "updated_at")


# ─── Grupo y Pareja ───────────────────────────────────────────────────────────

class GrupoSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Grupo
        fields = (
            "id", "inscripcion", "nombre", "representante",
            "cedula_representante", "academia", "participantes",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ParejaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Pareja
        fields = (
            "id", "inscripcion", "nombre", "representante",
            "cedula_representante", "academia",
            "participante_1", "participante_2",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


# ─── Ranking ──────────────────────────────────────────────────────────────────

class RankingSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Ranking
        fields = ("id", "evento", "estado", "publicado_en", "created_at", "updated_at")
        read_only_fields = ("id", "publicado_en", "created_at", "updated_at")


# ─── Cronograma ───────────────────────────────────────────────────────────────

class ItemCronogramaSerializer(serializers.ModelSerializer):
    nombre_acto   = serializers.CharField(source="inscripcion.nombre_acto", read_only=True, default=None)
    duracion_min  = serializers.SerializerMethodField()

    def get_duracion_min(self, obj):
        """Duración calculada en minutos desde hora_inicio/hora_fin si existen."""
        if obj.hora_inicio and obj.hora_fin:
            from datetime import datetime, date
            inicio = datetime.combine(date.today(), obj.hora_inicio)
            fin    = datetime.combine(date.today(), obj.hora_fin)
            diff   = (fin - inicio).total_seconds()
            return round(diff / 60, 1) if diff > 0 else 0
        return round(obj.duracion_segundos / 60, 1) if obj.duracion_segundos else 0

    class Meta:
        model  = ItemCronograma
        fields = (
            "id", "cronograma", "orden",
            "titulo", "responsable", "descripcion",
            "fecha", "hora_inicio", "hora_fin", "duracion_min",
            "inscripcion", "nombre_acto",
            "duracion_segundos", "tiempo_extra",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "nombre_acto", "duracion_min", "created_at", "updated_at")


class CronogramaSerializer(serializers.ModelSerializer):
    items = ItemCronogramaSerializer(many=True, read_only=True)

    class Meta:
        model  = Cronograma
        fields = ("id", "evento", "items", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


# ─── Full Pass Config ──────────────────────────────────────────────────────────

class FullPassConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FullPassConfig
        fields = ("id", "evento", "nombre", "precio", "es_requerido", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


# ─── Pago Full Pass ────────────────────────────────────────────────────────────

class PagoFullPassSerializer(serializers.ModelSerializer):
    comprobante_imagen_url = serializers.SerializerMethodField()

    def get_comprobante_imagen_url(self, obj):
        if not obj.comprobante_imagen:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.comprobante_imagen.url) if request else obj.comprobante_imagen.url

    class Meta:
        model  = PagoFullPass
        fields = (
            "id", "evento", "cedula", "nombre_completo",
            "correo_electronico", "telefono",
            "comprobante_imagen", "comprobante_imagen_url",
            "numero_comprobante", "estado", "nota_rechazo",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "estado", "nota_rechazo", "comprobante_imagen_url", "created_at", "updated_at")
        extra_kwargs = {"comprobante_imagen": {"write_only": True, "required": False}}


class PagoFullPassPublicoSerializer(serializers.Serializer):
    """Para que el participante registre/actualice su pago de Full Pass."""
    cedula             = serializers.CharField(max_length=32)
    nombre_completo    = serializers.CharField(max_length=150)
    correo_electronico = serializers.EmailField()
    telefono           = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    comprobante_imagen = serializers.ImageField(required=False)
    numero_comprobante = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")

    def validate(self, attrs):
        evento = self.context["evento"]
        cedula = attrs["cedula"]
        # Si ya existe un pago aprobado, no permitir duplicado
        existente = PagoFullPass.objects.filter(evento=evento, cedula=cedula).first()
        if existente and existente.estado == PagoFullPass.Estado.APROBADO:
            raise serializers.ValidationError(
                {"cedula": "Esta cédula ya tiene un Full Pass aprobado para este evento."}
            )
        attrs["_existente"] = existente
        return attrs

    def create(self, validated_data):
        evento     = self.context["evento"]
        existente  = validated_data.pop("_existente")
        if existente:
            # Reenvío de comprobante (si fue rechazado)
            for field in ("comprobante_imagen", "numero_comprobante", "nombre_completo",
                          "correo_electronico", "telefono"):
                if field in validated_data:
                    setattr(existente, field, validated_data[field])
            existente.estado = PagoFullPass.Estado.PENDIENTE
            existente.nota_rechazo = ""
            existente.save()
            return existente
        return PagoFullPass.objects.create(evento=evento, **validated_data)


# ─── Pago Categoría ───────────────────────────────────────────────────────────

class PagoCategoriaSerializer(serializers.ModelSerializer):
    comprobante_imagen_url = serializers.SerializerMethodField()

    def get_comprobante_imagen_url(self, obj):
        if not obj.comprobante_imagen:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.comprobante_imagen.url) if request else obj.comprobante_imagen.url

    class Meta:
        model  = PagoCategoria
        fields = (
            "id", "pago_full_pass", "inscripcion",
            "comprobante_imagen", "comprobante_imagen_url",
            "numero_comprobante", "estado", "nota_rechazo",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "estado", "nota_rechazo", "comprobante_imagen_url", "created_at", "updated_at")
        extra_kwargs = {"comprobante_imagen": {"write_only": True, "required": False}}


# ─── Bloque Horario ───────────────────────────────────────────────────────────

class BloqueHorarioSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BloqueHorario
        fields = ("id", "evento", "fecha", "hora_inicio", "hora_fin", "orden", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


# ─── Orden Ritmo Agenda ───────────────────────────────────────────────────────

class OrdenRitmoAgendaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OrdenRitmoAgenda
        fields = ("id", "evento", "ritmo", "modalidad", "orden", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


# ─── Mi Agenda pública ────────────────────────────────────────────────────────

class MiAgendaItemSerializer(serializers.ModelSerializer):
    ritmo     = serializers.CharField(source="inscripcion.categoria_ritmo.nombre_ritmo", read_only=True, default=None)
    modalidad = serializers.CharField(source="inscripcion.categoria_ritmo.modalidad", read_only=True, default=None)
    nombre_acto = serializers.CharField(source="inscripcion.nombre_acto", read_only=True, default=None)

    class Meta:
        model  = ItemCronograma
        fields = (
            "id", "orden", "titulo", "fecha",
            "hora_inicio", "hora_fin",
            "ritmo", "modalidad", "nombre_acto",
        )


# ─── SiteConfig ───────────────────────────────────────────────────────────────

class SiteConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SiteConfig
        fields = ("whatsapp_numero", "whatsapp_mensaje")


# ─── Ranking público por categoría ───────────────────────────────────────────

class RankingCategoriaPublicoSerializer(serializers.ModelSerializer):
    """Top 3 de una categoría para el portal público (solo si el ranking está revelado)."""
    posicion = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Inscripcion
        fields = ("posicion", "nombre_acto", "puntaje_final")
