# Roles y Permisos

## Descripción general

El sistema utiliza un modelo de roles dinámicos almacenados en base de datos. Cada usuario tiene un rol a nivel de sistema que determina a qué páginas puede acceder. Los administradores pueden crear roles personalizados adicionales a los tres roles base.

---

## Tablas involucradas

### `system_roles`

Catálogo de roles disponibles en el sistema.

| Columna        | Tipo    | Descripción                                          |
|----------------|---------|------------------------------------------------------|
| `name`         | string  | Identificador único en minúsculas (ej. `admin`)      |
| `display_name` | string  | Nombre visible en la UI (ej. `Administrador`)        |
| `color`        | string  | Color de texto en hex (ej. `#9d174d`)                |
| `bg_color`     | string  | Color de fondo en hex (ej. `#fce7f3`)                |
| `is_system`    | boolean | `true` → rol protegido, no se puede eliminar ni renombrar |

### `role_permissions`

Matriz de acceso: un registro por cada combinación `(role, page_key)`.

| Columna    | Tipo    | Descripción                              |
|------------|---------|------------------------------------------|
| `role`     | string  | Nombre del rol (FK lógica a `system_roles.name`) |
| `page_key` | string  | Identificador de la página/módulo        |
| `allowed`  | boolean | `true` → el rol puede acceder            |

Existe un índice único sobre `(role, page_key)`.

### `users.role`

Columna `string` en la tabla `users`. Almacena el nombre del rol del sistema al que pertenece el usuario. Validado contra la tabla `system_roles`.

---

## Roles del sistema (protegidos)

Estos tres roles se crean en el seed inicial y **no pueden eliminarse ni renombrarse**.

| `name`    | `display_name` | Acceso por defecto                                                  |
|-----------|----------------|---------------------------------------------------------------------|
| `admin`   | Administrador  | Todas las páginas                                                   |
| `manager` | Gestor         | Todas las páginas excepto `tipos_doc` y `configuracion`             |
| `staff`   | Personal       | `dashboard`, `tramites`, `documentos`, `pendientes`, `archivo`, `mis_certificados`, `mis_derivados`, `mesa_virtual_admin` |

---

## Páginas configurables (`page_key`)

```
dashboard          tramites           documentos         pendientes
archivo            usuarios           areas              tipos_doc
mis_certificados   mis_derivados      mesa_virtual_admin accesos
reportes           configuracion
```

---

## Flujo de creación de un rol personalizado

1. El administrador crea el rol vía `POST /api/v1/system_roles`.
2. El sistema inserta un registro en `system_roles` con `is_system: false`.
3. Se generan automáticamente registros en `role_permissions` para **todas** las `page_key`, con `allowed: false` por defecto.
4. El administrador ajusta el acceso desde la pestaña **Permisos** en `/admin/accesos`.

---

## Reglas de negocio

- Un rol **no puede eliminarse** si tiene usuarios asignados.
- Los roles `admin`, `manager` y `staff` no pueden eliminarse ni renombrarse (solo se puede cambiar `display_name`, `color` y `bg_color`).
- Un usuario siempre debe tener un rol que exista en `system_roles`. Si se elimina un rol, primero se debe reasignar a todos sus usuarios.
- Los permisos se pueden actualizar individualmente (toggle por celda). Cada cambio persiste de forma inmediata.

---

## API

### Roles

| Método | Ruta                         | Descripción                       | Acceso    |
|--------|------------------------------|-----------------------------------|-----------|
| GET    | `/api/v1/system_roles`       | Lista todos los roles             | Cualquier usuario autenticado |
| POST   | `/api/v1/system_roles`       | Crea un nuevo rol                 | Solo `admin` |
| PATCH  | `/api/v1/system_roles/:id`   | Edita `display_name`/colores      | Solo `admin` |
| DELETE | `/api/v1/system_roles/:id`   | Elimina un rol (si es deletable)  | Solo `admin` |

### Permisos

| Método | Ruta                                    | Descripción                                      | Acceso              |
|--------|-----------------------------------------|--------------------------------------------------|---------------------|
| GET    | `/api/v1/role_permissions/my_permissions` | Permisos del usuario actual (usados por el frontend para mostrar/ocultar menús) | Cualquier usuario autenticado |
| GET    | `/api/v1/role_permissions`              | Matriz completa de todos los roles y páginas     | `admin` o `manager` |
| PATCH  | `/api/v1/role_permissions/update_batch` | Actualiza uno o más permisos en una transacción  | `admin` o `manager` |

**Ejemplo de body para `update_batch`:**
```json
{
  "permissions": {
    "manager": { "reportes": true },
    "custom_role": { "usuarios": false, "areas": true }
  }
}
```

---

## Modelo de datos (diagrama)

```
users
 └── role (string) ──────────────────┐
                                     ▼
                              system_roles
                               ├── name          (unique)
                               ├── display_name
                               ├── color
                               ├── bg_color
                               └── is_system

role_permissions
 ├── role     ──────────── referencia lógica a system_roles.name
 ├── page_key
 └── allowed
```

---

## Archivos relevantes

| Archivo | Descripción |
|---------|-------------|
| `app/models/system_role.rb` | Modelo con validaciones y guardas de eliminación/renombrado |
| `app/models/role_permission.rb` | Modelo con `PAGE_KEYS`, `DEFAULTS` y helpers `map_for` / `ensure_defaults!` |
| `app/models/user.rb` | Validación `role_must_exist` contra `system_roles` |
| `app/controllers/api/v1/system_roles_controller.rb` | CRUD de roles |
| `app/controllers/api/v1/role_permissions_controller.rb` | Lectura y actualización de permisos |
| `app/policies/system_role_policy.rb` | Solo `admin` puede crear/editar/eliminar roles |
| `app/policies/role_permission_policy.rb` | `admin` o `manager` pueden ver y modificar permisos |
| `db/seeds.rb` | Crea los 3 roles del sistema y sus permisos base |
| `spec/support/system_roles.rb` | Siembra los 3 roles en `before(:suite)` para que los tests pasen |
| `frontend/src/pages/admin/AccesosPage.tsx` | UI para gestionar roles y permisos |
| `frontend/src/types/role.ts` | Tipos TypeScript `SystemRole` y `PermissionsMatrix` |
