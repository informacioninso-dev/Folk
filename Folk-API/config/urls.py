from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenRefreshView,
    TokenVerifyView,
)

from competition.views import (
    BloqueHorarioViewSet,
    SiteConfigView,
    BuscarParticipanteView,
    SuperadminDashboardView,
    OrganizadorActividadView,
    ComunicadoView,
    CalificacionViewSet,
    CategoriaRitmoViewSet,
    CronogramaLiveView,
    CronogramaViewSet,
    CriterioEvaluacionViewSet,
    EventoEstadisticasView,
    EventoPortalView,
    EventoViewSet,
    EventosHomepageView,
    FullPassConfigViewSet,
    FolkTokenObtainPairView,
    GenerarAgendaView,
    GrupoViewSet,
    HealthCheckView,
    InscripcionModalidadView,
    InscripcionViewSet,
    ItemCronogramaViewSet,
    JuezViewSet,
    MeView,
    MiAgendaView,
    OrdenRitmoAgendaViewSet,
    OrganizadorViewSet,
    PagoCategoriaAdminViewSet,
    PagoFullPassAdminViewSet,
    PagoFullPassPublicoView,
    ParejaViewSet,
    ParticipanteGeneralViewSet,
    ParticipanteViewSet,
    PasswordResetConfirmView,
    PasswordResetView,
    RankingPortalView,
    RankingPublicoView,
    RankingViewSet,
    RegistroCategoriaPublicoView,
    RegistroGeneralPublicoView,
    RegistroPublicoView,
    UploadView,
    UsuarioBuscarView,
)

router = DefaultRouter()
router.register("organizadores",          OrganizadorViewSet)
router.register("eventos",                EventoViewSet)
router.register("categorias-ritmo",       CategoriaRitmoViewSet)
router.register("inscripciones",          InscripcionViewSet)
router.register("participantes",          ParticipanteViewSet)
router.register("participantes-generales", ParticipanteGeneralViewSet)
router.register("grupos",                 GrupoViewSet)
router.register("parejas",                ParejaViewSet)
router.register("jueces",                 JuezViewSet)
router.register("criterios-evaluacion",   CriterioEvaluacionViewSet)
router.register("calificaciones",         CalificacionViewSet)
router.register("rankings",               RankingViewSet)
router.register("cronogramas",            CronogramaViewSet)
router.register("items-cronograma",       ItemCronogramaViewSet)
router.register("full-pass-config",       FullPassConfigViewSet)
router.register("pagos-full-pass",        PagoFullPassAdminViewSet)
router.register("pagos-categoria",        PagoCategoriaAdminViewSet)
router.register("bloques-horario",        BloqueHorarioViewSet)
router.register("ordenes-ritmo-agenda",   OrdenRitmoAgendaViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(router.urls)),
    # Auth
    path("api/v1/auth/token/", FolkTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("api/v1/auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # Usuario actual
    path("api/v1/me/", MeView.as_view(), name="me"),
    path("api/v1/health/", HealthCheckView.as_view(), name="health_check"),
    # Inscripción pública (sin auth)
    path("api/v1/registro/<slug:slug>/", RegistroPublicoView.as_view(), name="registro_publico"),
    # Búsqueda de usuarios para asignar jueces
    path("api/v1/usuarios/buscar/", UsuarioBuscarView.as_view(), name="usuarios_buscar"),
    # Recuperar contraseña
    path("api/v1/auth/password-reset/", PasswordResetView.as_view(), name="password_reset"),
    path("api/v1/auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    # Ranking público por slug
    path("api/v1/ranking/<slug:slug>/", RankingPublicoView.as_view(), name="ranking_publico"),
    # Registro general público (M1)
    path("api/v1/registro-general/<slug:slug>/", RegistroGeneralPublicoView.as_view(), name="registro_general_publico"),
    # Búsqueda de participante por cédula (M2)
    path("api/v1/registro-general/<slug:slug>/buscar/", BuscarParticipanteView.as_view(), name="buscar_participante"),
    # Inscripción por modalidad (M2)
    path("api/v1/registro-general/<slug:slug>/inscribir/", InscripcionModalidadView.as_view(), name="inscripcion_modalidad"),
    # Upload de archivos
    path("api/v1/upload/", UploadView.as_view(), name="upload"),
    # Cronograma público en vivo (M7)
    path("api/v1/cronograma-live/<slug:slug>/", CronogramaLiveView.as_view(), name="cronograma_live"),
    # Homepage pública
    path("api/v1/homepage/", EventosHomepageView.as_view(), name="homepage"),
    # Portal público del evento
    path("api/v1/portal/<slug:slug>/", EventoPortalView.as_view(), name="portal_evento"),
    # Full Pass público (subir comprobante / consultar estado)
    path("api/v1/portal/<slug:slug>/full-pass/", PagoFullPassPublicoView.as_view(), name="full_pass_publico"),
    # Registro de categorías (requiere Full Pass aprobado)
    path("api/v1/portal/<slug:slug>/categorias/", RegistroCategoriaPublicoView.as_view(), name="registro_categorias"),
    # Mi Agenda por cédula
    path("api/v1/portal/<slug:slug>/mi-agenda/", MiAgendaView.as_view(), name="mi_agenda"),
    # Ranking portal público (top 3)
    path("api/v1/portal/<slug:slug>/ranking/", RankingPortalView.as_view(), name="ranking_portal"),
    # Generador de agenda
    path("api/v1/eventos/<int:pk>/generar-agenda/", GenerarAgendaView.as_view(), name="generar_agenda"),
    # Estadísticas del evento
    path("api/v1/eventos/<int:pk>/estadisticas/", EventoEstadisticasView.as_view(), name="evento_estadisticas"),
    # Configuración global del sitio
    path("api/v1/site-config/", SiteConfigView.as_view(), name="site_config"),
    # Dashboard superadmin
    path("api/v1/superadmin/dashboard/", SuperadminDashboardView.as_view(), name="superadmin_dashboard"),
    # Historial de actividad por organizador
    path("api/v1/superadmin/organizadores/<int:pk>/actividad/", OrganizadorActividadView.as_view(), name="organizador_actividad"),
    # Comunicados a organizadores
    path("api/v1/superadmin/comunicados/", ComunicadoView.as_view(), name="comunicados"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
