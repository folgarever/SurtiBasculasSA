(function () {
  const configuracion = window.SURTIBASCULAS_CONFIG || {};
  // Por defecto la API se sirve bajo el mismo origen (proxy en local, rewrite en Vercel).
  // Se puede sobreescribir con window.API_URL o SURTIBASCULAS_CONFIG.apiUrl antes de cargar este archivo.
  window.API_URL = configuracion.apiUrl || window.API_URL || window.SURTIBASCULAS_API_URL || window.SIMET_API_URL || '/api';
  window.SURTIBASCULAS_API_URL = window.API_URL;
  window.SIMET_API_URL = window.API_URL;
})();
