FROM node:20-alpine

WORKDIR /app

COPY frontend/package.json ./
RUN npm install --production

COPY frontend/ .

EXPOSE 3000

CMD ["node", "server.js"]
