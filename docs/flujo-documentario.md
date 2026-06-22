# Flujo Documentario — Referencia Técnica

Descripción técnica del ciclo de vida de los dos tipos de documento que maneja el sistema: **documentos internos** (creados y tramitados por personal) y **trámites externos** (enviados por ciudadanos desde la Mesa Virtual). Cubre desde la creación hasta la derivación a un área destino.

---

## Tabla de contenidos

1. [Arquitectura general](#1-arquitectura-general)
2. [Jerarquía de controladores](#2-jerarquía-de-controladores)
3. [Flujo de documentos internos](#3-flujo-de-documentos-internos)
   - [Registro inicial](#31-registro-inicial)
   - [Máquina de estados](#32-máquina-de-estados)
   - [Transiciones y derivación](#33-transiciones-y-derivación)
   - [Registro de auditoría (DocumentFlow)](#34-registro-de-auditoría-documentflow)
4. [Flujo de trámites externos (Mesa Virtual)](#4-flujo-de-trámites-externos-mesa-virtual)
   - [Envío ciudadano](#41-envío-ciudadano)
   - [Máquina de estados](#42-máquina-de-estados)
   - [Gestión interna y derivación](#43-gestión-interna-y-derivación)
   - [Registro de auditoría (VirtualSubmissionFlow)](#44-registro-de-auditoría-virtualsubmissionflow)
5. [Endpoints API](#5-endpoints-api)
6. [Autorización por roles](#6-autorización-por-roles)
7. [Diferencias clave entre ambos flujos](#7-diferencias-clave-entre-ambos-flujos)

---

## 1. Arquitectura general

El sistema separa responsabilidades en tres capas:

```
HTTP Request
    │
    ▼
Controller          ← recibe params, llama al servicio, renderiza JSON
    │
    ▼
Service             ← toda la lógica de negocio, devuelve Result struct
    │
    ▼
Model / DB          ← ActiveRecord, validaciones, callbacks
```

Los servicios devuelven un `Result` struct con tres campos:

```ruby
Result = Struct.new(:success, :document, :errors, keyword_init: true) do
  def success? = success
end
```

El controlador nunca levanta una excepción de negocio — consulta `result.success?` y decide qué renderizar.

---

## 2. Jerarquía de controladores

```
ActionController::API
    └── ApplicationController          # infraestructura base (rescue_from, formatos)
            ├── Api::V1::PublicController         # sin autenticación
            │       └── VirtualSubmissionsController  (Mesa Virtual pública)
            └── Api::V1::AuthenticatedController  # JWT + Pundit
                    ├── DocumentsController
                    ├── AdminVirtualSubmissionsController
                    ├── UsersController
                    ├── AreasController
                    └── … (resto de controllers internos)
```

`AuthenticatedController` agrega dos filtros que todos sus hijos heredan:

```ruby
before_action :authenticate_user!   # valida el JWT de Devise
after_action  :verify_authorized    # Pundit: falla si ninguna acción llamó authorize
```

Cualquier endpoint bajo `PublicController` omite ambos filtros — no requiere token.

---

## 3. Flujo de documentos internos

### Modelo principal: `Document`

| Campo | Tipo | Descripción |
|---|---|---|
| `document_number` | string | Correlativo auto-generado (`MEM-2026-00042`) |
| `status` | enum | Estado actual en la máquina de estados |
| `direction` | enum | `entrada`, `interno`, `salida` |
| `priority` | enum | `baja`, `media`, `alta`, `urgente` |
| `area_id` | FK | Área que tiene el documento en este momento |
| `created_by_id` | FK | Usuario que registró el documento |

### 3.1 Registro inicial

**Endpoint:** `POST /api/v1/documents`  
**Servicio:** `Documents::RegisterService`

Pasos que ejecuta el servicio:

```
1. Document.new(params)
2. document.created_by = current_user
3. document.save   →   callbacks:
       before_create :assign_document_number   # MEM-2026-00001
       before_create :set_received_at          # hora Lima
4. attach_files(document)                      # Active Storage
5. DocumentFlow.create!(
       action:      "registrado",
       from_status: nil,
       to_status:   "registrado",
       to_area:     document.area
   )
6. Document.includes(...).find(document.id)    # recarga con asociaciones
7. return Result(success: true, document: ...)
```

El controlador renderiza `show.json.jbuilder` con status `201 Created`.

Si el servicio falla (validaciones), devuelve `Result(success: false, errors: [...])` y el controlador responde `422 Unprocessable Entity`.

### 3.2 Máquina de estados

Definida en `Documents::TransitionRules` — módulo puro, sin ActiveRecord.

**Transiciones válidas:**

```
registrado ──────────────────────────────────► en_proceso
     │                                              │
     ├─────────────────────────────────────────► derivado
     └─────────────────────────────────────────► anulado

en_proceso ──────────────────────────────────► derivado
     │                                              │
     ├──────────────────────────────────────────► respondido
     ├──────────────────────────────────────────► devuelto
     ├──────────────────────────────────────────► finalizado
     └──────────────────────────────────────────► anulado

derivado ────────────────────────────────────► en_proceso
     │                                              │
     ├──────────────────────────────────────────► devuelto
     ├──────────────────────────────────────────► finalizado
     └──────────────────────────────────────────► anulado

respondido ──────────────────────────────────► finalizado
     │                                              │
     └──────────────────────────────────────────► archivado
           └──────────────────────────────────────► anulado

devuelto ────────────────────────────────────► en_proceso
     └──────────────────────────────────────────► anulado

[archivado]  [finalizado]  [anulado]   ← estados terminales
```

La regla clave: **`derivado` requiere `to_area_id`**. Si se intenta derivar sin área destino el servicio rechaza la transición antes de tocar la base de datos.

Cada par `[from, to]` tiene un nombre de acción que se graba en `DocumentFlow#action`:

| Transición | Acción grabada |
|---|---|
| `* → derivado` | `"derivado"` |
| `* → devuelto` | `"devuelto"` |
| `* → finalizado` | `"finalizado"` |
| `* → anulado` | `"anulado"` |
| todos los demás | `"avance"` |

### 3.3 Transiciones y derivación

**Endpoint:** `PATCH /api/v1/documents/:id/update_status`  
**Servicio:** `Documents::TransitionService`

Parámetros:

```json
{
  "status": "derivado",
  "to_area_id": 5,
  "observations": "Requiere firma del jefe de área"
}
```

Pasos que ejecuta el servicio:

```
1. TransitionRules.valid?(from: doc.status, to: params[:status])
       → false  ⟹  return failure("Transición no permitida …")

2. TransitionRules.requires_area?(to: "derivado") && to_area_id.blank?
       → true   ⟹  return failure("Debe especificar el área destinataria …")

3. from_status = doc.status.to_s
   from_area   = doc.area

4. update_attrs = { status: "derivado" }
   update_attrs[:area_id] = to_area_id   # ← ruta el documento al área destino

5. doc.update(update_attrs)

6. DocumentFlow.create!(
       action:       "derivado",
       from_status:  from_status,
       to_status:    "derivado",
       from_area:    from_area,
       to_area:      Area.find(to_area_id),
       observations: "Requiere firma del jefe de área"
   )

7. return Result(success: true, document: reloaded)
```

**Anulación** usa el mismo servicio con `to_status: "anulado"` y es invocada desde `DocumentsController#destroy` — no existe un endpoint `DELETE` que destruya físicamente el registro.

### 3.4 Registro de auditoría (DocumentFlow)

`DocumentFlow` es la bitácora inmutable del documento. Cada llamada al servicio crea exactamente un registro:

```ruby
DocumentFlow {
  document_id:  Integer    # documento al que pertenece
  performed_by: User       # quién ejecutó la acción
  action:       String     # "registrado" | "avance" | "derivado" | "devuelto" | "finalizado" | "anulado"
  from_status:  String?    # nil en el primer registro
  to_status:    String     # estado resultante
  from_area:    Area?      # área de origen
  to_area:      Area?      # área destino
  observations: String?    # notas opcionales
  performed_at: DateTime   # auto-asignado antes de validación
}
```

El historial completo se expone en `GET /api/v1/documents/:id` dentro del campo `flows` del JSON de respuesta.

---

## 4. Flujo de trámites externos (Mesa Virtual)

### Modelo principal: `VirtualSubmission`

| Campo | Tipo | Descripción |
|---|---|---|
| `tracking_number` | string | Código único auto-generado (`VT-2026-0003421`) |
| `status` | enum | Estado en la máquina de estados pública |
| `submitter_type` | string | `natural` o `juridica` |
| `to_area_id` | FK | Área que debe atender el trámite |

### 4.1 Envío ciudadano

**Endpoint:** `POST /api/v1/mesa_virtual/submit`  
**Controlador:** `VirtualSubmissionsController < PublicController` — **sin autenticación**

```
1. VirtualSubmission.new(params)
       before_validation :generate_tracking_number   # VT-2026-0003421
       before_create     :set_received_at
2. submission.save
3. attach_files(submission)
4. submission.flows.create!(
       action:      "registrado",
       from_status: nil,
       to_status:   "registrado",
       performed_at: submission.received_at
   )
   Nota: performed_by es nil — el ciudadano no tiene usuario en el sistema.
5. render :show, status: 201
```

El ciudadano recibe el `tracking_number` para consultar el estado en cualquier momento.

**Consulta de estado (pública):**  
`GET /api/v1/mesa_virtual/track?tracking_number=VT-2026-0003421`  
o bien  
`GET /api/v1/mesa_virtual/track?document=12345678`

No requiere autenticación. Devuelve el trámite con su timeline completo.

### 4.2 Máquina de estados

```
registrado ──────────────────────────────────► en_revision
     └─────────────────────────────────────────► derivado

en_revision ─────────────────────────────────► observado
     ├──────────────────────────────────────────► derivado
     └──────────────────────────────────────────► finalizado

observado ───────────────────────────────────► en_revision
     └─────────────────────────────────────────► finalizado

derivado ────────────────────────────────────► en_revision
     └─────────────────────────────────────────► finalizado

[finalizado]   ← estado terminal
```

Las transiciones **no** usan `TransitionRules` — se validan en el controlador directamente (sin servicio dedicado, a diferencia del flujo interno).

### 4.3 Gestión interna y derivación

**Endpoint:** `PATCH /api/v1/admin/virtual_submissions/:id/update_status`  
**Controlador:** `AdminVirtualSubmissionsController < AuthenticatedController`  
**Requiere:** JWT válido + `VirtualSubmissionPolicy#update_status?` (admin o manager)

Parámetros para derivar:

```json
{
  "status": "derivado",
  "to_area_id": 3,
  "review_notes": "Derivado al área de licencias"
}
```

El controlador:

```
1. Carga @submission con includes
2. authorize @submission           # Pundit
3. from_status  = submission.status
   from_area_id = submission.to_area_id
4. Si status == "derivado" y to_area_id.blank? → 422
5. submission.update(status: "derivado", to_area_id: 3, review_notes: "…")
6. submission.flows.create!(
       action:       "derivado",
       from_status:  "registrado",
       to_status:    "derivado",
       from_area_id: from_area_id,
       to_area_id:   3,
       performed_by: current_user,
       performed_at: Time.current
   )
7. render :show
```

**Bandeja del área:**  
`GET /api/v1/admin/bandeja/virtual_submissions`

Devuelve solo los trámites con `to_area_id = current_user.area_id`. Si el usuario no tiene área asignada, devuelve lista vacía. Admite filtro `?status=derivado`.

### 4.4 Registro de auditoría (VirtualSubmissionFlow)

```ruby
VirtualSubmissionFlow {
  virtual_submission_id: Integer
  performed_by:          User?       # nil cuando lo crea el ciudadano
  action:                String      # igual al to_status
  from_status:           String?
  to_status:             String
  from_area_id:          Integer?
  to_area_id:            Integer?
  notes:                 String?
  performed_at:          DateTime
}
```

---

## 5. Endpoints API

### Documentos internos (autenticados)

| Método | Ruta | Acción | Quién puede |
|---|---|---|---|
| `GET` | `/api/v1/documents` | Listar con filtros | todos |
| `GET` | `/api/v1/documents/mine` | Solo los propios | todos |
| `GET` | `/api/v1/documents/search?q[subject_cont]=...` | Búsqueda Ransack | todos |
| `POST` | `/api/v1/documents` | Registrar | todos |
| `GET` | `/api/v1/documents/:id` | Ver detalle + flows | todos |
| `PATCH` | `/api/v1/documents/:id` | Editar metadatos | creator o admin/manager |
| `PATCH` | `/api/v1/documents/:id/update_status` | Cambiar estado / derivar | admin o manager |
| `DELETE` | `/api/v1/documents/:id` | Anular (soft) | admin o manager |
| `POST` | `/api/v1/documents/:id/validate_signature` | Validar firma digital | todos |

### Mesa Virtual (públicos)

| Método | Ruta | Acción |
|---|---|---|
| `GET` | `/api/v1/mesa_virtual/document_types` | Tipos de documento habilitados |
| `POST` | `/api/v1/mesa_virtual/submit` | Enviar trámite |
| `GET` | `/api/v1/mesa_virtual/track` | Consultar estado por tracking o DNI |

### Mesa Virtual — gestión interna (autenticados)

| Método | Ruta | Acción | Quién puede |
|---|---|---|---|
| `GET` | `/api/v1/admin/virtual_submissions` | Listar todos | admin o manager |
| `GET` | `/api/v1/admin/virtual_submissions/:id` | Ver detalle | admin o manager |
| `PATCH` | `/api/v1/admin/virtual_submissions/:id/update_status` | Cambiar estado / derivar | admin o manager |
| `GET` | `/api/v1/admin/bandeja/virtual_submissions` | Bandeja del área actual | todos (filtra por área) |

---

## 6. Autorización por roles

Roles disponibles: `admin`, `manager`, `staff` (default).

### DocumentPolicy

| Acción | Quién puede |
|---|---|
| `index?`, `show?`, `create?`, `search?`, `mine?` | todos (cualquier rol autenticado) |
| `update?` | admin, manager **o** creador del documento |
| `update_status?`, `destroy?` | solo admin o manager |

### VirtualSubmissionPolicy

| Acción | Quién puede |
|---|---|
| `index?`, `show?` | admin o manager |
| `update_status?` | admin o manager |
| `bandeja?` | todos (el scope lo limita al área del usuario) |

---

## 7. Diferencias clave entre ambos flujos

| Aspecto | Documentos internos | Trámites externos |
|---|---|---|
| **Creador** | Usuario autenticado del sistema | Ciudadano sin cuenta |
| **Autenticación para crear** | JWT requerido | Ninguna |
| **Servicio de registro** | `Documents::RegisterService` | Lógica en el controlador |
| **Transiciones** | `Documents::TransitionService` + `TransitionRules` | Lógica en el controlador |
| **Validación de transición** | Módulo puro `TransitionRules` (centralized) | Condicionales en el controlador |
| **Auditoría** | `DocumentFlow` | `VirtualSubmissionFlow` |
| **`performed_by` en flows** | Siempre presente (usuario autenticado) | `nil` en el primer registro (ciudadano) |
| **Número de referencia** | `document_number` (`MEM-2026-00042`) | `tracking_number` (`VT-2026-0003421`) |
| **Estados terminales** | `archivado`, `finalizado`, `anulado` | `finalizado` |
| **Consulta pública** | No | Sí (`/track`) |
