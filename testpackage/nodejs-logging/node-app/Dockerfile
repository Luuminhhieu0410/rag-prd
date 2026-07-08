FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_FILE=/var/log/node-app/app.log

RUN mkdir -p /var/log/node-app

EXPOSE 3000

CMD ["npm", "start"]

