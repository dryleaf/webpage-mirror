FROM node:18-bullseye-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# run the script
ENTRYPOINT [ "node", "src/fetch.js"]
