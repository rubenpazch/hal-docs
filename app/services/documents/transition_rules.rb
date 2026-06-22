module Documents
  # Pure data module — defines the valid state machine for internal documents.
  # No ActiveRecord, no side effects: all methods are predicate/query only.
  module TransitionRules
    # Which statuses a document can transition to from each source status.
    # Terminal states (archivado, finalizado, anulado) have no outgoing transitions.
    TRANSITIONS = {
      "registrado" => %w[en_proceso derivado anulado],
      "en_proceso" => %w[derivado respondido devuelto finalizado anulado],
      "derivado"   => %w[en_proceso devuelto finalizado anulado],
      "respondido" => %w[finalizado archivado anulado],
      "devuelto"   => %w[en_proceso anulado],
      "archivado"  => [],
      "finalizado" => [],
      "anulado"    => []
    }.freeze

    # Maps [from_status, to_status] → DocumentFlow#action value.
    # Keys are frozen 2-element arrays for efficient lookup.
    FLOW_ACTION = {
      %w[registrado en_proceso]  => "avance",
      %w[registrado derivado]    => "derivado",
      %w[registrado anulado]     => "anulado",
      %w[en_proceso derivado]    => "derivado",
      %w[en_proceso respondido]  => "avance",
      %w[en_proceso devuelto]    => "devuelto",
      %w[en_proceso finalizado]  => "finalizado",
      %w[en_proceso anulado]     => "anulado",
      %w[derivado en_proceso]    => "avance",
      %w[derivado devuelto]      => "devuelto",
      %w[derivado finalizado]    => "finalizado",
      %w[derivado anulado]       => "anulado",
      %w[respondido finalizado]  => "finalizado",
      %w[respondido archivado]   => "avance",
      %w[respondido anulado]     => "anulado",
      %w[devuelto en_proceso]    => "avance",
      %w[devuelto anulado]       => "anulado"
    }.freeze

    # Statuses that require a destination area to be provided.
    REQUIRES_AREA = %w[derivado].freeze

    # Returns true if the transition from → to is allowed.
    def self.valid?(from:, to:)
      TRANSITIONS.fetch(from.to_s, []).include?(to.to_s)
    end

    # Returns the DocumentFlow action name for a given transition pair.
    # Returns nil for unknown pairs (should not happen after validation).
    def self.action_for(from:, to:)
      FLOW_ACTION[[from.to_s, to.to_s]]
    end

    # Returns true when the target status requires a to_area_id.
    def self.requires_area?(to:)
      REQUIRES_AREA.include?(to.to_s)
    end

    # Returns all valid next statuses from the given status.
    def self.allowed_from(status)
      TRANSITIONS.fetch(status.to_s, [])
    end
  end
end
