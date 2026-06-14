FROM mirror.gcr.io/library/node:18-alpine

WORKDIR /usr/src/app

# System Chromium (Alpine) + fonts for Your Report PDF
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-arabic \
    && (test -x /usr/bin/chromium-browser || ln -sf /usr/bin/chromium /usr/bin/chromium-browser 2>/dev/null || true)

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --production --ignore-scripts

# Fallback: Puppeteer-managed Chrome (if system path missing at runtime)
RUN npx puppeteer browsers install chrome

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
