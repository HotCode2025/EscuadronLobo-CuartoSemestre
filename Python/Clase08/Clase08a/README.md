# Entorno Virtual en Python


<br>Comenzamos con el entorno virtual en Python. Para ingresar al repo después de un tiempo tuve que hacer lo siguiente (abrí la terminal de Ubuntu/Debian):</br>

```sh
mkdir py-project
cd py-project
git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
ll
cd python-pip
code .
git branch # Solo está la rama main
git branch second # Comenzamos a crear nuevas ramas
git branch profe
git branch ariel22
git status # Desde la rama main ya hay cambios para commitear
git add .
git commit -m "Agrego el archivo txt donde detallo cada parte de las clases"
git push origin main # Surge un problema: debo crear un token para poder cargar cambios


# Se debe entrar en GitHub:
# Settings -> Developer settings -> Personal access tokens -> Tokens (classic)
# Se genera escribiendo las notas de qué trabajo se va a tratar, se debe tildar cuánto tiempo de duración tendrá el token y tildar los permisos, generar y por último copiar el token.


git pull origin main
Usuario: tu-usuario
password: accessToken # El que hemos creado y debemos guardar bien
```

<br>Notas de la teoria de la clase 08 a</br>

#Primero me cambio de rama y reviso qué Python y qué pip estoy usando antes de crear un proyecto (terminal de Ubuntu):
```sh

git push origin profe        # Subo la rama profe a GitHub
git pull origin profe        # Ya está actualizada
git fetch
git checkout ariel22         # Me paso a mi rama de trabajo


which python3                # /usr/bin/python3 -> el del sistema
which pip3                   # /usr/bin/pip3 -> el del sistema


sudo apt install -y python3-venv   # Paquete necesario para crear entornos virtuales


cd app
pwd                          # /home/.../python-pip/app
python3 -m venv env          # Creo el entorno virtual llamado env
source env/bin/activate      # Lo activo, el prompt ahora muestra (env)


which python3                # Ahora apunta a app/env/bin/python3
which pip3                   # Ahora apunta a app/env/bin/pip3
pip3 freeze                  # Sale vacío, el entorno arranca limpio


pip3 install matplotlib      # Instalo una librería solo dentro del entorno
pip3 freeze                  # Aparece matplotlib 3.9.2 con sus dependencias (numpy, pillow, etc.)
md
# La idea: cada proyecto con su propio Python y sus propios paquetes, sin tocar el del sistema.