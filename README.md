# OrganizApp

PWA de productividad gamificada con tono sarcástico: Matriz de Eisenhower + sistema de puntos + rachas diarias.

## Requisitos
- Node.js 18 o superior

## Instalación local

```bash
npm install
npm run dev
```

Abre el navegador en la URL que muestre la terminal (normalmente `http://localhost:5173`).

## Build de producción

```bash
npm run build
npm run preview
```

## Despliegue en Vercel (gratis, 3 pasos)

1. **Sube el proyecto a GitHub**
   ```bash
   git init
   git add .
   git commit -m "OrganizApp inicial"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/organizapp.git
   git push -u origin main
   ```
   (Crea antes el repositorio vacío en https://github.com/new)

2. **Conecta con Vercel**
   Entra a [vercel.com](https://vercel.com), inicia sesión con GitHub (gratis), click en
   **"Add New Project"** y selecciona el repositorio `organizapp`.

3. **Deploy**
   Vercel detecta automáticamente que es un proyecto Vite (`npm run build`, output `dist`).
   Dale a **"Deploy"** y en menos de un minuto tendrás tu app pública en
   `https://organizapp.vercel.app` (o el subdominio que elijas), con HTTPS y
   redeploy automático en cada `git push`.

## Notas técnicas
- Persistencia: `localStorage` (clave `organizapp_data_v1`).
- Notificaciones: usa la API nativa `Notification.requestPermission()` del navegador.
  Requiere HTTPS (Vercel lo da por defecto) — en local con `http://localhost` también funciona.
- Estructura: un único componente principal (`src/OrganizApp.jsx`) con subcomponentes
  internos (`TaskCard`, `Modal`, `CoachToast`, `CategoriaBadge`).
