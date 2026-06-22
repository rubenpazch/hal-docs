# Sistema de Trámite Documentario - Seeds
#
# NOTE: Users are intentionally NOT created here so that passwords are never
# committed to source control. Create users on demand with the interactive task:
#
#   bin/rails users:create
#
# (it prompts for the password without echoing it to the terminal).

# ── System Roles (must run before role_permissions) ────────────────────────
# Only two system roles exist by default:
#   admin         — global administrator; no functional area within the org.
#   mesa_de_partes — all external document intake is automatically routed here.
[
  { name: "admin",          display_name: "Administrador",  color: "#9d174d", bg_color: "#fce7f3", is_system: true },
  { name: "mesa_de_partes", display_name: "Mesa de Partes", color: "#0369a1", bg_color: "#e0f2fe", is_system: true },
].each do |attrs|
  SystemRole.find_or_create_by!(name: attrs[:name]) do |r|
    r.display_name = attrs[:display_name]
    r.color        = attrs[:color]
    r.bg_color     = attrs[:bg_color]
    r.is_system    = attrs[:is_system]
  end
end
puts "System roles seeded"

# Document Types — Tipos normativos con años de retención (Ley 25323 + Manual IGP)
[
  { name: "Oficio",       code: "OFI", retention_years: 5,  description: "Comunicación externa de la institución" },
  { name: "Memorándum",   code: "MEM", retention_years: 3,  description: "Comunicación interna entre áreas" },
  { name: "Informe",      code: "INF", retention_years: 5,  description: "Informe técnico de área hacia gerencia" },
  { name: "Carta",        code: "CAR", retention_years: 5,  description: "Comunicación con firma manuscrita, externos" },
  { name: "Resolución",   code: "RES", retention_years: 10, description: "Decisión institucional formal" },
  { name: "Expediente",   code: "EXP", retention_years: 10, description: "Documento de trámite ciudadano (TUPA)" },
  { name: "Anexo",        code: "ANX", retention_years: 3,  description: "Adjunto a un documento principal" },
  { name: "Solicitud",    code: "SOL", retention_years: 5,  description: "Solicitud de ciudadano o entidad" },
  { name: "Contrato",     code: "CON", retention_years: 10, description: "Contrato o convenio institucional" },
  { name: "Acta",         code: "ACT", retention_years: 5,  description: "Acta de reunión o sesión" },
  { name: "Directiva",    code: "DIR", retention_years: 10, description: "Directiva interna de gestión" },
].each do |attrs|
  DocumentType.find_or_create_by!(code: attrs[:code]) do |dt|
    dt.name            = attrs[:name]
    dt.description     = attrs[:description]
    dt.retention_years = attrs[:retention_years]
    dt.is_active       = true
  end
end
puts "Document types seeded"

# ── Default Area: Mesa de Partes ───────────────────────────────────────────
# This is the only pre-seeded area. All external documents are routed here
# automatically. Other areas are created by administrators as needed.
Area.find_or_create_by!(name: "Mesa de Partes") do |a|
  a.area_type  = :departamento
  a.is_default = true
  a.description = "Área encargada de la recepción y registro de documentos externos"
end
puts "Default area seeded"

# Role-based menu permissions (defaults)
RolePermission::ROLES.each do |role|
  RolePermission::PAGE_KEYS.each do |page_key|
    allowed = RolePermission::DEFAULTS.dig(role, page_key) != false
    RolePermission.find_or_create_by!(role: role, page_key: page_key) do |rp|
      rp.allowed = allowed
    end
  end
end
puts "Role permissions seeded"
