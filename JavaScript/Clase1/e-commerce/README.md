# EscuadronLobo Market

E-commerce de productos tecnológicos con frontend estático, backend Express y pagos mediante Mercado Pago.

## Estructura

- `client/`: frontend estático publicado en Netlify.
- `server/`: backend Express que crea las preferencias de Mercado Pago y está publicado en Render.
- `netlify.toml`: configuración de publicación del frontend.

## Requisitos

- Git
- Node.js 22 o superior
- pnpm 12 o superior
- Una cuenta de Mercado Pago
- Una cuenta de GitHub
- Una cuenta de Render y otra de Netlify para publicar el ecommerce

Podés comprobar las versiones con:

```bash
node --version
pnpm --version
```

## Clonar el repositorio

```bash
git clone https://github.com/dariosci/Tecnicatura3.git
cd Tecnicatura3/JavaScript/Clase1/e-commerce
```

## Ejecutar el backend localmente

Entrá en la carpeta del servidor e instalá sus dependencias:

```bash
cd server
pnpm install
```

Creá un archivo `.env` en esa carpeta. No lo subas a GitHub:

```env
MP_ACCESS_TOKEN=tu_access_token_de_mercadopago
PUBLIC_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

Iniciá el servidor:

```bash
pnpm start
```

Para desarrollo con reinicio automático:

```bash
pnpm run dev
```

El ecommerce estará disponible en <http://localhost:3000>.

## Configuración del frontend

El frontend usa la etiqueta `api-url` de `client/index.html` para saber dónde está el backend:

```html
<meta name="api-url" content="https://tu-backend.onrender.com">
```

Para trabajar completamente en local, dejala vacía:

```html
<meta name="api-url" content="">
```

Con una URL vacía, el navegador usa el mismo origen (`/create_preference`).

## Publicar el backend en Render

1. Subí los cambios a GitHub.
2. En Render elegí **New + > Web Service**.
3. Conectá el repositorio `dariosci/Tecnicatura3`.
4. Configurá:

   ```text
   Root Directory: JavaScript/Clase1/e-commerce/server
   Build Command: pnpm install --frozen-lockfile
   Start Command: pnpm start
   ```

5. En **Environment Variables** agregá las siguientes variables, sin comillas:

   ```text
   MP_ACCESS_TOKEN=tu_token_nuevo_de_mercadopago
   PUBLIC_URL=https://tu-backend.onrender.com
   FRONTEND_URL=https://tu-sitio.netlify.app
   NODE_ENV=production
   ```

6. Hacé el deploy y copiá la URL HTTPS que Render asigne.
7. Verificá que `https://tu-backend.onrender.com/` responda correctamente.

`PUBLIC_URL` es la URL del backend. Render la usa para que Mercado Pago vuelva a `/feedback` después del pago.

`FRONTEND_URL` es la URL del sitio publicado en Netlify. El backend la usa para redirigir el resultado final al ecommerce.

Render proporciona automáticamente `PORT`; el servidor ya está preparado para utilizarlo.

## Publicar el frontend en Netlify

1. En Netlify elegí **Add new project > Import an existing project**.
2. Seleccioná el repositorio `dariosci/Tecnicatura3`.
3. El archivo `netlify.toml` ya define la carpeta correcta:

   ```text
   Base directory: JavaScript/Clase1/e-commerce/client
   Publish directory: .
   Build command: vacío
   ```

4. Antes del primer deploy, comprobá que `client/index.html` tenga la URL real de Render:

   ```html
   <meta name="api-url" content="https://tu-backend.onrender.com">
   ```

5. Publicá el sitio y copiá la URL HTTPS que Netlify asigne.
6. Actualizá `FRONTEND_URL` en Render con esa URL y hacé un redeploy del backend.

Cada vez que cambies el código, hacé commit y push desde la raíz del repositorio:

```bash
git add .
git commit -m "Describir cambio"
git push origin main
```

Netlify y Render pueden volver a desplegar automáticamente el último commit.

## Probar el pago

1. Abrí la URL de Netlify.
2. Agregá un producto al carrito.
3. Elegí **Ir a pagar**.
4. Completá el checkout de Mercado Pago con credenciales de prueba si estás usando el entorno de pruebas.
5. Confirmá que, después del pago, vuelvas a la URL de Netlify y veas el estado aprobado, pendiente o rechazado.

También podés comprobar manualmente el backend:

```bash
curl https://tu-backend.onrender.com/
```

El endpoint de preferencias es:

```text
POST https://tu-backend.onrender.com/create_preference
```

## Seguridad

- Nunca subas `.env` al repositorio.
- Nunca publiques `MP_ACCESS_TOKEN` en el frontend.
- Usá un token nuevo si una credencial fue compartida o quedó expuesta.
- Guardá los secretos en Render, no en el código ni en Netlify.
- `server/.env.example` contiene solamente nombres y ejemplos de variables.

## Solución de problemas

### El pago devuelve un error 500

Revisá los logs de Render y confirmá que `MP_ACCESS_TOKEN` esté cargado correctamente. También verificá que el frontend use la URL real de Render en `api-url`.

### El pago intenta volver a localhost

Creá una preferencia nueva después de corregir `PUBLIC_URL`. Las preferencias anteriores conservan las URLs con las que fueron creadas.

### Mercado Pago no vuelve al sitio

Confirmá que:

- `PUBLIC_URL` sea HTTPS y corresponda al backend de Render.
- `FRONTEND_URL` sea HTTPS y corresponda al sitio de Netlify.
- El backend haya sido redeployado después de cambiar variables.
- El frontend llame a `/create_preference` mediante la URL de Render.

### Render no inicia

Confirmá que el Root Directory apunte a:

```text
JavaScript/Clase1/e-commerce/server
```

Y que el Start Command sea:

```bash
pnpm start
```
