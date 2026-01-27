-- Primeira migração: Apenas adicionar o valor ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';