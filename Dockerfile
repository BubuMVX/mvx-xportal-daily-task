FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
COPY .env ./

CMD ["npm", "start"]
