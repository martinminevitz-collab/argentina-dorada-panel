// Datos de la base compartida (Supabase). Son públicos a propósito: la base está protegida
// por usuario (solo entran los mails cargados en la tabla "miembros").
// Si están vacíos, el panel funciona igual pero "Publicado" queda guardado solo en cada dispositivo.
window.AD_CONFIG = {
  supabaseUrl: "",
  supabaseKey: "",
};
