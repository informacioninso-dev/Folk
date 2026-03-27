from django.contrib import admin

from .models import (
    BloqueHorario,
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


@admin.register(Organizador)
class OrganizadorAdmin(admin.ModelAdmin):
    list_display  = ("nombre", "nit_ruc", "email_contacto", "usuario", "created_at")
    search_fields = ("nombre", "nit_ruc", "email_contacto", "usuario__username")
    raw_id_fields = ("usuario",)


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display  = ("nombre", "organizador", "fecha", "ubicacion", "estado", "activo", "portal_activo", "destacado", "slug")
    list_filter   = ("activo", "estado", "portal_activo", "destacado", "organizador")
    search_fields = ("nombre", "ubicacion", "slug")
    date_hierarchy = "fecha"
    readonly_fields = ("slug",)


@admin.register(CategoriaRitmo)
class CategoriaRitmoAdmin(admin.ModelAdmin):
    list_display  = ("nombre_ritmo", "modalidad", "evento", "edad_min", "edad_max", "precio_adicional")
    list_filter   = ("modalidad", "evento")
    search_fields = ("nombre_ritmo",)


class ParticipanteInline(admin.TabularInline):
    model  = Participante
    extra  = 1
    fields = ("nombre_completo", "identificacion", "edad", "email")


@admin.register(Inscripcion)
class InscripcionAdmin(admin.ModelAdmin):
    list_display    = ("nombre_acto", "categoria_ritmo", "estado_inscripcion", "estado_pago", "puntaje_final")
    list_filter     = ("estado_inscripcion", "estado_pago", "categoria_ritmo__evento")
    search_fields   = ("nombre_acto",)
    readonly_fields = ("puntaje_final", "created_at", "updated_at")
    inlines         = [ParticipanteInline]


@admin.register(Participante)
class ParticipanteAdmin(admin.ModelAdmin):
    list_display  = ("nombre_completo", "identificacion", "edad", "email", "inscripcion")
    search_fields = ("nombre_completo", "identificacion")


@admin.register(ParticipanteGeneral)
class ParticipanteGeneralAdmin(admin.ModelAdmin):
    list_display  = ("nombre_completo", "cedula", "evento", "estado", "correo_electronico", "telefono")
    list_filter   = ("estado", "evento")
    search_fields = ("nombre_completo", "cedula", "correo_electronico")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Grupo)
class GrupoAdmin(admin.ModelAdmin):
    list_display  = ("nombre", "representante", "cedula_representante", "academia")
    search_fields = ("nombre", "cedula_representante")
    filter_horizontal = ("participantes",)


@admin.register(Pareja)
class ParejaAdmin(admin.ModelAdmin):
    list_display  = ("nombre", "representante", "cedula_representante", "academia", "participante_1", "participante_2")
    search_fields = ("nombre", "cedula_representante")
    raw_id_fields = ("participante_1", "participante_2", "inscripcion")


@admin.register(Juez)
class JuezAdmin(admin.ModelAdmin):
    list_display  = ("usuario", "evento", "created_at")
    list_filter   = ("evento",)
    search_fields = ("usuario__username", "usuario__email")


@admin.register(CriterioEvaluacion)
class CriterioEvaluacionAdmin(admin.ModelAdmin):
    list_display  = ("nombre", "evento")
    list_filter   = ("evento",)
    search_fields = ("nombre",)


@admin.register(Calificacion)
class CalificacionAdmin(admin.ModelAdmin):
    list_display    = ("inscripcion", "criterio", "juez", "puntaje", "bloqueada")
    list_filter     = ("bloqueada", "juez__evento", "criterio")
    search_fields   = ("inscripcion__nombre_acto",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Ranking)
class RankingAdmin(admin.ModelAdmin):
    list_display  = ("evento", "estado", "publicado_en")
    list_filter   = ("estado",)
    readonly_fields = ("publicado_en", "created_at", "updated_at")


class ItemCronogramaInline(admin.TabularInline):
    model  = ItemCronograma
    extra  = 1
    fields = ("orden", "inscripcion", "duracion_segundos", "tiempo_extra")


@admin.register(Cronograma)
class CronogramaAdmin(admin.ModelAdmin):
    list_display = ("evento",)
    inlines      = [ItemCronogramaInline]


@admin.register(FullPassConfig)
class FullPassConfigAdmin(admin.ModelAdmin):
    list_display  = ("evento", "nombre", "precio", "es_requerido")
    list_filter   = ("es_requerido",)
    search_fields = ("evento__nombre", "nombre")


@admin.register(PagoFullPass)
class PagoFullPassAdmin(admin.ModelAdmin):
    list_display  = ("nombre_completo", "cedula", "evento", "estado", "numero_comprobante", "created_at")
    list_filter   = ("estado", "evento")
    search_fields = ("nombre_completo", "cedula", "numero_comprobante")
    readonly_fields = ("created_at", "updated_at")


@admin.register(PagoCategoria)
class PagoCategoriaAdmin(admin.ModelAdmin):
    list_display  = ("pago_full_pass", "inscripcion", "estado", "numero_comprobante", "created_at")
    list_filter   = ("estado",)
    search_fields = ("pago_full_pass__cedula", "numero_comprobante")
    readonly_fields = ("created_at", "updated_at")


@admin.register(BloqueHorario)
class BloqueHorarioAdmin(admin.ModelAdmin):
    list_display  = ("evento", "fecha", "hora_inicio", "hora_fin", "orden")
    list_filter   = ("evento", "fecha")
    ordering      = ("evento", "fecha", "hora_inicio")


@admin.register(OrdenRitmoAgenda)
class OrdenRitmoAgendaAdmin(admin.ModelAdmin):
    list_display  = ("evento", "orden", "ritmo", "modalidad")
    list_filter   = ("evento", "modalidad")
    ordering      = ("evento", "orden")
