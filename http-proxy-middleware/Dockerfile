FROM node:18
WORKDIR /app
COPY package.json ./
COPY app.ts ./
RUN npm install
CMD [ "npx", "ts-node", "app.ts" ]