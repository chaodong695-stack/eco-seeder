FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

RUN npm run build

ENV PORT=8686
EXPOSE 8686

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8686"]
