# Frontend · SURTIBÁSCULAS S.A.

Aplicación web corporativa construida con Angular 22, TypeScript y Tailwind CSS 3. Incluye acceso adaptable a móviles y escritorio, presentación de marca con el logo original y controles para mostrar u ocultar contraseñas. Para las funciones y la configuración completa del sistema, consulta el [README principal](../README.md).

## Desarrollo local

Desde esta carpeta instala dependencias y ejecuta Angular:

```powershell
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200`. En desarrollo, `proxy.conf.json` envía las rutas `/api` al backend local en `http://localhost:3000`. El backend debe tener configurado `backend/.env`.

## Producción

`public/config.js` usa `/api` bajo el mismo origen. En Vercel, `vercel.json` reenvía `/api/*` al backend, por lo que no hace falta fijar una URL absoluta ni abrir CORS a otros dominios.

Si el frontend se sirve en un dominio distinto al del backend, define `window.SURTIBASCULAS_CONFIG = { apiUrl: 'https://TU-API.example.com/api' }` antes de cargar `config.js` (o `window.API_URL` / `window.SURTIBASCULAS_API_URL`) e incluye el dominio del frontend en `CORS_ORIGINS` del backend. `SIMET_API_URL` y las claves `simet_*` de `localStorage` siguen funcionando solo como compatibilidad con despliegues anteriores.

El proyecto Angular se llama `surtibasculas-frontend`; el resultado de producción queda en `dist/surtibasculas-frontend/browser`, que es lo que usa `vercel.json`.

## Comandos

```powershell
npm run build
npm test -- --watch=false
```
