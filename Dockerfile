FROM node:18-alpine

WORKDIR /usr/src/app

# 1. نسخ ملفات الـ package
COPY package*.json ./

# 2. نسخ مجلد الـ prisma أولاً لو موجود عشان الـ postinstall يشتغل صح
COPY prisma ./prisma/

# 3. تخطي الـ scripts مؤقتاً أثناء الـ install عشان الـ build ميفصلش
RUN npm install --production --ignore-scripts

# 4. نسخ باقي الكود بالكامل
COPY . .

# 5. تشغيل الـ prisma generate يدوياً بعد ما الكود كله اتنسخ
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "index.js"]