// Conexión con Supabase para las cuentas de usuario.
// Copia estos dos valores de tu proyecto: Project Settings → API Keys (o "Connect" en el panel).
// La clave "publishable" (o "anon") es pública por diseño: lo que protege los datos de cada
// usuario son las políticas de seguridad (RLS) de la tabla, ver supabase/esquema.sql.
// Si se dejan vacíos, la página funciona igual, pero solo con datos en el dispositivo.

export const SUPABASE_URL = 'https://rfzwstbrbfzvothofvfw.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_ZcnWh2YxjyZa4rdxJ8ZFlw_pQRiN_Fs';
