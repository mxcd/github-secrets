FROM golang:1.17-alpine AS sops

RUN apk --no-cache add make git

RUN mkdir -p /go/src/go.mozilla.org
WORKDIR /go/src/go.mozilla.org
RUN git clone https://github.com/mozilla/sops
WORKDIR /go/src/go.mozilla.org/sops

RUN CGO_ENABLED=1 make install


FROM node:alpine as build

WORKDIR /usr/src/

RUN npm i -g pnpm typescript
COPY package.json .
COPY pnpm-lock.yaml .
RUN pnpm install

COPY src /usr/src/src
COPY .eslintrc .
COPY .prettierrc .
COPY tsconfig.json .

RUN pnpm build

FROM node:alpine
WORKDIR /usr/app/
COPY --from=build /usr/src/dist /usr/app/
COPY --from=sops /go/bin/sops /usr/local/bin/sops
ENTRYPOINT [ "node", "index.js" ]