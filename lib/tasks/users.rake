# frozen_string_literal: true

require "io/console"

namespace :users do
  desc "Create a user interactively (prompts for a hidden password)"
  task create: :environment do
    def prompt(label, default: nil, required: true)
      suffix = default ? " [#{default}]" : ""
      loop do
        print "#{label}#{suffix}: "
        value = $stdin.gets&.strip.to_s
        value = default.to_s if value.empty? && default
        return value if !required || !value.empty?

        puts "  ↳ This field is required."
      end
    end

    def prompt_password
      loop do
        password = $stdin.getpass("Password (hidden): ")
        if password.to_s.strip.empty?
          puts "  ↳ Password cannot be blank."
          next
        end

        confirmation = $stdin.getpass("Confirm password (hidden): ")
        return password if password == confirmation

        puts "  ↳ Passwords do not match. Try again."
      end
    end

    roles = User.roles.keys
    puts "── Create user ──────────────────────────────────────────────"

    email     = prompt("Email")
    nombre    = prompt("Nombre (first name)")
    apellido  = prompt("Apellido (last name)")
    dni       = prompt("DNI (8 digits)")
    role      = prompt("Role (#{roles.join(' / ')})", default: "staff")
    cargo     = prompt("Cargo (job title)", required: false)
    area_name = prompt("Area name (optional)", required: false)

    unless roles.include?(role)
      abort "Invalid role '#{role}'. Must be one of: #{roles.join(', ')}"
    end

    password = prompt_password

    user = User.new(
      email: email,
      nombre: nombre,
      apellido: apellido,
      dni: dni,
      role: role,
      cargo: cargo.presence,
      password: password,
      password_confirmation: password
    )

    unless area_name.empty?
      area = Area.find_by(name: area_name)
      user.area = area if area
      # Keep the free-text area column in sync (association method shadows the column).
      user[:area] = area_name
    end

    if user.save
      puts "✓ Created #{user.role} user: #{user.email} (#{user.full_name})"
    else
      abort "✗ Could not create user:\n  - #{user.errors.full_messages.join("\n  - ")}"
    end
  end
end
