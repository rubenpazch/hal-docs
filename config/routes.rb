Rails.application.routes.draw do
  devise_for :users,
    path: "",
    path_names: {
      sign_in: "api/v1/auth/login",
      sign_out: "api/v1/auth/logout",
      registration: "api/v1/auth/signup"
    },
    controllers: {
      sessions: "api/v1/auth/sessions",
      registrations: "api/v1/auth/registrations"
    }

  namespace :api do
    namespace :v1 do
      # Documents
      resources :documents do
        member do
          patch :update_status
          post  :validate_signature
        end
        collection do
          get :search
          get :mine
        end
      end

      # File repository — archivos pre-uploaded and optionally signed
      resources :archivos, only: [:index, :show, :create, :destroy] do
        member do
          post :sign
        end
      end

      # Document bundles (groups of archivos)
      resources :document_bundles do
        member do
          post   :add_archivo
          delete :remove_archivo
        end
      end

      # Users management
      resources :users, only: [:index, :show, :create, :update, :destroy] do
        member do
          patch :restore
          patch :update_role
        end
      end

      # Areas
      resources :areas do
        member do
          patch :restore
          get   :members
          post  :add_member
          patch 'members/:membership_id', to: 'areas#update_member', as: :update_area_member
          delete 'members/:membership_id', to: 'areas#remove_member', as: :remove_area_member
        end
      end

      # Document types
      resources :document_types

      # Dashboard
      get "dashboard", to: "dashboard#index"

      # Digital certificates (current user's certificates)
      resources :digital_certificates, only: [:index, :show, :create, :destroy] do
        member do
          patch :set_default
          post  :sign_document
        end
      end

      # ── Current user profile ──────────────────────────────────────────────
      get  "me",        to: "profile#show"
      patch "me",       to: "profile#update"
      patch "me/password", to: "profile#update_password"

      # ── Role-based menu permissions ───────────────────────────────────────
      get  "role_permissions/my_permissions", to: "role_permissions#my_permissions"
      get  "role_permissions",                to: "role_permissions#index"
      patch "role_permissions/update_batch",  to: "role_permissions#update_batch"

      # ── System roles (dynamic role management) ────────────────────────────
      resources :system_roles, only: [:index, :create, :update, :destroy]

      # ── Mesa Virtual (public — no authentication required) ─────────────────
      scope :mesa_virtual do
        get  "document_types", to: "virtual_submissions#document_types"
        post "submit",         to: "virtual_submissions#create"
        get  "track",          to: "virtual_submissions#track"
      end

      # ── Mesa Virtual — admin management (authenticated) ──────────────────
      scope :admin do
        resources :virtual_submissions, only: [:index, :show], controller: "admin_virtual_submissions" do
          member do
            patch :update_status
          end
        end
        # Bandeja del área: trámites derivados a mi área desde Mesa Virtual
        get "bandeja/virtual_submissions", to: "admin_virtual_submissions#bandeja"
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
