# Seeds system roles in the test DB before the full suite runs.
# admin and mesa_de_partes are the two production system roles (is_system: true).
# manager and staff are kept as custom roles (is_system: false) so that existing
# shared examples for "admin or manager required" authorization continue to work.
RSpec.configure do |config|
  config.before(:suite) do
    [
      { name: "admin",          display_name: "Administrador",  color: "#9d174d", bg_color: "#fce7f3", is_system: true  },
      { name: "mesa_de_partes", display_name: "Mesa de Partes", color: "#0369a1", bg_color: "#e0f2fe", is_system: true  },
      { name: "manager",        display_name: "Gestor",         color: "#5b21b6", bg_color: "#ede9fe", is_system: false },
      { name: "staff",          display_name: "Personal",       color: "#475569", bg_color: "#f1f5f9", is_system: false },
    ].each do |attrs|
      SystemRole.find_or_create_by!(name: attrs[:name]) do |r|
        r.display_name = attrs[:display_name]
        r.color        = attrs[:color]
        r.bg_color     = attrs[:bg_color]
        r.is_system    = attrs[:is_system]
      end
    end
  end
end
