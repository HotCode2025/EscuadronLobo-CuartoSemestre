# LOBO Market

Tienda de demostracion construida con Django. Incluye catalogo de productos, cuentas, direcciones, carrito, checkout con pago simulado, seguimiento de pedidos y panel de administracion.

Esta guia explica como descargar el proyecto, ejecutarlo desde cero y recorrer sus funcionalidades. La aplicacion usa SQLite por defecto; tambien puede conectarse a PostgreSQL mediante una variable de entorno.

## Requisitos

- Python 3.12 o superior y pip.
- Git para clonar el repositorio.
- SQLite, incluido con Python, o una instancia de PostgreSQL si se elige esa base.
- Acceso a internet para cargar Bootstrap, iconos, tipografias y algunas imagenes alojadas externamente.

## Descargar y preparar

Clona el repositorio y entra en su carpeta:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_REPOSITORIO>
```

Crea y activa un entorno virtual. En Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

En macOS o Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Instala las dependencias, crea las tablas, carga el catalogo de ejemplo y crea una cuenta administradora:

```bash
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_catalog
python manage.py createsuperuser
```

`createsuperuser` solicita un nombre de usuario, correo y contrasena. Esa cuenta permite entrar al panel de administracion; no hace falta crear una cuenta normal para administrar el catalogo.

## Iniciar la tienda

```bash
python manage.py runserver
```

- Tienda: http://127.0.0.1:8000/
- Administracion: http://127.0.0.1:8000/admin/

Para detener el servidor, usa `Ctrl+C` en la terminal. Cada persona que clone el repositorio debe ejecutar sus propias migraciones y crear su propio superusuario. La base SQLite y las imagenes locales no se comparten al clonar.

## Como probar la compra

1. Entra en el catalogo. Las categorias, productos, precios, descuentos y stock iniciales los crea `seed_catalog`.
2. Registrate desde la tienda o entra con un usuario existente. La cuenta se crea con nombre de usuario, correo y contrasena.
3. Abre un producto y agregalo al carrito. Las cuentas autenticadas pueden cambiar cantidades o quitar productos.
4. En checkout, confirma la direccion y el medio de pago. El checkout comprueba el stock nuevamente antes de confirmar el pedido.
5. Consulta el resultado en **Mis pedidos**. El detalle muestra articulos, total, direccion, estado y datos de la transaccion simulada.

El comando `python manage.py seed_catalog` es idempotente: agrega las categorias y productos de demostracion que falten y completa imagenes demo vacias; no reemplaza los datos que ya se hayan editado ni una imagen local cargada desde Admin.

## Administrar el catalogo y los pedidos

Entra en `/admin/` con el superusuario. Desde alli puedes:
- Crear categorias con nombre y slug, por ejemplo `Electronica`, `Indumentaria` o `Accesorios`.
- Crear o editar productos con titulo, categoria, marca, descripcion, precio, precio con descuento, stock y estado de publicacion.
- Subir un archivo de imagen o indicar una URL externa de imagen.
- Buscar y filtrar clientes, direcciones, productos, carritos, pedidos y pagos.
- Cambiar el estado del pedido: Pendiente, Aceptado, Empacado, En camino, Entregado o Cancelado.

Los productos inactivos no aparecen en la tienda. La carpeta `media/` guarda las imagenes subidas durante el desarrollo; Django la sirve localmente mientras `DEBUG` esta activado.

## Como esta organizado

- `ecommerce_site/`: configuracion, rutas del proyecto y punto de entrada WSGI.
- `shop/models.py`: categorias, productos, clientes, direcciones, carrito, pedidos, articulos de pedido y pagos.
- `shop/forms.py`: formularios de registro, perfil, direccion y checkout.
- `shop/views.py` y `shop/urls.py`: catalogo, cuentas, carrito, checkout y seguimiento de compras.
- `shop/admin.py`: busqueda, filtros, edicion de productos y seguimiento de pedidos desde Django Admin.
- `templates/shop/`: paginas HTML renderizadas por Django y Bootstrap 5.
- `static/css/site.css` y `static/js/cart.js`: estilos responsive y actualizacion asincrona de cantidades del carrito.
- `shop/management/commands/seed_catalog.py`: datos de muestra para comenzar a probar la tienda.
- `shop/migrations/`: cambios versionados del esquema de base de datos.

## Modelo de compra

Cada cuenta tiene un perfil `Customer` y puede guardar varias direcciones. Un `Cart` relaciona la cuenta con un producto y una cantidad; un mismo producto aparece una sola vez en el carrito de cada usuario.

Al confirmar el checkout, la aplicacion vuelve a verificar el stock dentro de una transaccion de base de datos. Luego crea un `OrderPlaced` y sus `OrderItem`, guarda en cada articulo el titulo y el precio unitario de ese momento, descuenta el inventario, registra un `Payment` y vacia el carrito. Guardar una copia del precio permite que el total de una compra anterior no cambie si despues se modifica el precio del producto.

Los pedidos y carritos estan asociados a la cuenta que los creo. Las vistas de pedidos solo permiten consultar los pedidos del usuario autenticado.

## Donde se guardan los datos

La ubicacion depende del motor configurado al iniciar Django:

- **SQLite (por defecto):** la base completa esta en `db.sqlite3`, en la carpeta raiz del proyecto. Si el archivo no existe, `python manage.py migrate` lo crea y prepara sus tablas.
- **PostgreSQL:** cuando se define `DATABASE_URL`, los datos quedan en la base y el servidor indicados por esa conexion. No se crea una copia PostgreSQL dentro de la carpeta del proyecto.

Los registros de cuentas, perfiles, direcciones, categorias, productos, carrito, pedidos, articulos de pedido, pagos y sesiones viven en esa base de datos. Django guarda las contrasenas como hashes, no como texto legible. Las migraciones de `shop/migrations/` describen la estructura de las tablas; no contienen las compras ni los usuarios.

Las imagenes que se **suben desde Admin** se guardan como archivos bajo `media/products/`; la base solo guarda su ruta. Los productos con una imagen externa guardan la URL en la base, pero el archivo sigue alojado en el servicio externo. Los CSS, JavaScript y templates del proyecto son archivos de codigo en `static/` y `templates/`, no datos de la base.

El comando `python manage.py seed_catalog` agrega el catalogo de muestra a la base que este activa en ese momento. No crea otro archivo de datos aparte.

### Copias de seguridad

Para SQLite, detene el servidor antes de copiar la base. En PowerShell:

```powershell
Copy-Item .\db.sqlite3 .\db.sqlite3.bak
Copy-Item .\media .\media-backup -Recurse
```

En macOS o Linux:

```bash
cp db.sqlite3 db.sqlite3.bak
cp -R media media-backup
```

Guarda la base y `media/` juntas: una copia de la base por si sola conserva los registros y las rutas de imagen, pero no el contenido de los archivos subidos. No guardes las copias de seguridad dentro del repositorio.

Para PostgreSQL, usa `pg_dump` y conserva tambien los archivos de `media/`:

```bash
pg_dump -Fc -d "$DATABASE_URL" -f lobo_market.dump
```

El repositorio ignora `db.sqlite3`, `media/`, `.env` y `.venv/` para evitar publicar informacion local, archivos de usuarios o secretos. Si un archivo ya estaba versionado antes de agregarlo a `.gitignore`, ignorarlo no lo quita del historial: hay que retirarlo del seguimiento de Git por separado.

## Pago: modo demostracion

El checkout **no integra una pasarela real**. Acepta un medio de pago de demostracion y registra una operacion local como aprobada; no solicita datos de tarjeta ni realiza cobros. No uses datos financieros reales ni presentes esta configuracion como apta para vender en produccion.

Para aceptar pagos reales se debe integrar un proveedor, verificar sus notificaciones en el servidor y definir manejo de errores, reembolsos, secretos y requisitos legales antes de habilitar cobros.

## Usar PostgreSQL

Instala PostgreSQL y crea una base de datos y un usuario. Define `DATABASE_URL` **antes** de correr `migrate`. La dependencia `psycopg` ya esta incluida en `requirements.txt`.

PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://usuario:clave@localhost:5432/lobo_market"
python manage.py migrate
python manage.py seed_catalog
```

macOS/Linux:

```bash
export DATABASE_URL="postgresql://usuario:clave@localhost:5432/lobo_market"
python manage.py migrate
python manage.py seed_catalog
```

Si `DATABASE_URL` no esta definida, Django usa `db.sqlite3` en la raiz del proyecto. Una vez que hay datos reales en una base, conserva una copia de seguridad antes de cambiar de motor: SQLite y PostgreSQL no comparten automaticamente sus datos.

## Configuracion para despliegue

La configuracion admite estas variables de entorno:

- `DJANGO_SECRET_KEY`: clave secreta de Django. Usa una clave privada y unica fuera del desarrollo.
- `DJANGO_DEBUG`: usa `False` en produccion; el valor por defecto es `True` para desarrollo local.
- `DJANGO_ALLOWED_HOSTS`: lista de hosts separada por comas, por ejemplo `tienda.ejemplo.com,www.tienda.ejemplo.com`.
- `DATABASE_URL`: conexion PostgreSQL; si falta, se usa SQLite.
- `DB_SSLMODE`: modo SSL de PostgreSQL; por defecto es `prefer`.

No publiques credenciales ni claves en el repositorio. Antes de desplegar tambien hace falta configurar archivos estaticos, almacenamiento de imagenes, HTTPS, servidor WSGI/ASGI y la infraestructura de base de datos. `runserver` y el servicio local de `media/` son exclusivamente para desarrollo.

## Migraciones y pruebas

Cuando el proyecto cambia de version, sincroniza la base y ejecuta las pruebas:

```bash
python manage.py migrate
python manage.py check
python manage.py test shop
```

Si modificas los modelos durante el desarrollo, crea y versiona una nueva migracion antes de compartir los cambios:

```bash
python manage.py makemigrations
python manage.py migrate
```

Las pruebas de `shop` verifican la visualizacion del catalogo, la actualizacion del carrito, el registro del pedido y pago, el descuento de stock y el rechazo de compras que superan el inventario.

## Solucion de problemas

- **`No module named django`**: activa el entorno virtual e instala dependencias con `python -m pip install -r requirements.txt`.
- **No se puede entrar a `/admin/`**: crea una cuenta con `python manage.py createsuperuser` y usa esas credenciales.
- **La tienda no tiene productos**: ejecuta `python manage.py seed_catalog` o crea categorias y productos desde Admin.
- **La imagen subida no aparece**: confirma que el archivo se haya guardado y que estes usando el servidor local con `DEBUG=True`. En produccion se necesita configurar almacenamiento de media.
- **PostgreSQL no conecta**: revisa `DATABASE_URL`, que la base exista y que el servicio este iniciado; confirma tambien que `psycopg` se instalo desde `requirements.txt`.