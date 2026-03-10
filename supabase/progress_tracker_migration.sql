-- Migration: Add Progress Tracker Columns to Tramites

ALTER TABLE public.tramites 
ADD COLUMN IF NOT EXISTS etapa1_status VARCHAR DEFAULT 'PENDIENTE',
ADD COLUMN IF NOT EXISTS etapa2_status VARCHAR DEFAULT 'PENDIENTE';

-- Update existing records to reflect their inferred status based on fase_actual and estado_general

-- For multi-stage (L2, L3, L4, L5)
UPDATE public.tramites
SET 
  etapa1_status = CASE
    WHEN estado_general = 'FINALIZADO' THEN 'COMPLETADO'
    WHEN fase_actual = 'CARNET' THEN 'EN_PROCESO'
    WHEN fase_actual = 'LICENCIA' THEN 'COMPLETADO'
    ELSE 'PENDIENTE'
  END,
  etapa2_status = CASE
    WHEN estado_general = 'FINALIZADO' THEN 'COMPLETADO'
    WHEN fase_actual = 'LICENCIA' THEN 'EN_PROCESO'
    ELSE 'PENDIENTE'
  END
WHERE tipo_tramite IN ('L2', 'L3', 'L4', 'L5');

-- For single stage (L1, L6) where they only have one step
UPDATE public.tramites
SET 
  etapa1_status = CASE
    WHEN estado_general = 'FINALIZADO' THEN 'COMPLETADO'
    WHEN estado_general = 'PENDIENTE' THEN 'EN_PROCESO'
    ELSE 'PENDIENTE'
  END,
  etapa2_status = 'NO_REQUIERE'
WHERE tipo_tramite IN ('L1', 'L6');

-- Note: Other trmites (like TP, TARJETA DE PROPIEDAD, OTROS) won't have the tracker but we can set default to 'NO_REQUIERE' or just leave PENDIENTE.
UPDATE public.tramites
SET 
  etapa1_status = 'NO_REQUIERE',
  etapa2_status = 'NO_REQUIERE'
WHERE tipo_tramite NOT IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6');
