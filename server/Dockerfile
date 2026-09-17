FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --workspace @virtualoffice/server --include-workspace-root=false

COPY server/ server/
COPY client/public/assets/maps/ client/public/assets/maps/
RUN npm run build --workspace @virtualoffice/server

ENV NODE_ENV=production
USER node
EXPOSE 4000
CMD ["npm", "run", "start:demo", "--workspace", "@virtualoffice/server"]
