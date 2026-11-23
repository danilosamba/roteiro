# Gramado & Canela 💗

App web (com cara de app de iPhone) com o roteiro da viagem de Danilo & Rayza, de 5 a 10 de dezembro de 2026.

## Rodar no computador

```bash
npm install
npm run dev
```

Abra http://localhost:3000. O roteiro fica salvo no arquivo `data/roteiro.db` (SQLite), criado sozinho na primeira vez.
Para voltar ao roteiro original: `npm run seed`.

## Publicar na Vercel

A Vercel não guarda arquivos gravados pelo app, então em produção o banco é o **Turso** (SQLite na nuvem, plano grátis).

1. Crie uma conta em https://turso.tech e um banco (ex.: `roteiro-gramado`).
2. Copie a **URL** (`libsql://...`) e crie um **token**.
3. Na Vercel, importe este projeto e adicione as variáveis de ambiente:
   - `TURSO_DATABASE_URL` = a URL do banco
   - `TURSO_AUTH_TOKEN` = o token
   - `APP_PIN` = um PIN só de vocês dois (sem ele, qualquer pessoa com o link pode editar)
4. Faça o deploy. Na primeira abertura, o app cria a tabela e preenche o roteiro.

## No celular

Abra o link no Safari → Compartilhar → **Adicionar à Tela de Início**. O app abre em tela cheia, como um app.

## Onde mexer

- `lib/seed.ts`: roteiro inicial (usado só quando o banco está vazio)
- `components/App.tsx`: telas Roteiro, Lugares e Nós
- `components/Splash.tsx`: animação de abertura
- `components/HeartFX.tsx`: corações ao tocar nos botões
- `app/globals.css`: cores, fontes e estilos
