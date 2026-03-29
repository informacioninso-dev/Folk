import os
import secrets
import uuid

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.files.storage import FileSystemStorage
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail, get_connection
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

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
from .query_helpers import get_inscripciones_for_cedula
from .serializers import (
    BloqueHorarioSerializer,
    SiteConfigSerializer,
    CalificacionSerializer,
    CategoriaRitmoSerializer,
    CriterioEvaluacionSerializer,
    EventoHomepageSerializer,
    EventoPortalSerializer,
    EventoPublicoSerializer,
    EventoSerializer,
    FullPassConfigSerializer,
    InscripcionModalidadSerializer,
    InscripcionSerializer,
    JuezSerializer,
    MiAgendaItemSerializer,
    OrdenRitmoAgendaSerializer,
    OrganizadorCreateSerializer,
    OrganizadorSerializer,
    CronogramaSerializer,
    GrupoSerializer,
    ItemCronogramaSerializer,
    PagoCategoriaSerializer,
    PagoFullPassPublicoSerializer,
    PagoFullPassSerializer,
    ParejaSerializer,
    ParticipanteGeneralSerializer,
    ParticipanteSerializer,
    RankingCategoriaPublicoSerializer,
    RankingInscripcionSerializer,
    RankingSerializer,
    RegistroCategoriaPortalSerializer,
    RegistroGeneralPublicoSerializer,
    RegistroPublicoSerializer,
)


# ─── Email helpers ───────────────────────────────────────────────────────────

def _get_email_connection_and_from():
    """Returns (connection, from_email) using SiteConfig if configured, else None/default."""
    config = SiteConfig.get()
    if config.email_host:
        conn = get_connection(
            host=config.email_host,
            port=config.email_port,
            username=config.email_host_user,
            password=config.email_host_password,
            use_tls=config.email_use_tls,
            fail_silently=False,
        )
        from_email = config.email_from or config.email_host_user or settings.DEFAULT_FROM_EMAIL
        return conn, from_email
    return None, settings.DEFAULT_FROM_EMAIL


def folk_send_mail(subject, message, recipient_list, html_message=None):
    connection, from_email = _get_email_connection_and_from()
    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=recipient_list,
        html_message=html_message,
        connection=connection,
        fail_silently=False,
    )


# ─── JWT personalizado con claims extra ──────────────────────────────────────

class FolkTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["is_staff"] = user.is_staff
        token["email"] = user.email
        try:
            token["organizador_id"] = user.organizador.id
        except Exception:
            token["organizador_id"] = None
        # Participante claim
        participante_ids = list(
            user.participaciones.values_list("id", flat=True)
        )
        token["is_participante"] = len(participante_ids) > 0
        token["participante_ids"] = participante_ids
        token["is_juez"] = Juez.objects.filter(usuario=user).exists()
        return token


class FolkTokenObtainPairView(TokenObtainPairView):
    serializer_class = FolkTokenObtainPairSerializer


# ─── /me/ ────────────────────────────────────────────────────────────────────

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        organizador_id = None
        try:
            organizador_id = user.organizador.id
        except Exception:
            pass
        participaciones = list(
            user.participaciones.select_related("evento").values(
                "id", "nombre_completo", "estado",
                "evento_id", "evento__nombre", "evento__slug",
            )
        )
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "organizador_id": organizador_id,
            "is_participante": len(participaciones) > 0,
            "participaciones": participaciones,
        })


# ─── Helpers de multi-tenancy ─────────────────────────────────────────────────

def _get_organizador(user):
    """Retorna el Organizador del usuario (propietario o miembro del equipo)."""
    try:
        return user.organizador
    except Exception:
        pass
    # Miembro del equipo
    org = Organizador.objects.filter(miembros=user).first()
    return org


def _scope_queryset_to_event(qs, user, *, event_lookup="evento", allow_judge=False):
    """Aplica multi-tenancy por evento para lecturas."""
    if user.is_staff:
        return qs

    org = _get_organizador(user)
    if org:
        return qs.filter(**{f"{event_lookup}__organizador": org}).distinct()

    if allow_judge:
        return qs.filter(**{f"{event_lookup}__jueces__usuario": user}).distinct()

    return qs.none()


def _ensure_event_owner(user, evento, detail="Sin permiso para gestionar este recurso."):
    """Permite mutaciones solo al staff o al organizador dueño del evento."""
    if user.is_staff:
        return

    org = _get_organizador(user)
    if org and evento.organizador_id == org.id:
        return

    raise PermissionDenied(detail)


def _ensure_juez_owner(user, juez, detail="Solo el juez asignado puede modificar este recurso."):
    if user.is_staff or juez.usuario_id == user.id:
        return
    raise PermissionDenied(detail)


def _ensure_same_event(cronograma, inscripcion):
    if inscripcion and inscripcion.categoria_ritmo.evento_id != cronograma.evento_id:
        raise ValidationError(
            {"inscripcion": "La inscripción no pertenece al evento del cronograma."}
        )


MIN_PUBLIC_LOOKUP_LENGTH = 6

PUBLIC_UPLOAD_RULES = {
    "photo": {
        "extensions": {".jpg", ".jpeg", ".png", ".webp"},
        "content_types": {"image/jpeg", "image/png", "image/webp"},
        "max_bytes": 10 * 1024 * 1024,
        "folder": "uploads/photo",
    },
    "audio": {
        "extensions": {".mp3", ".wav", ".m4a", ".ogg"},
        "content_types": {
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/wave",
            "audio/vnd.wave",
            "audio/mp4",
            "audio/x-m4a",
            "audio/aac",
            "audio/ogg",
        },
        "max_bytes": 25 * 1024 * 1024,
        "folder": "uploads/audio",
    },
    "comprobante": {
        "extensions": {".jpg", ".jpeg", ".png", ".webp", ".pdf"},
        "content_types": {
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        },
        "max_bytes": 10 * 1024 * 1024,
        "folder": "uploads/comprobante",
    },
}


class MethodScopedThrottleMixin:
    throttle_classes = [ScopedRateThrottle]
    throttle_scope_map = {}

    def get_throttles(self):
        scope = self.throttle_scope_map.get(self.request.method.lower())
        if scope:
            self.throttle_scope = scope
        return super().get_throttles()


def _normalize_public_lookup_value(value):
    return (value or "").strip()


def _validate_public_lookup_value(value, *, field_name="cedula"):
    if len(value) < MIN_PUBLIC_LOOKUP_LENGTH:
        raise ValidationError(
            {field_name: f"Ingresa al menos {MIN_PUBLIC_LOOKUP_LENGTH} caracteres."}
        )
    return value


def _mask_public_name(value):
    parts = [part for part in (value or "").split() if part]
    if not parts:
        return ""
    return " ".join(part[0] + ("*" * max(len(part) - 1, 0)) for part in parts)


def _validate_public_upload(file, kind):
    rule = PUBLIC_UPLOAD_RULES.get(kind)
    if not rule:
        raise ValidationError({"kind": "Tipo de archivo no permitido."})

    ext = os.path.splitext(file.name)[1].lower()
    if ext not in rule["extensions"]:
        raise ValidationError(
            {"file": "La extensión del archivo no está permitida para este tipo."}
        )

    content_type = (getattr(file, "content_type", "") or "").lower()
    if content_type not in rule["content_types"]:
        raise ValidationError(
            {"file": "El tipo de archivo no está permitido para este upload."}
        )

    if file.size > rule["max_bytes"]:
        max_mb = rule["max_bytes"] // (1024 * 1024)
        raise ValidationError(
            {"file": f"El archivo excede el límite de {max_mb} MB."}
        )

    return rule, ext


# ─── ViewSets ────────────────────────────────────────────────────────────────

class OrganizadorViewSet(viewsets.ModelViewSet):
    queryset = Organizador.objects.select_related("usuario").all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "crear_cliente":
            return OrganizadorCreateSerializer
        return OrganizadorSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Superadmin ve todos; organizador solo se ve a sí mismo
        if not self.request.user.is_staff:
            org = _get_organizador(self.request.user)
            return qs.filter(pk=org.pk) if org else qs.none()
        return qs

    @action(
        detail=False,
        methods=["post"],
        url_path="crear-cliente",
        permission_classes=[IsAdminUser],
    )
    def crear_cliente(self, request):
        serializer = OrganizadorCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organizador = serializer.save()
        return Response(
            OrganizadorSerializer(organizador).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="reset-password",
        permission_classes=[IsAdminUser],
    )
    def reset_password(self, request, pk=None):
        org = self.get_object()
        if not org.usuario:
            return Response(
                {"detail": "Este organizador no tiene usuario asignado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        new_password = secrets.token_urlsafe(10)
        org.usuario.set_password(new_password)
        org.usuario.save(update_fields=["password"])
        return Response({
            "username": org.usuario.username,
            "password": new_password,
        })

    @action(detail=True, methods=["patch"], url_path="set-limite",
            permission_classes=[IsAdminUser])
    def set_limite(self, request, pk=None):
        """Superadmin ajusta el límite de eventos del organizador."""
        org = self.get_object()
        max_ev = request.data.get("max_eventos")
        if max_ev is None or int(max_ev) < 1:
            return Response({"detail": "max_eventos debe ser un número positivo."}, status=400)
        org.max_eventos = int(max_ev)
        org.save(update_fields=["max_eventos"])
        return Response({"id": org.id, "max_eventos": org.max_eventos})

    @action(detail=False, methods=["get"], url_path="mi-equipo")
    def mi_equipo(self, request):
        org = _get_organizador(request.user)
        if not org:
            return Response({"detail": "No es organizador."}, status=status.HTTP_403_FORBIDDEN)
        User = get_user_model()
        miembros = list(org.miembros.all())
        if org.usuario:
            miembros = [org.usuario] + [m for m in miembros if m.pk != org.usuario.pk]
        data = [
            {"id": u.id, "username": u.username, "email": u.email,
             "first_name": u.first_name, "last_name": u.last_name}
            for u in miembros
        ]
        return Response(data)

    @action(detail=False, methods=["post"], url_path="mi-equipo/agregar")
    def mi_equipo_agregar(self, request):
        org = _get_organizador(request.user)
        if not org:
            return Response({"detail": "No es organizador."}, status=status.HTTP_403_FORBIDDEN)
        User = get_user_model()
        username = request.data.get("username", "").strip()
        email    = request.data.get("email", "").strip()
        password = request.data.get("password", "")
        if not username or not password:
            return Response({"detail": "username y password son requeridos."}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"detail": "El nombre de usuario ya existe."}, status=400)
        user = User.objects.create_user(username=username, email=email, password=password)
        org.miembros.add(user)
        return Response({"username": username, "password": password}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path=r"mi-equipo/(?P<user_id>\d+)/reset-password")
    def mi_equipo_reset(self, request, user_id=None):
        org = _get_organizador(request.user)
        if not org:
            return Response({"detail": "No es organizador."}, status=status.HTTP_403_FORBIDDEN)
        User = get_user_model()
        try:
            user = org.miembros.get(pk=user_id)
        except User.DoesNotExist:
            # También puede ser el usuario principal
            if org.usuario and str(org.usuario.pk) == str(user_id):
                user = org.usuario
            else:
                return Response({"detail": "Usuario no pertenece a tu equipo."}, status=404)
        new_password = secrets.token_urlsafe(10)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"username": user.username, "password": new_password})

    @action(detail=False, methods=["delete"], url_path=r"mi-equipo/(?P<user_id>\d+)")
    def mi_equipo_quitar(self, request, user_id=None):
        org = _get_organizador(request.user)
        if not org:
            return Response({"detail": "No es organizador."}, status=status.HTTP_403_FORBIDDEN)
        User = get_user_model()
        try:
            user = org.miembros.get(pk=user_id)
            org.miembros.remove(user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({"detail": "Usuario no encontrado en el equipo."}, status=404)

    @action(detail=False, methods=["get", "patch"], url_path="mi-empresa")
    def mi_empresa(self, request):
        org = _get_organizador(request.user)
        if not org:
            return Response({"detail": "No es organizador."}, status=status.HTTP_403_FORBIDDEN)
        if request.method == "GET":
            serializer = OrganizadorSerializer(org, context={"request": request})
            return Response(serializer.data)
        # PATCH
        serializer = OrganizadorSerializer(
            org, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class EventoViewSet(viewsets.ModelViewSet):
    queryset = Evento.objects.select_related("organizador").all()
    serializer_class = EventoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff:
            organizador_id = self.request.query_params.get("organizador")
            if organizador_id:
                return qs.filter(organizador_id=organizador_id)
            return qs
        org = _get_organizador(self.request.user)
        if org:
            return qs.filter(organizador=org)
        return qs.filter(jueces__usuario=self.request.user)

    def create(self, request, *args, **kwargs):
        if not request.user.is_staff:
            org = _get_organizador(request.user)
            if not org:
                return Response(
                    {"detail": "Solo organizadores o staff pueden crear eventos."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            actuales = Evento.objects.filter(organizador=org).count()
            if actuales >= org.max_eventos:
                return Response(
                    {"detail": f"Límite de {org.max_eventos} evento(s) alcanzado. Contacta a Folk para ampliar tu plan."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        if self.request.user.is_staff:
            serializer.save()
            return
        serializer.save(organizador=_get_organizador(self.request.user))

    def perform_update(self, serializer):
        if self.request.user.is_staff:
            serializer.save()
            return
        serializer.save(organizador=_get_organizador(self.request.user))


    @action(detail=True, methods=["patch"], url_path="pago-folk",
            permission_classes=[IsAdminUser])
    def pago_folk(self, request, pk=None):
        """Superadmin registra/actualiza el cobro Folk por este evento."""
        evento = self.get_object()
        confirmado = request.data.get("pago_folk_confirmado")
        monto      = request.data.get("monto_folk")
        notas      = request.data.get("notas_pago")
        if confirmado is not None:
            evento.pago_folk_confirmado = bool(confirmado)
        if monto is not None:
            evento.monto_folk = monto
        if notas is not None:
            evento.notas_pago = notas
        evento.save(update_fields=["pago_folk_confirmado", "monto_folk", "notas_pago"])
        return Response({
            "id": evento.id,
            "pago_folk_confirmado": evento.pago_folk_confirmado,
            "monto_folk": str(evento.monto_folk) if evento.monto_folk else None,
            "notas_pago": evento.notas_pago,
        })

    @action(detail=True, methods=["post"], url_path="get-or-create-ranking")
    def get_or_create_ranking(self, request, pk=None):
        evento = self.get_object()
        ranking, created = Ranking.objects.get_or_create(evento=evento)
        return Response(
            RankingSerializer(ranking).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="ranking")
    def ranking(self, request, pk=None):
        evento = self.get_object()
        categorias = evento.categorias_ritmo.prefetch_related(
            "inscripciones__participantes",
            "inscripciones__calificaciones__criterio",
        ).all()

        resultado = []
        for categoria in categorias:
            inscripciones = list(
                categoria.inscripciones
                .prefetch_related("participantes", "calificaciones__criterio")
                .order_by("-puntaje_final")
            )
            for pos, ins in enumerate(inscripciones, start=1):
                ins.posicion = pos

            resultado.append({
                "categoria_id": categoria.id,
                "nombre_ritmo": categoria.nombre_ritmo,
                "modalidad": categoria.modalidad,
                "inscripciones": RankingInscripcionSerializer(inscripciones, many=True).data,
            })

        return Response(resultado)


class CategoriaRitmoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaRitmo.objects.select_related("evento").all()
    serializer_class = CategoriaRitmoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        return _scope_queryset_to_event(
            qs, self.request.user, event_lookup="evento", allow_judge=True
        )

    def perform_create(self, serializer):
        evento = serializer.validated_data["evento"]
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_update(self, serializer):
        evento = serializer.validated_data.get("evento", serializer.instance.evento)
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.evento)
        instance.delete()

    @action(detail=True, methods=["get"], url_path="ranking")
    def ranking(self, request, pk=None):
        categoria = self.get_object()
        inscripciones = list(
            categoria.inscripciones
            .prefetch_related("participantes", "calificaciones__criterio")
            .order_by("-puntaje_final")
        )
        for pos, ins in enumerate(inscripciones, start=1):
            ins.posicion = pos

        serializer = RankingInscripcionSerializer(inscripciones, many=True)
        return Response({
            "categoria_id": categoria.id,
            "nombre_ritmo": categoria.nombre_ritmo,
            "modalidad": categoria.modalidad,
            "total": len(inscripciones),
            "inscripciones": serializer.data,
        })


class InscripcionViewSet(viewsets.ModelViewSet):
    queryset = Inscripcion.objects.select_related(
        "categoria_ritmo__evento"
    ).prefetch_related("participantes").all()
    serializer_class = InscripcionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(categoria_ritmo__evento_id=evento_id)
        categoria_id = self.request.query_params.get("categoria_ritmo")
        if categoria_id:
            qs = qs.filter(categoria_ritmo_id=categoria_id)
        estado = self.request.query_params.get("estado_inscripcion")
        if estado:
            qs = qs.filter(estado_inscripcion=estado)
        if not self.request.user.is_staff:
            org = _get_organizador(self.request.user)
            if org:
                qs = qs.filter(categoria_ritmo__evento__organizador=org)
            else:
                qs = qs.filter(
                    categoria_ritmo__evento__jueces__usuario=self.request.user
                )
        return qs.distinct()

    def perform_create(self, serializer):
        evento = serializer.validated_data["categoria_ritmo"].evento
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_update(self, serializer):
        categoria = serializer.validated_data.get(
            "categoria_ritmo", serializer.instance.categoria_ritmo
        )
        _ensure_event_owner(self.request.user, categoria.evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.categoria_ritmo.evento)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="aprobar")
    def aprobar(self, request, pk=None):
        inscripcion = self.get_object()
        _ensure_event_owner(request.user, inscripcion.categoria_ritmo.evento)
        inscripcion.estado_inscripcion = Inscripcion.EstadoInscripcion.APROBADA
        inscripcion.nota_rechazo = ""
        inscripcion.save(update_fields=["estado_inscripcion", "nota_rechazo", "updated_at"])
        return Response(InscripcionSerializer(inscripcion).data)

    @action(detail=True, methods=["post"], url_path="rechazar")
    def rechazar(self, request, pk=None):
        inscripcion = self.get_object()
        _ensure_event_owner(request.user, inscripcion.categoria_ritmo.evento)
        nota = request.data.get("nota", "")
        inscripcion.estado_inscripcion = Inscripcion.EstadoInscripcion.RECHAZADA
        inscripcion.nota_rechazo = nota
        inscripcion.save(update_fields=["estado_inscripcion", "nota_rechazo", "updated_at"])
        return Response(InscripcionSerializer(inscripcion).data)


class ParticipanteViewSet(viewsets.ModelViewSet):
    queryset = Participante.objects.select_related("inscripcion").all()
    serializer_class = ParticipanteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        inscripcion_id = self.request.query_params.get("inscripcion")
        if inscripcion_id:
            qs = qs.filter(inscripcion_id=inscripcion_id)
        return _scope_queryset_to_event(
            qs,
            self.request.user,
            event_lookup="inscripcion__categoria_ritmo__evento",
        )

    def perform_create(self, serializer):
        evento = serializer.validated_data["inscripcion"].categoria_ritmo.evento
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_update(self, serializer):
        inscripcion = serializer.validated_data.get("inscripcion", serializer.instance.inscripcion)
        _ensure_event_owner(self.request.user, inscripcion.categoria_ritmo.evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.inscripcion.categoria_ritmo.evento)
        instance.delete()


class JuezViewSet(viewsets.ModelViewSet):
    queryset = Juez.objects.select_related("usuario", "evento").prefetch_related("categorias").all()
    serializer_class = JuezSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        mi_usuario = self.request.query_params.get("mi_usuario")
        if self.request.user.is_staff:
            if mi_usuario in ("true", "1"):
                qs = qs.filter(usuario=self.request.user)
            return qs.distinct()

        org = _get_organizador(self.request.user)
        if org:
            qs = qs.filter(evento__organizador=org)
            if mi_usuario in ("true", "1"):
                qs = qs.filter(usuario=self.request.user)
            return qs.distinct()

        return qs.filter(usuario=self.request.user).distinct()

    def perform_create(self, serializer):
        evento = serializer.validated_data["evento"]
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_update(self, serializer):
        evento = serializer.validated_data.get("evento", serializer.instance.evento)
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.evento)
        instance.delete()

    @action(detail=False, methods=["get"], url_path="mis-asignaciones")
    def mis_asignaciones(self, request):
        """Devuelve todos los eventos y categorías asignadas al juez autenticado."""
        jueces = (
            Juez.objects
            .filter(usuario=request.user)
            .select_related("evento")
            .prefetch_related("categorias")
        )
        result = []
        for j in jueces:
            cats_data = []
            for cat in j.categorias.all():
                total = cat.inscripciones.count()
                calificadas = (
                    Calificacion.objects
                    .filter(juez=j, inscripcion__categoria_ritmo=cat)
                    .values("inscripcion")
                    .distinct()
                    .count()
                )
                cats_data.append({
                    "id": cat.id,
                    "nombre_ritmo": cat.nombre_ritmo,
                    "modalidad": cat.modalidad,
                    "total_inscripciones": total,
                    "inscripciones_calificadas": calificadas,
                })
            result.append({
                "juez_id": j.id,
                "evento_id": j.evento_id,
                "evento_nombre": j.evento.nombre,
                "evento_fecha": str(j.evento.fecha),
                "evento_ubicacion": j.evento.ubicacion,
                "categorias": cats_data,
            })
        return Response(result)


class CriterioEvaluacionViewSet(viewsets.ModelViewSet):
    queryset = CriterioEvaluacion.objects.select_related("evento").all()
    serializer_class = CriterioEvaluacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        return _scope_queryset_to_event(
            qs, self.request.user, event_lookup="evento", allow_judge=True
        )

    def perform_create(self, serializer):
        evento = serializer.validated_data["evento"]
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_update(self, serializer):
        evento = serializer.validated_data.get("evento", serializer.instance.evento)
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.evento)
        instance.delete()


class CalificacionViewSet(viewsets.ModelViewSet):
    queryset = Calificacion.objects.select_related(
        "juez__usuario", "inscripcion", "criterio"
    ).all()
    serializer_class = CalificacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        inscripcion_id = self.request.query_params.get("inscripcion")
        juez_id        = self.request.query_params.get("juez")
        evento_id      = self.request.query_params.get("evento")
        me             = self.request.query_params.get("me")
        if inscripcion_id:
            qs = qs.filter(inscripcion_id=inscripcion_id)
        if juez_id:
            qs = qs.filter(juez_id=juez_id)
        if evento_id:
            qs = qs.filter(inscripcion__categoria_ritmo__evento_id=evento_id)
        if self.request.user.is_staff:
            if me in ("true", "1"):
                qs = qs.filter(juez__usuario=self.request.user)
            return qs.distinct()

        org = _get_organizador(self.request.user)
        if org:
            qs = qs.filter(inscripcion__categoria_ritmo__evento__organizador=org)
            if me in ("true", "1"):
                qs = qs.filter(juez__usuario=self.request.user)
            return qs.distinct()

        qs = qs.filter(juez__usuario=self.request.user)
        if me in ("true", "1"):
            qs = qs.filter(juez__usuario=self.request.user)
        return qs.distinct()

    def perform_create(self, serializer):
        _ensure_juez_owner(self.request.user, serializer.validated_data["juez"])
        serializer.save()

    def perform_update(self, serializer):
        juez = serializer.validated_data.get("juez", serializer.instance.juez)
        _ensure_juez_owner(self.request.user, juez)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_juez_owner(self.request.user, instance.juez)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="bloquear")
    def bloquear(self, request, pk=None):
        cal = self.get_object()
        try:
            _ensure_event_owner(request.user, cal.inscripcion.categoria_ritmo.evento)
        except PermissionDenied:
            _ensure_juez_owner(request.user, cal.juez)
        # Usar update() para evitar la restricción de save() al bloquear
        Calificacion.objects.filter(pk=cal.pk).update(bloqueada=True)
        cal.refresh_from_db()
        return Response(CalificacionSerializer(cal).data)

    @action(detail=False, methods=["post"], url_path="bloquear-inscripcion")
    def bloquear_inscripcion(self, request):
        inscripcion_id = request.data.get("inscripcion")
        if not inscripcion_id:
            return Response({"detail": "inscripcion requerida."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            inscripcion = Inscripcion.objects.select_related("categoria_ritmo__evento").get(
                pk=inscripcion_id
            )
        except Inscripcion.DoesNotExist:
            return Response({"detail": "Inscripción no encontrada."}, status=404)
        _ensure_event_owner(request.user, inscripcion.categoria_ritmo.evento)
        count = Calificacion.objects.filter(inscripcion_id=inscripcion_id).update(bloqueada=True)
        return Response({"bloqueadas": count})

    @action(detail=True, methods=["post"], url_path="audio")
    def upload_audio(self, request, pk=None):
        cal = self.get_object()
        _ensure_juez_owner(request.user, cal.juez)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No se recibió archivo."}, status=status.HTTP_400_BAD_REQUEST)
        ext = os.path.splitext(file.name)[1].lower() or ".webm"
        filename = f"audio/{uuid.uuid4().hex}{ext}"
        fs = FileSystemStorage()
        saved = fs.save(filename, file)
        url = request.build_absolute_uri(settings.MEDIA_URL + saved)
        Calificacion.objects.filter(pk=cal.pk).update(feedback_audio_url=url)
        cal.refresh_from_db()
        return Response(CalificacionSerializer(cal).data)


# ─── Participante General ────────────────────────────────────────────────────

class ParticipanteGeneralViewSet(viewsets.ModelViewSet):
    queryset = ParticipanteGeneral.objects.select_related("evento").all()
    serializer_class = ParticipanteGeneralSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        if not self.request.user.is_staff:
            org = _get_organizador(self.request.user)
            if org:
                qs = qs.filter(evento__organizador=org)
            elif self.request.user.participaciones.exists():
                # Participante: solo ve sus propias participaciones
                qs = qs.filter(usuario=self.request.user)
            else:
                qs = qs.none()
        estado = self.request.query_params.get("estado")
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    def perform_create(self, serializer):
        _ensure_event_owner(self.request.user, serializer.validated_data["evento"])
        serializer.save()

    def perform_update(self, serializer):
        evento = serializer.validated_data.get("evento", serializer.instance.evento)
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.evento)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="aprobar")
    def aprobar(self, request, pk=None):
        participante = self.get_object()
        _ensure_event_owner(request.user, participante.evento)
        User = get_user_model()

        plain_password = None

        if participante.usuario is None:
            email = participante.correo_electronico
            existing = User.objects.filter(email=email).first()
            if existing:
                participante.usuario = existing
            else:
                plain_password = secrets.token_urlsafe(8)
                # username: cedula (truncated to 150, unique via fallback)
                username = participante.cedula[:150]
                if User.objects.filter(username=username).exists():
                    username = f"{username}_{participante.id}"
                new_user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=plain_password,
                )
                participante.usuario = new_user

        participante.estado = ParticipanteGeneral.Estado.ACTIVO
        participante.nota_rechazo = ""
        participante.save(update_fields=["usuario", "estado", "nota_rechazo", "updated_at"])

        # Enviar email de bienvenida si se creó nueva cuenta
        if plain_password is not None:
            frontend_url = getattr(settings, "FRONTEND_URL", "")
            try:
                folk_send_mail(
                    subject=f"Acceso al portal Folk — {participante.evento.nombre}",
                    message=(
                        f"Hola {participante.nombre_completo},\n\n"
                        f"Tu registro para '{participante.evento.nombre}' ha sido aprobado.\n\n"
                        f"Ya puedes ingresar al portal de participantes:\n"
                        f"{frontend_url}/login\n\n"
                        f"  Usuario: {participante.cedula}\n"
                        f"  Contraseña: {plain_password}\n\n"
                        f"Te recomendamos cambiar tu contraseña después de ingresar.\n"
                        f"Si tienes problemas, usa la opción '¿Olvidaste tu contraseña?'."
                    ),
                    recipient_list=[participante.correo_electronico],
                )
            except Exception:
                pass  # No bloquear la aprobación si falla el correo

        return Response(ParticipanteGeneralSerializer(participante).data)

    @action(detail=True, methods=["post"], url_path="rechazar")
    def rechazar(self, request, pk=None):
        participante = self.get_object()
        _ensure_event_owner(request.user, participante.evento)
        nota = request.data.get("nota", "")
        participante.estado = ParticipanteGeneral.Estado.RECHAZADO
        participante.nota_rechazo = nota
        participante.save(update_fields=["estado", "nota_rechazo", "updated_at"])
        return Response(ParticipanteGeneralSerializer(participante).data)


# ─── Grupo y Pareja ───────────────────────────────────────────────────────────

class GrupoViewSet(viewsets.ModelViewSet):
    queryset = Grupo.objects.prefetch_related("participantes").all()
    serializer_class = GrupoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return _scope_queryset_to_event(
            super().get_queryset(),
            self.request.user,
            event_lookup="inscripcion__categoria_ritmo__evento",
        )

    def perform_create(self, serializer):
        evento = serializer.validated_data["inscripcion"].categoria_ritmo.evento
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_update(self, serializer):
        inscripcion = serializer.validated_data.get("inscripcion", serializer.instance.inscripcion)
        _ensure_event_owner(self.request.user, inscripcion.categoria_ritmo.evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.inscripcion.categoria_ritmo.evento)
        instance.delete()


class ParejaViewSet(viewsets.ModelViewSet):
    queryset = Pareja.objects.select_related("participante_1", "participante_2").all()
    serializer_class = ParejaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return _scope_queryset_to_event(
            super().get_queryset(),
            self.request.user,
            event_lookup="inscripcion__categoria_ritmo__evento",
        )

    def perform_create(self, serializer):
        evento = serializer.validated_data["inscripcion"].categoria_ritmo.evento
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_update(self, serializer):
        inscripcion = serializer.validated_data.get("inscripcion", serializer.instance.inscripcion)
        _ensure_event_owner(self.request.user, inscripcion.categoria_ritmo.evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.inscripcion.categoria_ritmo.evento)
        instance.delete()


# ─── Ranking ─────────────────────────────────────────────────────────────────

class RankingViewSet(viewsets.ModelViewSet):
    queryset = Ranking.objects.select_related("evento").all()
    serializer_class = RankingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            org = _get_organizador(self.request.user)
            if org:
                qs = qs.filter(evento__organizador=org)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        _ensure_event_owner(self.request.user, serializer.validated_data["evento"])
        serializer.save()

    def perform_update(self, serializer):
        evento = serializer.validated_data.get("evento", serializer.instance.evento)
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.evento)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="publicar")
    def publicar(self, request, pk=None):
        from django.utils import timezone
        from .tasks import send_ranking_publicado_email
        ranking = self.get_object()
        _ensure_event_owner(request.user, ranking.evento)
        ranking.estado = Ranking.Estado.PUBLICADO
        ranking.publicado_en = timezone.now()
        ranking.save(update_fields=["estado", "publicado_en", "updated_at"])
        send_ranking_publicado_email.delay(ranking.id)
        return Response(RankingSerializer(ranking).data)


# ─── Cronograma ───────────────────────────────────────────────────────────────

class CronogramaViewSet(viewsets.ModelViewSet):
    queryset = Cronograma.objects.select_related("evento").prefetch_related("items").all()
    serializer_class = CronogramaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        return _scope_queryset_to_event(qs, self.request.user, event_lookup="evento")

    def perform_create(self, serializer):
        _ensure_event_owner(self.request.user, serializer.validated_data["evento"])
        serializer.save()

    def perform_update(self, serializer):
        evento = serializer.validated_data.get("evento", serializer.instance.evento)
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.evento)
        instance.delete()


class ItemCronogramaViewSet(viewsets.ModelViewSet):
    queryset = ItemCronograma.objects.select_related("inscripcion", "cronograma").all()
    serializer_class = ItemCronogramaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        cronograma_id = self.request.query_params.get("cronograma")
        if cronograma_id:
            qs = qs.filter(cronograma_id=cronograma_id)
        return _scope_queryset_to_event(
            qs, self.request.user, event_lookup="cronograma__evento"
        )

    def perform_create(self, serializer):
        cronograma = serializer.validated_data["cronograma"]
        _ensure_event_owner(self.request.user, cronograma.evento)
        _ensure_same_event(cronograma, serializer.validated_data.get("inscripcion"))
        serializer.save()

    def perform_update(self, serializer):
        cronograma = serializer.validated_data.get("cronograma", serializer.instance.cronograma)
        _ensure_event_owner(self.request.user, cronograma.evento)
        inscripcion = serializer.validated_data.get("inscripcion", serializer.instance.inscripcion)
        _ensure_same_event(cronograma, inscripcion)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.cronograma.evento)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="tiempo-extra")
    def tiempo_extra(self, request, pk=None):
        item = self.get_object()
        _ensure_event_owner(request.user, item.cronograma.evento)
        segundos = int(request.data.get("segundos", 30))
        item.tiempo_extra += segundos
        item.save(update_fields=["tiempo_extra", "updated_at"])
        return Response(ItemCronogramaSerializer(item).data)


# ─── Búsqueda de usuarios (para asignar jueces) ──────────────────────────────

class UsuarioBuscarView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff and not _get_organizador(request.user):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        username = request.query_params.get("username", "").strip()
        if len(username) < 2:
            return Response([])
        User = get_user_model()
        users = User.objects.filter(
            username__icontains=username
        ).exclude(is_staff=True).values("id", "username", "email")[:10]
        return Response(list(users))


# ─── Registro público (sin autenticación) ────────────────────────────────────

class RegistroPublicoView(MethodScopedThrottleMixin, APIView):
    permission_classes = [AllowAny]
    throttle_scope_map = {"post": "public_registration"}

    def get(self, request, slug):
        try:
            evento = Evento.objects.prefetch_related("categorias_ritmo").get(
                slug=slug, activo=True
            )
        except Evento.DoesNotExist:
            return Response(
                {"detail": "Evento no encontrado o no est? activo."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(EventoPublicoSerializer(evento, context={"request": request}).data)

    def post(self, request, slug):
        try:
            evento = Evento.objects.get(slug=slug, activo=True)
        except Evento.DoesNotExist:
            return Response(
                {"detail": "Evento no encontrado o no est? activo."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = RegistroPublicoSerializer(
            data=request.data, context={"evento": evento, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        inscripcion = serializer.save()
        return Response(
            {"id": inscripcion.id, "nombre_acto": inscripcion.nombre_acto},
            status=status.HTTP_201_CREATED,
        )


class RankingPublicoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            evento = Evento.objects.get(slug=slug)
        except Evento.DoesNotExist:
            return Response(
                {"detail": "Evento no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            ranking_obj = Ranking.objects.get(
                evento=evento, estado=Ranking.Estado.PUBLICADO
            )
        except Ranking.DoesNotExist:
            return Response(
                {"detail": "El ranking aun no ha sido publicado.", "publicado": False},
                status=status.HTTP_403_FORBIDDEN,
            )

        categorias = evento.categorias_ritmo.prefetch_related(
            "inscripciones__participantes",
            "inscripciones__calificaciones__criterio",
        ).all()

        resultado = []
        for categoria in categorias:
            inscripciones = list(
                categoria.inscripciones
                .prefetch_related("participantes", "calificaciones__criterio")
                .order_by("-puntaje_final")
            )
            for pos, ins in enumerate(inscripciones, start=1):
                ins.posicion = pos
            resultado.append({
                "categoria_id": categoria.id,
                "nombre_ritmo": categoria.nombre_ritmo,
                "modalidad": categoria.modalidad,
                "inscripciones": RankingInscripcionSerializer(inscripciones, many=True).data,
            })

        return Response({
            "evento": {
                "id": evento.id,
                "nombre": evento.nombre,
                "fecha": str(evento.fecha),
                "ubicacion": evento.ubicacion,
            },
            "publicado_en": ranking_obj.publicado_en,
            "publicado": True,
            "categorias": resultado,
        })


class UploadView(MethodScopedThrottleMixin, APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope_map = {"post": "upload_public"}

    def post(self, request):
        file = request.FILES.get("file")
        kind = (request.data.get("kind", "") or "").strip()
        if not file:
            return Response(
                {"detail": "No se recibio ningun archivo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not kind:
            return Response(
                {"detail": "Debes indicar el tipo de archivo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rule, ext = _validate_public_upload(file, kind)
        filename = f"{rule['folder']}/{uuid.uuid4().hex}{ext}"
        fs = FileSystemStorage()
        saved = fs.save(filename, file)
        url = request.build_absolute_uri(settings.MEDIA_URL + saved)
        return Response({"url": url}, status=status.HTTP_201_CREATED)


class RegistroGeneralPublicoView(MethodScopedThrottleMixin, APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope_map = {"post": "public_registration"}

    def get(self, request, slug):
        try:
            evento = Evento.objects.prefetch_related("categorias_ritmo").get(
                slug=slug, activo=True
            )
        except Evento.DoesNotExist:
            return Response(
                {"detail": "Evento no encontrado o no est? activo."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(EventoPublicoSerializer(evento, context={"request": request}).data)

    def post(self, request, slug):
        try:
            evento = Evento.objects.get(slug=slug, activo=True)
        except Evento.DoesNotExist:
            return Response(
                {"detail": "Evento no encontrado o no est? activo."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = RegistroGeneralPublicoSerializer(
            data=request.data, context={"evento": evento, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        pg = serializer.save()
        return Response(
            {"id": pg.id, "nombre_completo": pg.nombre_completo, "estado": pg.estado},
            status=status.HTTP_201_CREATED,
        )


class BuscarParticipanteView(MethodScopedThrottleMixin, APIView):
    permission_classes = [AllowAny]
    throttle_scope_map = {"get": "participant_lookup"}

    def get(self, request, slug):
        cedula = _normalize_public_lookup_value(request.query_params.get("cedula", ""))
        _validate_public_lookup_value(cedula)
        try:
            evento = Evento.objects.get(slug=slug, activo=True)
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        try:
            pg = ParticipanteGeneral.objects.get(
                evento=evento, cedula=cedula, estado=ParticipanteGeneral.Estado.ACTIVO
            )
            return Response({
                "id": pg.id,
                "nombre_completo": _mask_public_name(pg.nombre_completo),
            })
        except ParticipanteGeneral.DoesNotExist:
            return Response(None)


class InscripcionModalidadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            evento = Evento.objects.get(slug=slug, activo=True)
        except Evento.DoesNotExist:
            return Response(
                {"detail": "Evento no encontrado o no está activo."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = InscripcionModalidadSerializer(
            data=request.data, context={"evento": evento, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        inscripcion = serializer.save()
        return Response(
            InscripcionSerializer(inscripcion).data,
            status=status.HTTP_201_CREATED,
        )


# ─── Cronograma público en vivo (M7) ─────────────────────────────────────────

class CronogramaLiveView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            evento = Evento.objects.get(slug=slug, activo=True)
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        try:
            cronograma = Cronograma.objects.prefetch_related(
                "items__inscripcion__categoria_ritmo"
            ).get(evento=evento)
        except Cronograma.DoesNotExist:
            return Response({"detail": "Sin cronograma.", "items": []}, status=status.HTTP_200_OK)

        items = cronograma.items.select_related(
            "inscripcion__categoria_ritmo"
        ).order_by("orden")

        return Response({
            "evento": {"id": evento.id, "nombre": evento.nombre, "slug": evento.slug},
            "cronograma_id": cronograma.id,
            "items": ItemCronogramaSerializer(items, many=True).data,
        })


# ─── Recuperar contraseña ─────────────────────────────────────────────────────

class PasswordResetView(MethodScopedThrottleMixin, APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope_map = {"post": "password_reset"}

    def post(self, request):
        email = request.data.get("email", "").strip()
        if not email:
            return Response({"detail": "El correo es requerido."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        for user in User.objects.filter(email=email, is_active=True):
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
            folk_send_mail(
                subject="Recuperar contraseña - Folk",
                message=(
                    f"Hola {user.username}\n\n"
                    "Haz clic en el siguiente enlace para restablecer tu contraseña:\n"
                    f"{reset_url}\n\n"
                    "El enlace expira en 24 horas.\n"
                    f"Si no solicitaste esto, ignora este mensaje."
                ),
                recipient_list=[email],
            )

        return Response({"detail": "Si el correo est? registrado, recibir?s un enlace."})


class PasswordResetConfirmView(MethodScopedThrottleMixin, APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope_map = {"post": "password_reset_confirm"}

    def post(self, request):
        uid = request.data.get("uid", "")
        token = request.data.get("token", "")
        new_password = request.data.get("new_password", "")

        if not all([uid, token, new_password]):
            return Response({"detail": "Datos incompletos."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        try:
            pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=pk, is_active=True)
        except Exception:
            return Response({"detail": "Enlace invalido."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "El enlace ha expirado o es invalido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Contrasena restablecida exitosamente."})


class SiteConfigView(APIView):
    """GET público / PATCH solo staff."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAdminUser()]

    def get(self, request):
        config = SiteConfig.get()
        return Response(SiteConfigSerializer(config).data)

    def patch(self, request):
        config = SiteConfig.get()
        serializer = SiteConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── Homepage pública — listado y destacados ──────────────────────────────────

class EventosHomepageView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = Evento.objects.filter(
            portal_activo=True,
            pago_folk_confirmado=True,
        ).select_related("organizador").order_by("-destacado", "-fecha")

        destacados = qs.filter(destacado=True)
        todos = qs

        return Response({
            "destacados": EventoHomepageSerializer(destacados, many=True, context={"request": request}).data,
            "eventos": EventoHomepageSerializer(todos, many=True, context={"request": request}).data,
        })


# ─── Portal público del evento ────────────────────────────────────────────────

class EventoPortalView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            evento = Evento.objects.select_related(
                "organizador", "full_pass_config"
            ).prefetch_related("categorias_ritmo").get(slug=slug, portal_activo=True, pago_folk_confirmado=True)
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        return Response(EventoPortalSerializer(evento, context={"request": request}).data)


# ─── Full Pass Config ViewSet (admin) ─────────────────────────────────────────

class FullPassConfigViewSet(viewsets.ModelViewSet):
    queryset = FullPassConfig.objects.select_related("evento").all()
    serializer_class = FullPassConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        if not self.request.user.is_staff:
            org = _get_organizador(self.request.user)
            if org:
                qs = qs.filter(evento__organizador=org)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        _ensure_event_owner(self.request.user, serializer.validated_data["evento"])
        serializer.save()

    def perform_update(self, serializer):
        evento = serializer.validated_data.get("evento", serializer.instance.evento)
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.evento)
        instance.delete()


# ─── Pago Full Pass — portal público ─────────────────────────────────────────

class PagoFullPassPublicoView(MethodScopedThrottleMixin, APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope_map = {"get": "portal_lookup", "post": "portal_submit"}

    def get(self, request, slug):
        """Consulta estado del Full Pass por cedula."""
        cedula = _normalize_public_lookup_value(request.query_params.get("cedula", ""))
        if not cedula:
            return Response({"detail": "cedula requerida."}, status=400)
        _validate_public_lookup_value(cedula)
        try:
            evento = Evento.objects.get(slug=slug, portal_activo=True, pago_folk_confirmado=True)
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=404)
        try:
            pago = PagoFullPass.objects.get(evento=evento, cedula=cedula)
            return Response({
                "estado": pago.estado,
                "nombre_completo": _mask_public_name(pago.nombre_completo),
            })
        except PagoFullPass.DoesNotExist:
            return Response(None)

    def post(self, request, slug):
        """Participante sube comprobante de Full Pass."""
        try:
            evento = Evento.objects.get(slug=slug, portal_activo=True, pago_folk_confirmado=True)
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=404)

        serializer = PagoFullPassPublicoSerializer(
            data=request.data, context={"evento": evento, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        pago = serializer.save()
        return Response(
            {"id": pago.id, "estado": pago.estado, "cedula": pago.cedula},
            status=status.HTTP_201_CREATED,
        )


class PagoFullPassAdminViewSet(viewsets.ModelViewSet):
    queryset = PagoFullPass.objects.select_related("evento").all()
    serializer_class = PagoFullPassSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        estado = self.request.query_params.get("estado")
        if estado:
            qs = qs.filter(estado=estado)
        if not self.request.user.is_staff:
            org = _get_organizador(self.request.user)
            if org:
                qs = qs.filter(evento__organizador=org)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        _ensure_event_owner(self.request.user, serializer.validated_data["evento"])
        serializer.save()

    def perform_update(self, serializer):
        evento = serializer.validated_data.get("evento", serializer.instance.evento)
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.evento)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="aprobar")
    def aprobar(self, request, pk=None):
        pago = self.get_object()
        pago.estado = PagoFullPass.Estado.APROBADO
        pago.nota_rechazo = ""
        pago.save(update_fields=["estado", "nota_rechazo", "updated_at"])
        return Response(PagoFullPassSerializer(pago, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="rechazar")
    def rechazar(self, request, pk=None):
        pago = self.get_object()
        nota = request.data.get("nota", "")
        pago.estado = PagoFullPass.Estado.RECHAZADO
        pago.nota_rechazo = nota
        pago.save(update_fields=["estado", "nota_rechazo", "updated_at"])
        return Response(PagoFullPassSerializer(pago, context={"request": request}).data)


# ─── Registro de categorías (requiere Full Pass aprobado) ─────────────────────

class RegistroCategoriaPublicoView(MethodScopedThrottleMixin, APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope_map = {"get": "portal_lookup", "post": "portal_submit"}

    def get(self, request, slug):
        """Lista las categorias disponibles y el estado del Full Pass."""
        cedula = _normalize_public_lookup_value(request.query_params.get("cedula", ""))
        if cedula:
            _validate_public_lookup_value(cedula)
        try:
            evento = Evento.objects.prefetch_related("categorias_ritmo").get(
                slug=slug, portal_activo=True, pago_folk_confirmado=True
            )
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=404)

        full_pass_estado = None
        inscripciones_existentes = []

        if cedula:
            try:
                pago_fp = PagoFullPass.objects.get(evento=evento, cedula=cedula)
                full_pass_estado = pago_fp.estado
                inscripciones_existentes = [
                    {
                        "id": i.id,
                        "nombre_acto": i.nombre_acto,
                        "ritmo": i.categoria_ritmo.nombre_ritmo,
                        "modalidad": i.categoria_ritmo.modalidad,
                        "categoria_ritmo_id": i.categoria_ritmo.id,
                        "estado": i.estado_inscripcion,
                    }
                    for i in get_inscripciones_for_cedula(evento, cedula)
                ]
            except PagoFullPass.DoesNotExist:
                full_pass_estado = None

        return Response({
            "full_pass_estado": full_pass_estado,
            "categorias": CategoriaRitmoSerializer(evento.categorias_ritmo.all(), many=True).data,
            "inscripciones_existentes": inscripciones_existentes,
        })

    def post(self, request, slug):
        """Inscribir en una categoria a un participante con Full Pass aprobado."""
        try:
            evento = Evento.objects.get(slug=slug, portal_activo=True, pago_folk_confirmado=True)
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=404)

        serializer = RegistroCategoriaPortalSerializer(
            data=request.data, context={"evento": evento, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        inscripcion = serializer.save()
        return Response(
            {"id": inscripcion.id, "estado": inscripcion.estado_inscripcion},
            status=status.HTTP_201_CREATED,
        )


class PagoCategoriaAdminViewSet(viewsets.ModelViewSet):
    queryset = PagoCategoria.objects.select_related(
        "pago_full_pass__evento", "inscripcion"
    ).all()
    serializer_class = PagoCategoriaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(pago_full_pass__evento_id=evento_id)
        estado = self.request.query_params.get("estado")
        if estado:
            qs = qs.filter(estado=estado)
        cedula = self.request.query_params.get("cedula")
        if cedula:
            qs = qs.filter(pago_full_pass__cedula=cedula)
        if not self.request.user.is_staff:
            org = _get_organizador(self.request.user)
            if org:
                qs = qs.filter(pago_full_pass__evento__organizador=org)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        evento = serializer.validated_data["pago_full_pass"].evento
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_update(self, serializer):
        pago_full_pass = serializer.validated_data.get(
            "pago_full_pass", serializer.instance.pago_full_pass
        )
        _ensure_event_owner(self.request.user, pago_full_pass.evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.pago_full_pass.evento)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="aprobar")
    def aprobar(self, request, pk=None):
        pago = self.get_object()
        pago.estado = PagoCategoria.Estado.APROBADO
        pago.nota_rechazo = ""
        pago.save(update_fields=["estado", "nota_rechazo", "updated_at"])
        if pago.inscripcion:
            pago.inscripcion.estado_inscripcion = Inscripcion.EstadoInscripcion.APROBADA
            pago.inscripcion.save(update_fields=["estado_inscripcion", "updated_at"])
        return Response(PagoCategoriaSerializer(pago, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="rechazar")
    def rechazar(self, request, pk=None):
        pago = self.get_object()
        nota = request.data.get("nota", "")
        pago.estado = PagoCategoria.Estado.RECHAZADO
        pago.nota_rechazo = nota
        pago.save(update_fields=["estado", "nota_rechazo", "updated_at"])
        return Response(PagoCategoriaSerializer(pago, context={"request": request}).data)


# ─── Mi Agenda pública (búsqueda por cédula) ──────────────────────────────────

class MiAgendaView(MethodScopedThrottleMixin, APIView):
    permission_classes = [AllowAny]
    throttle_scope_map = {"get": "agenda_lookup"}

    def get(self, request, slug):
        cedula = _normalize_public_lookup_value(request.query_params.get("cedula", ""))
        if not cedula:
            return Response({"detail": "cedula requerida."}, status=400)
        _validate_public_lookup_value(cedula)

        try:
            evento = Evento.objects.get(slug=slug, portal_activo=True, pago_folk_confirmado=True)
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=404)

        inscripcion_ids = set(
            get_inscripciones_for_cedula(evento, cedula).values_list("id", flat=True)
        )

        if not inscripcion_ids:
            return Response({"items": []})

        try:
            cronograma = Cronograma.objects.get(evento=evento)
        except Cronograma.DoesNotExist:
            return Response({"items": []})

        items = ItemCronograma.objects.filter(
            cronograma=cronograma,
            inscripcion_id__in=inscripcion_ids,
        ).select_related(
            "inscripcion__categoria_ritmo"
        ).order_by("fecha", "orden")

        return Response({
            "items": MiAgendaItemSerializer(items, many=True).data,
        })


class RankingPortalView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            evento = Evento.objects.get(slug=slug, portal_activo=True, pago_folk_confirmado=True)
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=404)

        # Solo mostrar si el ranking está publicado
        try:
            Ranking.objects.get(evento=evento, estado=Ranking.Estado.PUBLICADO)
        except Ranking.DoesNotExist:
            return Response(
                {"detail": "El ranking aún no ha sido revelado.", "publicado": False},
                status=status.HTTP_403_FORBIDDEN,
            )

        ritmo = request.query_params.get("ritmo", "").strip()
        modalidad = request.query_params.get("modalidad", "").strip()

        qs = evento.categorias_ritmo.all()
        if ritmo:
            qs = qs.filter(nombre_ritmo__iexact=ritmo)
        if modalidad:
            qs = qs.filter(modalidad=modalidad)

        resultado = []
        for categoria in qs:
            inscripciones = list(
                categoria.inscripciones
                .filter(estado_inscripcion=Inscripcion.EstadoInscripcion.APROBADA)
                .order_by("-puntaje_final")[:3]
            )
            for pos, ins in enumerate(inscripciones, start=1):
                ins.posicion = pos
            resultado.append({
                "ritmo": categoria.nombre_ritmo,
                "modalidad": categoria.modalidad,
                "top3": RankingCategoriaPublicoSerializer(inscripciones, many=True).data,
            })

        return Response({"publicado": True, "categorias": resultado})


# ─── Bloques Horarios (admin) ─────────────────────────────────────────────────

class BloqueHorarioViewSet(viewsets.ModelViewSet):
    queryset = BloqueHorario.objects.select_related("evento").all()
    serializer_class = BloqueHorarioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        if not self.request.user.is_staff:
            org = _get_organizador(self.request.user)
            if org:
                qs = qs.filter(evento__organizador=org)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        _ensure_event_owner(self.request.user, serializer.validated_data["evento"])
        serializer.save()

    def perform_update(self, serializer):
        evento = serializer.validated_data.get("evento", serializer.instance.evento)
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.evento)
        instance.delete()


# ─── Orden Ritmo Agenda (admin) ───────────────────────────────────────────────

class OrdenRitmoAgendaViewSet(viewsets.ModelViewSet):
    queryset = OrdenRitmoAgenda.objects.select_related("evento").all()
    serializer_class = OrdenRitmoAgendaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get("evento")
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        if not self.request.user.is_staff:
            org = _get_organizador(self.request.user)
            if org:
                qs = qs.filter(evento__organizador=org)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        _ensure_event_owner(self.request.user, serializer.validated_data["evento"])
        serializer.save()

    def perform_update(self, serializer):
        evento = serializer.validated_data.get("evento", serializer.instance.evento)
        _ensure_event_owner(self.request.user, evento)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_event_owner(self.request.user, instance.evento)
        instance.delete()


# ─── Generador de agenda (3 modos) ────────────────────────────────────────────

class GenerarAgendaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        """
        Genera items de cronograma según el modo seleccionado.
        modo: "horarios" | "orden_ritmo" | "manual"
        """
        from datetime import datetime, timedelta

        try:
            evento = Evento.objects.get(pk=pk)
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=404)

        # Verificar permisos
        if not request.user.is_staff:
            org = _get_organizador(request.user)
            if not org or evento.organizador != org:
                return Response({"detail": "Sin permiso."}, status=403)

        modo = request.data.get("modo", "")
        cronograma, _ = Cronograma.objects.get_or_create(evento=evento)

        if modo == "horarios":
            return self._generar_por_horarios(request, evento, cronograma)
        elif modo == "orden_ritmo":
            return self._generar_por_orden_ritmo(request, evento, cronograma)
        elif modo == "manual":
            return self._agregar_item_manual(request, evento, cronograma)
        else:
            return Response({"detail": "modo inválido. Usa: horarios, orden_ritmo, manual."}, status=400)

    def _generar_por_horarios(self, request, evento, cronograma):
        """Modo 1: distribuye inscripciones en bloques horarios disponibles."""
        duracion_min = int(request.data.get("duracion_minutos", 10))
        bloques = BloqueHorario.objects.filter(evento=evento).order_by("fecha", "hora_inicio")
        if not bloques.exists():
            return Response({"detail": "No hay bloques horarios configurados."}, status=400)

        inscripciones = list(
            Inscripcion.objects.filter(
                categoria_ritmo__evento=evento,
                estado_inscripcion=Inscripcion.EstadoInscripcion.APROBADA,
            ).select_related("categoria_ritmo").order_by("categoria_ritmo__nombre_ritmo", "categoria_ritmo__modalidad")
        )

        # Limpiar items existentes generados automáticamente
        ItemCronograma.objects.filter(cronograma=cronograma, inscripcion__isnull=False).delete()

        items_creados = []
        orden = 1
        ins_idx = 0

        for bloque in bloques:
            from datetime import date, time
            inicio = datetime.combine(bloque.fecha, bloque.hora_inicio)
            fin    = datetime.combine(bloque.fecha, bloque.hora_fin)
            current = inicio

            while current + timedelta(minutes=duracion_min) <= fin and ins_idx < len(inscripciones):
                ins = inscripciones[ins_idx]
                hora_fin_item = current + timedelta(minutes=duracion_min)
                item = ItemCronograma.objects.create(
                    cronograma=cronograma,
                    inscripcion=ins,
                    titulo=ins.nombre_acto,
                    fecha=bloque.fecha,
                    hora_inicio=current.time(),
                    hora_fin=hora_fin_item.time(),
                    duracion_segundos=duracion_min * 60,
                    orden=orden,
                )
                items_creados.append(item)
                orden += 1
                ins_idx += 1
                current = hora_fin_item

        return Response({
            "modo": "horarios",
            "items_creados": len(items_creados),
            "inscripciones_sin_asignar": len(inscripciones) - ins_idx,
        })

    def _generar_por_orden_ritmo(self, request, evento, cronograma):
        """Modo 2: ordena inscripciones según OrdenRitmoAgenda."""
        ordenes = OrdenRitmoAgenda.objects.filter(evento=evento).order_by("orden")
        if not ordenes.exists():
            return Response({"detail": "No hay orden de ritmos configurado."}, status=400)

        ItemCronograma.objects.filter(cronograma=cronograma, inscripcion__isnull=False).delete()

        items_creados = []
        orden_global = 1

        for ord_ritmo in ordenes:
            inscripciones = Inscripcion.objects.filter(
                categoria_ritmo__evento=evento,
                categoria_ritmo__nombre_ritmo__iexact=ord_ritmo.ritmo,
                categoria_ritmo__modalidad=ord_ritmo.modalidad,
                estado_inscripcion=Inscripcion.EstadoInscripcion.APROBADA,
            ).order_by("nombre_acto")

            for ins in inscripciones:
                item = ItemCronograma.objects.create(
                    cronograma=cronograma,
                    inscripcion=ins,
                    titulo=ins.nombre_acto,
                    orden=orden_global,
                )
                items_creados.append(item)
                orden_global += 1

        return Response({
            "modo": "orden_ritmo",
            "items_creados": len(items_creados),
        })

    def _agregar_item_manual(self, request, evento, cronograma):
        """Modo 3: agrega un item manualmente al cronograma."""
        inscripcion_id = request.data.get("inscripcion_id")
        inscripcion = None

        if inscripcion_id:
            try:
                inscripcion = Inscripcion.objects.get(
                    pk=inscripcion_id, categoria_ritmo__evento=evento
                )
            except Inscripcion.DoesNotExist:
                return Response({"detail": "Inscripción no encontrada."}, status=404)

        ultimo_orden = (
            ItemCronograma.objects.filter(cronograma=cronograma)
            .order_by("-orden")
            .values_list("orden", flat=True)
            .first()
        ) or 0

        item = ItemCronograma.objects.create(
            cronograma=cronograma,
            inscripcion=inscripcion,
            titulo=request.data.get("titulo", inscripcion.nombre_acto if inscripcion else ""),
            fecha=request.data.get("fecha") or None,
            hora_inicio=request.data.get("hora_inicio") or None,
            hora_fin=request.data.get("hora_fin") or None,
            orden=ultimo_orden + 1,
        )

        return Response(ItemCronogramaSerializer(item).data, status=status.HTTP_201_CREATED)


# ─── Estadísticas del evento (admin) ─────────────────────────────────────────

class EventoEstadisticasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        try:
            evento = Evento.objects.get(pk=pk)
        except Evento.DoesNotExist:
            return Response({"detail": "Evento no encontrado."}, status=404)

        if not request.user.is_staff:
            org = _get_organizador(request.user)
            if not org or evento.organizador != org:
                return Response({"detail": "Sin permiso."}, status=403)

        # Full Pass
        pagos_fp = PagoFullPass.objects.filter(evento=evento)
        fp_total    = pagos_fp.count()
        fp_aprobados = pagos_fp.filter(estado=PagoFullPass.Estado.APROBADO).count()
        fp_pendientes = pagos_fp.filter(estado=PagoFullPass.Estado.PENDIENTE).count()
        fp_rechazados = pagos_fp.filter(estado=PagoFullPass.Estado.RECHAZADO).count()

        try:
            fp_config = evento.full_pass_config
            precio_fp = float(fp_config.precio)
        except FullPassConfig.DoesNotExist:
            precio_fp = 0

        # Inscripciones por categoría
        categorias_stats = []
        for cat in evento.categorias_ritmo.all():
            categorias_stats.append({
                "ritmo": cat.nombre_ritmo,
                "modalidad": cat.modalidad,
                "precio_adicional": float(cat.precio_adicional),
                "total": cat.inscripciones.count(),
                "aprobadas": cat.inscripciones.filter(
                    estado_inscripcion=Inscripcion.EstadoInscripcion.APROBADA
                ).count(),
            })

        return Response({
            "full_pass": {
                "total": fp_total,
                "aprobados": fp_aprobados,
                "pendientes": fp_pendientes,
                "rechazados": fp_rechazados,
                "ingreso_esperado": fp_aprobados * precio_fp,
            },
            "categorias": categorias_stats,
        })
