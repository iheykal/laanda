FROM node:14 AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:14 AS backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./

FROM node:14
WORKDIR /app
COPY --from=backend /app /app/
COPY --from=frontend /app/build /app/build
COPY backend/package*.json ./

EXPOSE 3000

CMD ["node", "server.js"]
