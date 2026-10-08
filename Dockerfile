# =====================================================================
# 1º Simpósio de Urgência e Emergência · imagem para o servidor do DIID
# Um contêiner só: serve o site e a API, com o banco SQLite em /dados.
#
#   docker build -t simposio-ue .
#   docker run -d --name simposio-ue -p 8080:8080 \
#     --env-file servidor/.env -v simposio-ue-dados:/dados simposio-ue
#
# Detalhes de instalação no README (seção "Servidor no DIID").
# =====================================================================
FROM node:22-alpine

WORKDIR /app/servidor
COPY servidor/package.json servidor/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY servidor/src ./src
COPY site /app/site

# Pasta do banco e do registro de e-mails; monte um volume aqui
RUN mkdir -p /dados && chown node:node /dados

ENV NODE_ENV=production \
    PORTA=8080 \
    PASTA_SITE=/app/site \
    PASTA_DADOS=/dados

USER node
EXPOSE 8080
VOLUME ["/dados"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORTA}/api" > /dev/null || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "src/servidor.js"]
