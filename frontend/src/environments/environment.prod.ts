declare global {
  interface Window {
    API_URL?: string;
    SURTIBASCULAS_API_URL?: string;
    /** @deprecated Usar SURTIBASCULAS_API_URL. */
    SIMET_API_URL?: string;
  }
}

export const environment = {
  production: true,
  apiUrl: window.API_URL || window.SURTIBASCULAS_API_URL || window.SIMET_API_URL || '/api',
};
