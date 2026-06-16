# Reglas y Requisitos del Sistema de Trámite Documentario
## Fuentes: Ley N° 25323 · Resolución N° 0034-2014-INDECOPI/GEG · DS 098-2025-PCM · Manual STD IGP v1.0

---

## 1. Ciclo de vida del documento (Ley 25323 + DS 098-2025)

El documento electrónico tiene un ciclo de vida oficial definido por ley:

| Etapa | Descripción | Estado en hal-docs |
|---|---|---|
| **Planificación** | Definición del tipo y plantilla | — |
| **Producción** | Registro con número correlativo | `registrado` |
| **Utilización** | Tramitación activa entre áreas | `en_proceso`, `derivado` |
| **Respuesta** | Documento atendido y respondido | `respondido` |
| **Archivo** | Cierre del expediente | `archivado` |
| **Eliminación** | Descarte normado con periodo de retención | soft-delete `anulado` |

### Estados faltantes
- `devuelto` — cuando el receptor rechaza por falta de firma digital (exigido por INDECOPI)
- `finalizado` — equivalente a archivado en STD IGP (distinto a anulado)

---

## 2. Tipos de documento (INDECOPI + STD IGP)

| Código | Nombre | Flujo típico |
|---|---|---|
| `OFI` | Oficio | Externo (sale de la institución) |
| `MEM` | Memorándum | Interno entre áreas |
| `INF` | Informe | Técnico, de área hacia Gerencia |
| `CAR` | Carta | Con firma manuscrita, externos |
| `RES` | Resolución | Decisión institucional |
| `EXP` | Expediente | Documento con TUPA (trámite ciudadano) |
| `ANX` | Anexo | Adjunto a otro documento principal |

> El STD IGP distingue: **Entrada** (viene de fuera), **Interno** (entre oficinas), **Salida** (sale de la institución). En hal-docs se puede modelar con un campo `direction: enum [entrada, interno, salida]` en `Document`.

---

## 3. Numeración automática de documentos

### Regla (Ley 25323, art. 5°-b)
La numeración debe ser **correlativa, automática e inmutable** una vez asignada.

### Formato recomendado
```
{CODIGO_TIPO}-{AÑO}-{SECUENCIA_5_DIGITOS}
Ejemplo: OFI-2026-00042
         MEM-2026-00001
```

### Implementación sugerida (Rails)
```ruby
# app/models/document.rb
before_create :assign_document_number

def assign_document_number
  return if document_number.present?
  prefix = document_type.code
  year   = Date.today.year
  seq    = Document.where("document_number LIKE ?", "#{prefix}-#{year}-%").count + 1
  self.document_number = "#{prefix}-#{year}-#{seq.to_s.rjust(5, '0')}"
end
```

---

## 4. Campos del formulario de registro (STD IGP Manual)

Campos identificados en el Manual de Usuario del STD IGP que deben estar en el formulario `NewDocumentPage`:

| Campo | Nombre en STD | Obligatorio | Notas |
|---|---|---|---|
| `document_type_id` | Tipo de Documento | ✅ | Selector |
| `subject` | Sumilla / Asunto | ✅ | Descripción corta |
| `body` / `observations` | Observaciones | — | Texto libre |
| `folio_count` | Folios | — | Número de páginas físicas |
| `reference_number` | Referencia | — | Número del doc. que origina este |
| `requires_response` | Requiere Respuesta | — | Boolean (Sí/No) |
| `due_date` | Fecha Plazo | — | Fecha límite de respuesta |
| `attachment` | Adjuntar Archivo | — | PDF escaneado |
| `author_initials` | Sigla Autor | — | Iniciales del autor |
| `priority` | Prioridad | ✅ | baja/media/alta/urgente |
| `destination_area_id` | Oficina destino | ✅ | A qué área va |
| `is_copy` | Copia | — | Si va como copia a otras áreas |

**Campos faltantes en el modelo actual de `Document`:**
- `folio_count: integer`
- `reference_number: string`
- `requires_response: boolean`
- `author_initials: string`
- `direction: enum [entrada, interno, salida]`

---

## 5. Flujo de bandeja (STD IGP Manual)

El STD IGP organiza los documentos en 3 bandejas por usuario. Equivalencia para hal-docs:

| Bandeja STD | Descripción | Equivalente en hal-docs |
|---|---|---|
| **Pendientes** | Documentos por atender (sin aceptar o aceptados sin acción) | Documentos donde el usuario es destinatario y status ≠ archivado/anulado |
| **Derivados** | Documentos que el usuario derivó a otro | Documentos donde `created_by = current_user` y status = `derivado` |
| **Finalizados** | Documentos cerrados/archivados por el usuario | Documentos donde status = `archivado` o `respondido` |

### Acciones por estado (STD IGP)

| Acción | Disponible para | Descripción |
|---|---|---|
| **Aceptar** | Pendientes sin aceptar | Confirma recepción |
| **Derivar** | Pendientes aceptados | Redirige a otra área/persona |
| **Delegar** | Pendientes aceptados | Asigna a otro responsable dentro del área |
| **Agregar Avance** | Pendientes en proceso | Registra nota de progreso |
| **Finalizar** | Pendientes aceptados | Cierra el trámite con observación |
| **Revertir** | Finalizados | Devuelve a bandeja de Pendientes |

**Features faltantes en hal-docs:**
- Acción `delegar` (asignar a otro usuario dentro del área)
- Acción `agregar_avance` (registro de progreso con timestamp)
- Acción `revertir` (de archivado a en_proceso)
- Campo `accepted_at: datetime` — timestamp de cuando el destinatario acepta

---

## 6. Firma digital y certificados (INDECOPI + DS 098-2025)

### Definiciones legales
| Término | Definición |
|---|---|
| **Firma Electrónica** | Símbolo electrónico que autentica (equivale a firma manuscrita) |
| **Firma Digital** | Firma electrónica con criptografía asimétrica (par clave pública/privada) |
| **Certificado Digital** | Emitido por CA (RENIEC), vincula par de claves con una persona. Vigencia: **1 año** |

### Reglas de negocio
- Verificación de firma: al recibir un documento con adjunto PDF, el sistema **debe validar automáticamente** la firma (`FirmaPeruService#validate`).
- Si el adjunto no tiene firma válida → estado `devuelto` con observación.
- El certificado vence en 1 año → notificar **30 días antes** del vencimiento.
- En caso de desvinculación laboral → revocar certificado inmediatamente.

### Campos faltantes en `DigitalCertificate`
```ruby
t.date    :expires_on
t.boolean :revoked,         default: false
t.datetime :revoked_at
t.string  :revoked_reason   # 'desvinculacion', 'perdida', 'robo', 'vencimiento'
t.string  :signature_type   # 'electronica', 'digital', 'manuscrita'
```

### Campo faltante en `Document`
```ruby
t.string :signature_type   # 'none', 'electronica', 'digital'
```

---

## 7. Timestamp oficial y horario de notificación (INDECOPI)

### Regla
- La **fecha y hora del servidor** es la fecha legal del documento, nunca la del cliente.
- Horario válido de recepción: **08:30 a 17:30** días hábiles.
- Documentos enviados después de las 17:30 → se consideran recibidos el **día hábil siguiente a las 08:30**.

### MESA DIGITAL PERÚ (DS 098-2025, art. 46)
La plataforma nacional acepta documentos **24/7** pero el cómputo de plazos corre desde el día hábil siguiente.

### Campos sugeridos en `Document`
```ruby
t.datetime :received_at    # timestamp oficial del servidor (no del cliente)
t.boolean  :outside_hours, default: false  # true si se registró fuera de horario
```

### Helper requerido
```ruby
# lib/business_hours.rb
def next_business_day(time)
  # lunes-viernes 08:30-17:30
  # considerar feriados peruanos
end
```

---

## 8. Control de acceso documental (Ley 25323, art. 5°-d)

### Niveles de acceso
| Nivel | Quién puede ver |
|---|---|
| `publico` | Todos los usuarios del sistema |
| `interno` | Solo usuarios del área remitente y destinataria |
| `reservado` | Solo el registrador y roles superiores |
| `confidencial` | Acceso explícito por el jefe del área |

### Campo faltante en `Document`
```ruby
t.integer :access_level, default: 0  # enum: publico, interno, reservado, confidencial
```

---

## 9. Roles de usuario por área (INDECOPI + STD IGP)

### Roles identificados
| Rol | Permisos |
|---|---|
| `admin` | Administrador del sistema, acceso total |
| `jefe` | Jefe de área, puede designar suscriptores de certificados, aprobar documentos |
| `secretaria` | Recibe y envía documentos en nombre del área (rol principal en STD) |
| `miembro` | Puede crear y ver documentos del área |
| `readonly` | Solo consulta |

### Validación requerida en `DocumentsController#create`
```ruby
# Solo secretaria/jefe/admin del área pueden registrar documentos
unless current_user.area_membership.role.in?(%w[secretaria jefe admin])
  render json: { error: 'Sin permisos para registrar documentos' }, status: :forbidden
end
```

### Campo en `AreaMembership`
```ruby
t.string :role, default: 'miembro'
# enum: admin, jefe, secretaria, miembro, readonly
```

---

## 10. Auditoría y trazabilidad (Ley 25323, art. 5°-e + DS 098-2025)

### Requerimientos
- Registrar **cada cambio de estado** con: quién, cuándo, desde qué estado, hacia qué estado.
- Los documentos archivados **no se pueden eliminar** físicamente.
- Se debe poder generar un **flujo de trabajo** (cadena de derivaciones) visible en el detalle.

### Implementación con PaperTrail
```ruby
# app/models/document.rb
has_paper_trail only: [:status, :area_id, :assigned_to]
```

### Modelo `DocumentFlow` (alternativa más explícita)
```ruby
# Registra cada acción en el flujo
create_table :document_flows do |t|
  t.references :document
  t.references :from_area
  t.references :to_area
  t.references :performed_by, class_name: 'User'
  t.string  :action        # 'registrado', 'derivado', 'delegado', 'avance', 'finalizado'
  t.string  :from_status
  t.string  :to_status
  t.text    :observations
  t.datetime :performed_at
end
```

---

## 11. Interoperabilidad — Plataformas nacionales (DS 098-2025)

El DS 098-2025-PCM establece bloques básicos de interoperabilidad de uso **obligatorio** para entidades públicas:

| Plataforma | Relevancia para hal-docs |
|---|---|
| **FIRMA PERÚ** | ✅ Ya integrado via `FirmaPeruService` |
| **ID GOB.PE** | Autenticación ciudadana vía RENIEC/MIGRACIONES. Futuro: login con DNI electrónico |
| **SGD PERÚ** | Sistema Integral de Gestión Documental del Estado — hal-docs debería poder exportar/sincronizar con este sistema |
| **MESA DIGITAL PERÚ** | Recepción de documentos de ciudadanos 24/7 — podría ser el canal de entrada externa |
| **CASILLA ÚNICA PERÚ** | Buzón de notificaciones electrónicas — para notificar al ciudadano el estado de su trámite |
| **PIDE** | Interoperabilidad entre entidades — consulta de datos (RUC, DNI, etc.) |

### Feature sugerido
- Endpoint `POST /api/v1/documents/from_mesa_digital` para recibir documentos desde MESA DIGITAL PERÚ.
- Notificaciones via `CASILLA ÚNICA PERÚ` cuando un trámite cambia de estado.

---

## 12. Preservación y archivo (Ley 25323, art. 5°-c)

### Requerimientos
- Los adjuntos (PDFs) deben tener **redundancia** — en producción usar S3/GCS, no almacenamiento local.
- Guardar **hash SHA-256** del archivo al momento de la carga para verificar integridad.
- El periodo de retención varía por tipo de documento → campo `retention_period` en `DocumentType`.

### Campo faltante en `DocumentType`
```ruby
t.integer :retention_years   # años mínimos de conservación (ej: 5, 10, permanente=0)
```

### Callback sugerido en `Document`
```ruby
after_save :compute_attachment_checksum

def compute_attachment_checksum
  return unless attachment.attached?
  self.update_column(:attachment_checksum, Digest::SHA256.hexdigest(attachment.download))
end
```

### Campo faltante en `Document`
```ruby
t.string :attachment_checksum   # SHA-256 del archivo adjunto
```

---

## 13. Jerarquía institucional de archivos (Ley 25323, art. 3°)

El sistema de archivos tiene 3 niveles:
1. **Archivo General de la Nación** (rector nacional)
2. **Archivos Regionales**
3. **Archivos Públicos** (entidades individuales)

### Campo faltante en `Area`
```ruby
t.string :archive_type   # enum: general, regional, public
```

---

## 14. Seeds recomendados (`db/seeds.rb`)

### Tipos de documento mínimos
```ruby
DocumentType.create!([
  { name: 'Oficio',       code: 'OFI', retention_years: 5  },
  { name: 'Memorándum',   code: 'MEM', retention_years: 3  },
  { name: 'Informe',      code: 'INF', retention_years: 5  },
  { name: 'Carta',        code: 'CAR', retention_years: 5  },
  { name: 'Resolución',   code: 'RES', retention_years: 10 },
  { name: 'Expediente',   code: 'EXP', retention_years: 10 },
  { name: 'Anexo',        code: 'ANX', retention_years: 3  },
])
```

---

## 15. Backlog de features derivado de los documentos normativos

| Prioridad | Feature | Archivos afectados |
|---|---|---|
| 🔴 Alta | Numeración automática `{TIPO}-{AÑO}-{SEQ}` | `document.rb`, migración |
| 🔴 Alta | Validación automática de firma al crear con adjunto | `documents_controller.rb`, `FirmaPeruService` |
| 🔴 Alta | `has_paper_trail` en `Document` + historial en UI | `document.rb`, `TramiteDetailPage` |
| 🔴 Alta | Estado `devuelto` en `DocumentStatus` | migración, tipos frontend |
| 🟠 Media | Bandeja de Pendientes/Derivados/Finalizados por usuario | nueva página + endpoint |
| 🟠 Media | Acción `delegar` (asignar a otro usuario) | controller, modelo |
| 🟠 Media | Acción `agregar_avance` con timestamp | controller, modelo |
| 🟠 Media | Campo `access_level` en `Document` + autorización | migración, controller |
| 🟠 Media | Rol `secretaria`/`jefe` en `AreaMembership` + validación | migración, controller |
| 🟠 Media | `expires_on` / `revoked` en `DigitalCertificate` | migración, modelo |
| 🟠 Media | `received_at` + lógica de días hábiles | modelo, controller |
| 🟠 Media | Campo `direction` (entrada/interno/salida) en `Document` | migración, frontend |
| 🟡 Baja | Seeds de tipos de documento (OFI, MEM, INF, CAR, RES) | `seeds.rb` |
| 🟡 Baja | `retention_years` en `DocumentType` | migración |
| 🟡 Baja | `attachment_checksum` SHA-256 al subir archivo | modelo, callback |
| 🟡 Baja | `CertificateExpiryNotificationJob` (30 días antes) | nuevo job |
| 🟡 Baja | `archive_type` en `Area` | migración |
| 🟡 Baja | Exportar a Excel/PDF desde listados | controller, frontend |
| 🟡 Baja | Integración con MESA DIGITAL PERÚ (recepción externa) | nuevo endpoint |
