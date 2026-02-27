# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para pdf-to-png-converter
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    pkg-config \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# ---- Production Stage ----
FROM node:20-slim AS production

WORKDIR /app

# Instalar solo las librerías runtime (no dev headers)
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
