FROM mirror.gcr.io/library/node:18-alpine

WORKDIR /usr/src/app

# Chromium for Puppeteer PDF export (Your Report)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-arabic

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --production --ignore-scripts

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["node", "index.js"]
