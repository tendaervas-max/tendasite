<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/43632240-6692-412b-9d38-f853e4d5d56e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL Editor (tabelas, regras de acesso e bucket de fotos)
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (na Netlify, cadastre as mesmas variáveis em Site configuration > Environment variables)
4. Crie o administrador em Authentication > Users e libere com o `insert into public.admin` que está no começo do `schema.sql`
5. Run the app:
   `npm run dev`

## Documentação

Análise, segurança, configuração do Supabase e melhorias: [DOCUMENTACAO.md](DOCUMENTACAO.md).
