FROM node:6-alpine

ENV APPDIR=/usr/src/app

RUN apk add --update git && \
    rm -rf /tmp/* /var/cache/apk/*

COPY package.json /tmp/package.json
RUN cd /tmp && npm install --production
RUN mkdir -p "${APPDIR}" && cp -a /tmp/node_modules "${APPDIR}"

COPY package.json "${APPDIR}"
COPY lib /usr/src/app/lib
COPY client/dist /usr/src/app/client/dist

WORKDIR /usr/src/app
COPY bin bin

EXPOSE 3000
CMD ["npm", "start"]