# Sistema de Trámite Documentario - Seeds
#
# NOTE: Users are intentionally NOT created here so that passwords are never
# committed to source control. Create users on demand with the interactive task:
#
#   bin/rails users:create
#
# (it prompts for the password without echoing it to the terminal).

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

# Sample areas
gerencia = Area.find_or_create_by!(name: "Gerencia General") { |a| a.area_type = :gerencia }
[
  "Administración",
  "Recursos Humanos",
  "Producción",
  "Calidad",
  "Logística",
  "Contabilidad",
  "Tecnología de la Información",
  "Mesa de Partes",
].each do |name|
  Area.find_or_create_by!(name: name) { |a| a.area_type = :departamento; a.parent_id = gerencia.id }
end
puts "Areas seeded"

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
