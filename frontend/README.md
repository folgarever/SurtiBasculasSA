# Frontend · SURTIBASCULAS S.A.

SPA de control de asistencia construida con Angular 22, TypeScript y Tailwind CSS 3. Para la configuración completa del sistema, consulta el [README principal](../README.md).

## Desarrollo local

Desde esta carpeta instala dependencias y ejecuta Angular:

```powershell
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200`. En desarrollo, `proxy.conf.json` envía las rutas `/api` al backend local en `http://localhost:3000`. El backend debe tener configurado `backend/.env`.

## Producción

Configura `public/config.js` con la URL pública HTTPS de la API, incluyendo `/api`, y permite el dominio del frontend en la configuración CORS del backend:

```js
window.API_URL = 'https://TU-API.example.com/api';
window.SIMET_API_URL = window.API_URL;
```

## Comandos

```powershell
npm run build
npm test -- --watch=false
```
