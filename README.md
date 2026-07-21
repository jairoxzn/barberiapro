# 💈 BarberíaPro

Sistema **SaaS multi-tenant** para barberías. Núcleo funcional v1.0 con autenticación por
roles, agenda con validación de reservas, clientes con historial y fidelización, servicios,
barberos y dashboard de métricas.

> **Stack:** React + Tailwind + React Query + Zustand · Node + Express · Prisma · Neon PostgreSQL · JWT.

---

## 📦 Requisitos

- **Node.js 20+** (probado en v22)
- Una base de datos **PostgreSQL** (este proyecto usa [Neon](https://neon.tech))

---

## 🚀 Puesta en marcha

**Es un proyecto único**: un solo `package.json`, un solo `npm install`, un solo comando.
El código está organizado por capa dentro de `src/`:

```
barberiapro/
├─ package.json          ← uno solo (API + interfaz)
├─ index.html
├─ vite.config.js
├─ prisma/               ← schema, migraciones y seed
└─ src/
   ├─ server/            ← API: Express + Prisma
   │  ├─ controllers/  routes/  services/
   │  ├─ middleware/   validators/  utils/
   │  └─ server.js
   └─ client/            ← Interfaz: React + Tailwind
      ├─ pages/  components/  layouts/
      └─ hooks/  store/  services/
```

### 1) Instalar y preparar la base de datos

```bash
cp .env.example .env    # completa DATABASE_URL / DIRECT_URL / secretos JWT
npm install             # instala TODO (API + interfaz)
npm run setup           # genera Prisma, migra y carga datos demo
```

### 2) Desarrollo

```bash
npm run dev
```

Levanta **la API (puerto 4000)** y **la interfaz (puerto 5173)** a la vez.
Abre **http://localhost:5173** — Vite hace *proxy* de `/api` a la API automáticamente.

### 3) Producción (despliegue único)

```bash
npm run build    # compila la interfaz a dist/
npm start        # Express sirve la interfaz + la API en el puerto 4000
```

En producción **todo corre en un solo puerto**: abre **http://localhost:4000**.

### 4) Entrar

Abre **http://localhost:5173** e ingresa con el usuario demo:

| Rol            | Correo                       | Contraseña |
| -------------- | ---------------------------- | ---------- |
| Administrador  | `admin@barberiapro.com`      | `admin123` |
| Recepcionista  | `recepcion@barberiapro.com`  | `admin123` |

O crea una barbería nueva desde **Registrar tu barbería**.

---

## 🔐 Seguridad importante

- El archivo `.env` (raíz) **contiene tu contraseña de base de datos** y está en `.gitignore`.
  **No lo subas a ningún repositorio.**
- Las credenciales de Neon que se usaron en desarrollo deben **rotarse** antes de producción
  (Neon → Project → Roles → Reset password).
- Cambia `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` por secretos largos y aleatorios.
- Define `TZ=America/Lima` (o tu zona) en el entorno del backend en producción: la validación
  de horarios de la agenda usa la hora local del servidor.

---

## 🧱 Arquitectura

```
barberiapro/                   # PROYECTO ÚNICO — un package.json, un node_modules
├── package.json               # dependencias y scripts de todo el sistema
├── index.html                 # punto de entrada de la interfaz
├── vite.config.js             # build de la interfaz + proxy /api en desarrollo
├── tailwind.config.js
├── .env                       # credenciales (NO se sube a git)
├── prisma/
│   ├── schema.prisma          # modelo completo del dominio
│   ├── migrations/            # migraciones versionadas
│   └── seed.js                # datos demo
├── dist/                      # interfaz compilada (la genera `npm run build`)
└── src/
    ├── server/                # ── API: Node + Express + Prisma ──
    │   ├── config/            # env, cliente Prisma
    │   ├── controllers/       # orquestan request → service → response
    │   ├── services/          # lógica de negocio
    │   ├── routes/            # definición de endpoints
    │   ├── middleware/        # auth, validación (Zod), errores, uploads, seguridad
    │   ├── validators/        # esquemas Zod por módulo
    │   ├── utils/             # jwt, password, respuestas, tiempo, errores
    │   ├── app.js             # configuración de Express (+ sirve dist/ en producción)
    │   └── server.js          # arranque
    └── client/                # ── Interfaz: React + Tailwind ──
        ├── components/        # UI reutilizable (Button, Modal, Card, Table…)
        ├── pages/             # Login, Dashboard, Clientes, Agenda, etc.
        ├── layouts/           # Sidebar, Topbar, DashboardLayout
        ├── hooks/             # useAuthInit, useDebounced
        ├── store/             # Zustand (auth, tema)
        ├── services/          # capa de acceso a la API
        ├── routes/            # rutas protegidas por rol
        └── lib/               # instancia axios con refresh automático
```

> El código del servidor (`src/server`) **nunca** entra al bundle del navegador: Vite sólo
> compila `src/client`. La separación es por capa, no son dos proyectos.

---

## ✅ Qué incluye esta entrega (núcleo funcional)

- **Autenticación:** registro self-service de barbería, login, refresh token con rotación
  (cookie httpOnly), logout, protección de rutas y control por roles (ADMIN, RECEPTIONIST, BARBER, CLIENT).
- **Multi-tenant + multisucursal:** cada negocio (tenant) tiene sus sucursales, barberos, clientes, etc.
- **Clientes:** CRUD, búsqueda, historial completo (citas, gasto total, puntos, última visita).
- **Servicios y categorías:** CRUD con duración, precio, color y categoría.
- **Barberos:** CRUD, comisión, asignación a sucursal y **horario semanal** editable.
- **Agenda:** vista diaria, filtros por sucursal/barbero, cambio de estados y **asistente de reserva**
  que valida: fecha pasada, día no laborable, fuera de turno, **solapes** y días de vacaciones.
- **Punto de venta (POS):** carrito de servicios + productos, descuentos, IGV, múltiples métodos de pago
  (efectivo, Yape, Plin, transferencia, tarjeta) y **ticket en PDF**. Toda la venta se registra en una
  **transacción Prisma** atómica.
- **Inventario:** productos con SKU/código de barras, **stock por sucursal**, entradas/salidas/ajustes,
  **kardex** (historial de movimientos), alertas de **stock mínimo**. El stock se descuenta solo al vender.
- **Caja:** apertura con monto inicial, ingresos/egresos, cierre con **arqueo** (esperado vs. contado),
  historial de sesiones. El efectivo de cada venta entra automáticamente a la caja abierta.
- **Fidelización:** cada venta acredita **puntos** al cliente según la regla del negocio y recalcula su
  **nivel** (Bronce → Diamante). Anular una venta repone stock y revierte puntos.
- **Reportes:** ventas, comisiones de barberos, productos más vendidos, inventario valorizado y caja,
  con filtro por fechas/sucursal y **exportación a CSV, Excel (.xlsx) y PDF**.
- **Reserva online (portal de cliente):** cada barbería tiene su enlace público `/reservar/:slug`.
  El cliente **se registra/inicia sesión**, ve **horarios disponibles reales** (según el turno del barbero
  y las citas ya ocupadas) y reserva con un asistente paso a paso. Puede ver y **cancelar** sus reservas y
  consultar sus **puntos**. Las cuentas de cliente están aisladas del panel administrativo (rol `CLIENT`).
- **Configuración del negocio (ADMIN):** nombre, **logo** (subida con Multer), teléfono/correo, **moneda**,
  **IGV**, serie de comprobante, **color de marca**, redes sociales y **reglas del programa de puntos**
  (puntos por moneda, por 1ª visita, cumpleaños y referido).
- **Dashboard:** ventas del día/mes, clientes, citas de hoy, top barberos y top servicios.
- **UI:** responsive, modo claro/oscuro, animaciones, sidebar moderno, componentes reutilizables.

## 🔜 Módulos con esquema listo (pendientes de UI en próximas fases)

El `schema.prisma` también modela **transferencias de stock entre sucursales, canje de premios de
fidelización, notificaciones (Email/WhatsApp) y auditoría**. Las tablas y relaciones existen; falta
construir sus pantallas.

---

## 📡 API REST — resumen

Base: `http://localhost:4000/api` · Autenticación: `Authorization: Bearer <accessToken>`

| Método | Endpoint                         | Descripción                          |
| ------ | -------------------------------- | ------------------------------------ |
| POST   | `/auth/register`                 | Crear barbería + admin               |
| POST   | `/auth/login`                    | Iniciar sesión                       |
| POST   | `/auth/refresh`                  | Renovar access token                 |
| POST   | `/auth/logout`                   | Cerrar sesión                        |
| GET    | `/auth/me`                       | Perfil del usuario autenticado       |
| GET    | `/dashboard/summary`             | Métricas del panel                   |
| GET/POST/PUT/DELETE | `/branches`         | Sucursales                           |
| GET/POST/PUT/DELETE | `/clients`          | Clientes (+ `/:id/history`)          |
| GET/POST/PUT/DELETE | `/services`         | Servicios (+ `/categories`)          |
| GET/POST/PUT/DELETE | `/barbers`          | Barberos (+ `/:id/schedule`)         |
| GET/POST/PUT/DELETE | `/appointments`     | Agenda (+ `PATCH /:id/status`)       |
| GET/POST/PUT/DELETE | `/products`         | Inventario (+ `/:id/stock`, `/:id/kardex`) |
| GET/POST            | `/cash`             | Caja (`/current`, `/open`, `/:id/close`, `/:id/movements`) |
| GET/POST            | `/sales`            | Ventas POS (+ `/:id/ticket` PDF, `/:id/cancel`) |
| GET                 | `/reports/:type`    | Reportes (`?format=json\|csv\|xlsx\|pdf`) |
| GET                 | `/public/barbershop/:slug` | Datos públicos de la barbería (sin login) |
| POST                | `/auth/client/register`, `/auth/client/login` | Cuentas de cliente (reserva online) |
| GET/POST            | `/booking/*`        | Portal de cliente: `availability`, `appointments`, `me` |
| GET/PUT/POST        | `/settings`         | Configuración del negocio (+ `/logo` subida de imagen) |

Todas las respuestas siguen el formato: `{ "success": true, "data": ..., "meta"?: ... }`
o `{ "success": false, "error": { "message": ... } }`.

---

## 🛠️ Scripts útiles (backend)

| Comando                    | Acción                                  |
| -------------------------- | --------------------------------------- |
| `npm run dev`              | API con recarga automática (nodemon)    |
| `npm start`                | API en modo producción                  |
| `npm run prisma:studio`    | Explorador visual de la base de datos   |
| `npm run prisma:migrate`   | Nueva migración en desarrollo           |
| `npm run prisma:deploy`    | Aplicar migraciones en producción       |
| `npm run db:seed`          | Cargar datos demo                       |
