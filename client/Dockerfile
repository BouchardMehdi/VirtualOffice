FROM node:22-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --workspace @virtualoffice/client --include-workspace-root=false

COPY client/ client/
COPY server/src/realtime/protocol.ts server/src/realtime/protocol.ts
RUN npm run build --workspace @virtualoffice/client
RUN mkdir -p node_modules/.vite-temp node_modules/.vite && chown -R node:node client node_modules/.vite-temp node_modules/.vite

USER node
EXPOSE 5173
# Serveur Vite pour cette demonstration locale, sans infrastructure de production.
CMD ["npm", "run", "dev", "--workspace", "@virtualoffice/client"]
