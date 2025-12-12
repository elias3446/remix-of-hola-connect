
-- Fix the sync function to handle both field naming conventions (lat/lng AND latitude/longitude)
CREATE OR REPLACE FUNCTION public.sync_reportes_geolocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lat_value double precision;
  lng_value double precision;
BEGIN
  -- Try to get latitude (supports both 'lat' and 'latitude' keys)
  lat_value := COALESCE(
    (NEW.location->>'lat')::double precision,
    (NEW.location->>'latitude')::double precision
  );
  
  -- Try to get longitude (supports both 'lng' and 'longitude' keys)
  lng_value := COALESCE(
    (NEW.location->>'lng')::double precision,
    (NEW.location->>'longitude')::double precision
  );
  
  -- If we have both coordinates, set geolocation
  IF lat_value IS NOT NULL AND lng_value IS NOT NULL THEN
    NEW.geolocation := ST_SetSRID(
      ST_MakePoint(lng_value, lat_value),
      4326
    )::geography;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix existing records that have lat/lng but no geolocation
UPDATE reportes
SET geolocation = ST_SetSRID(
  ST_MakePoint(
    COALESCE((location->>'lng')::double precision, (location->>'longitude')::double precision),
    COALESCE((location->>'lat')::double precision, (location->>'latitude')::double precision)
  ),
  4326
)::geography
WHERE geolocation IS NULL
AND location IS NOT NULL
AND (
  (location->>'lat' IS NOT NULL AND location->>'lng' IS NOT NULL)
  OR (location->>'latitude' IS NOT NULL AND location->>'longitude' IS NOT NULL)
);
