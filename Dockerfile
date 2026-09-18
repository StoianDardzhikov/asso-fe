# ---- build stage: Node exists ONLY here, never on the server ----
FROM node:18-alpine AS build
WORKDIR /app

# CRA turns warnings into errors when CI is set; this project has pre-existing
# lint warnings, so keep it off.
ENV CI=false

# package-lock.json is copied too so `npm ci` installs the exact pinned versions.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime stage: just nginx serving the static files ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
