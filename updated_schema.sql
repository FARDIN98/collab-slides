-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.presentation_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  presentation_id uuid,
  nickname text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['creator'::text, 'editor'::text, 'viewer'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT presentation_users_pkey PRIMARY KEY (id),
  CONSTRAINT presentation_users_presentation_id_fkey FOREIGN KEY (presentation_id) REFERENCES public.presentations(id)
);
CREATE TABLE public.presentations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  creator_nickname text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT presentations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.slides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  presentation_id uuid,
  slide_number integer NOT NULL,
  content_json jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT slides_pkey PRIMARY KEY (id),
  CONSTRAINT slides_presentation_id_fkey FOREIGN KEY (presentation_id) REFERENCES public.presentations(id)
);