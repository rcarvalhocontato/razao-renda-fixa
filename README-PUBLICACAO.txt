RAZÃO — versão 15 (offline runtime)

Esta versão elimina React/Babel/CDNs do navegador.
O GitHub Actions baixa as dependências durante o build, gera dist/app.js e publica apenas arquivos locais no GitHub Pages.

PUBLICAÇÃO:
1. Substitua o conteúdo do repositório pelos arquivos desta pasta, preservando .github/workflows/pages.yml.
2. No GitHub: Settings > Pages > Build and deployment > Source = GitHub Actions.
3. Faça commit/push na branch main.
4. Aguarde Actions > Build and deploy Razão ficar verde.
5. Abra https://rcarvalhocontato.github.io/razao-renda-fixa/

Não é necessário permitir scripts de unpkg, jsDelivr ou cdnjs no Safari.
