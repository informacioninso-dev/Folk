# Folk Web — Frontend

Frontend del sistema **Folk** para la gestión de eventos de danza y competencias. Construido con Next.js 14 (App Router), React Query, Tailwind CSS y TypeScript.

## Stack

- **Next.js 14** (App Router, output standalone)
- **React 18** + TypeScript
- **TanStack React Query 5** — fetching y cache de datos
- **React Hook Form + Zod** — formularios y validación
- **Axios** — cliente HTTP con proxy hacia el backend
- **Tailwind CSS 3** — estilos

## Módulos del sistema

| Ruta | Descripción |
|------|-------------|
| `/login` | Autenticación JWT |
| `/eventos` | Lista y creación de eventos (organizado) |
| `/eventos/[id]` | Gestión de un evento: categorías, participantes, jueces, agenda, criterios, ranking, pagos, portal |
| `/inscripciones` | Vista de inscripciones del organizador |
| `/calificaciones` | Panel de calificación por categoría |
| `/ranking` | Rankings por evento y categoría |
| `/evento/[slug]` | Portal público del evento (inscripción, Full Pass, agenda, ranking) |
| `/registro/[slug]` | Registro público de participantes |
| `/calificar/[eventoId]` | Interfaz de juez para calificar |
| `/superadmin` | Panel de administración global (solo staff) |
| `/superadmin/organizadores/[id]` | Detalle de cliente: plan, eventos, historial, pagos FP |

## Estructura

```
src/
  app/              # Rutas Next.js (App Router)
    (auth)/         # Login, recuperar contraseña
    (dashboard)/    # Panel del organizador
    (participante)/ # Vista del participante
    (juez)/         # Interfaz del juez
    (superadmin)/   # Panel superadmin
    api/proxy/      # Proxy hacia la API backend
    evento/[slug]/  # Portal público
  features/         # Lógica por dominio (hooks, api, types)
  lib/              # Cliente axios, utilidades de auth
```

## Setup local

### Requisitos

- Node.js 20+
- Backend Folk-API corriendo en `http://localhost:8000`

### Instalación

```bash
npm install
```

### Variables de entorno

Crea un archivo `.env.local` en la raíz de `folk-web/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Build de producción

```bash
npm run build
npm start
```

O con Docker (ver instrucciones en [DEPLOY.md](../DEPLOY.md)):

```bash
# Desde la raíz del monorepo
export NEXT_PUBLIC_API_URL=https://api.tudominio.com
docker compose -f docker-compose.prod.yml up --build -d
```

## Variables de entorno — Producción

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL pública del backend (ej. `https://api.tudominio.com`) |

Ver `.env.production.example` para la plantilla completa.

## Proxy API

Todas las llamadas del frontend pasan por `/api/proxy/[...path]` (Next.js Route Handler), que reenvía las peticiones al backend. Esto evita problemas de CORS en el cliente y permite manejar cookies HttpOnly de forma segura.

## Usuarios del sistema

| Rol | Acceso |
|-----|--------|
| Organizador | Dashboard completo: eventos, inscripciones, calificaciones, ranking |
| Participante | Ver y gestionar su inscripción |
| Juez | Calificar categorías asignadas |
| Superadmin | Panel global: clientes, eventos, pagos Full Pass, comunicados |
