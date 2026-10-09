# Desplegar en Railway

Guía paso a paso para poner la app en Railway y que los datos sobrevivan a cada actualización.

La base de datos es un archivo SQLite. En Railway el disco del contenedor se borra en cada deploy, así que el archivo **tiene que vivir en un Volume**. Si te saltas ese paso, perderás los datos en la primera actualización.

---

## 0. Antes de empezar

- Cuenta en [GitHub](https://github.com) y en [Railway](https://railway.app) (puedes entrar a Railway con tu cuenta de GitHub).
- El proyecto compila en local: `npm.cmd run build` termina sin errores.

## 1. Subir el código a GitHub

En la carpeta del proyecto:

```powershell
git init -b main
git add .
git status
```

Comprueba que en la lista **no** aparezcan `.env` ni `prisma/dev.db` (están en `.gitignore`). Luego:

```powershell
git commit -m "Budget app"
```

Crea un repositorio **privado** y vacío en GitHub (sin README ni .gitignore) y conéctalo:

```powershell
git remote add origin https://github.com/TU_USUARIO/budget.git
git push -u origin main
```

Si tienes GitHub CLI instalado, un solo comando hace todo lo anterior:

```powershell
gh repo create budget --private --source=. --remote=origin --push
```

## 2. Crear el proyecto en Railway

1. Entra a Railway → **New Project** → **Deploy from GitHub repo**.
2. Autoriza Railway a ver tus repos si te lo pide y elige `budget`.
3. Railway detecta Node.js y lanza un primer deploy. **Fallará o arrancará sin base de datos**: es normal, todavía faltan el volumen y las variables. Sigue con los pasos 3 y 4.

## 3. Añadir el Volume (donde vive la base de datos)

1. Haz clic en el servicio `budget` → pestaña **Settings** (o clic derecho sobre el servicio → **Add Volume**).
2. Crea un volumen con **Mount Path**: `/data`
3. Guarda. Railway reiniciará el servicio.

## 4. Variables de entorno

Pestaña **Variables** del servicio → **New Variable**, una por una:

| Variable | Valor | Para qué |
|---|---|---|
| `DATABASE_URL` | `file:/data/budget.db` | Ruta del archivo SQLite dentro del volumen |
| `EDIT_PASSWORD` | la contraseña del modo edición | Se verifica solo en el servidor |
| `NEXT_PUBLIC_CURRENCY` | `USD` (o `EUR`, `COP`, etc.) | Formato de moneda |

Al guardar, Railway vuelve a desplegar.

## 5. Comprobar el deploy

1. Pestaña **Deployments** → el último debe quedar en **Success**.
2. En **Deploy Logs** deberías ver algo como:
   ```
   Applying migration `20261009000000_init`
   ...
   ▲ Next.js 15.x
   - Local: http://0.0.0.0:xxxx
   ```
   La primera línea confirma que `prisma migrate deploy` creó las tablas en el volumen.
3. Pestaña **Settings → Networking → Generate Domain**. Se genera una URL tipo `budget-production.up.railway.app`.
4. Abre la URL, activa **Edit mode**, escribe la contraseña y ajusta las arcas con tu dinero actual.

## 6. Cómo actualizar la app sin perder datos

Cada vez que quieras publicar un cambio:

```powershell
git add .
git commit -m "Descripción del cambio"
git push
```

Railway detecta el push y despliega solo. Qué pasa con los datos:

| Tipo de cambio | Qué hace el deploy | Datos |
|---|---|---|
| Solo código (interfaz, cálculos, estilos) | Reemplaza el contenedor; no toca `/data` | Intactos |
| Cambio de esquema (nueva columna o tabla) | Al arrancar, `prisma migrate deploy` aplica solo las migraciones nuevas de `prisma/migrations/` | Intactos: las migraciones añaden, nunca borran |

Reglas para que esto siga siendo cierto:

- Todo cambio de esquema va acompañado de una migración en `prisma/migrations/` (en local: `npm.cmd run db:migrate`).
- **Nunca** ejecutes contra producción `prisma migrate reset`, `prisma db push --force-reset` ni borres el volumen. Son los únicos caminos para perder datos.
- No cambies el `Mount Path` del volumen ni `DATABASE_URL` una vez en marcha; si lo haces, la app arrancará con una base vacía (el archivo viejo sigue en el volumen, pero en otra ruta).

## 7. Copias de seguridad

El archivo `/data/budget.db` es toda tu información. Para descargarlo:

```powershell
npm.cmd install -g @railway/cli
railway login
railway link          # elige el proyecto y el servicio budget
railway ssh -- cat /data/budget.db > backup-budget.db
```

Guarda ese archivo donde quieras. Para restaurarlo basta con subirlo de vuelta a `/data/budget.db` y reiniciar el servicio.

## 8. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Deploy falla con `Error: P1003` o `unable to open database file` | `DATABASE_URL` apunta fuera del volumen o el volumen no existe | Revisa que el Mount Path sea `/data` y la variable `file:/data/budget.db` |
| La app arranca pero cada deploy la deja vacía | No hay volumen | Paso 3 |
| "Incorrect password" aunque sea correcta | `EDIT_PASSWORD` no está definida en Railway o tiene espacios | Vuelve a crear la variable sin comillas ni espacios |
| Los datos locales no aparecen en producción | Es normal: `prisma/dev.db` nunca se sube | Vuelve a introducir arcas y reglas en producción (o copia tu `dev.db` a `/data/budget.db` con `railway ssh`) |
| Logs: `prisma: command not found` | `prisma` no se instaló como dependencia | Comprueba que `prisma` está en `devDependencies` y que Railway no usa `NODE_ENV=production` durante `npm install` (en ese caso añade la variable `NPM_CONFIG_PRODUCTION=false`) |

## Resumen de 1 minuto

1. `git push` a un repo privado de GitHub.
2. Railway → New Project → Deploy from GitHub repo.
3. Add Volume → Mount Path `/data`.
4. Variables: `DATABASE_URL=file:/data/budget.db`, `EDIT_PASSWORD`, `NEXT_PUBLIC_CURRENCY`.
5. Generate Domain y listo. Las actualizaciones son solo `git push`.
