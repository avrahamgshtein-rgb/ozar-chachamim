-- Fix search vector trigger to use English only (Hebrew not available in Supabase)
CREATE OR REPLACE FUNCTION public.update_sage_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name_he, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.name_en, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.primary_field, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
