# UnityMed — Guia de Configuração

## Pré-requisitos

1. **Node.js 18+** — https://nodejs.org/en/download  
2. **Conta Supabase** — https://supabase.com (plano gratuito é suficiente)

---

## 1. Configurar o Banco de Dados (Supabase)

1. Crie um novo projeto em https://supabase.com/dashboard  
2. Vá em **SQL Editor** e cole todo o conteúdo de `supabase/migrations/001_initial_schema.sql`  
3. Execute o script (botão **Run**)

---

## 2. Configurar Variáveis de Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.local.example .env.local
```

Edite `.env.local` com os valores do seu projeto:  
**Supabase Dashboard → seu projeto → Project Settings → API**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 3. Instalar Dependências e Rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000 — será redirecionado para `/login`.

---

## 4. Deploy na Vercel

```bash
npm install -g vercel
vercel
```

Configure as mesmas variáveis de ambiente no painel da Vercel.

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/login/       ← Página de autenticação
│   ├── (main)/
│   │   ├── layout.tsx      ← Layout com Sidebar
│   │   ├── dashboard/      ← /dashboard
│   │   ├── timer/          ← /timer (Foco)
│   │   ├── calculator/     ← /calculator (Planejamento)
│   │   ├── calendar/       ← /calendar (Agenda)
│   │   ├── notes/          ← /notes (Cadernos)
│   │   └── glossary/       ← /glossary (Glossário)
├── components/
│   ├── layout/             ← Sidebar, ThemeToggle, TimerBadge
│   ├── ui/                 ← Componentes shadcn/ui
│   ├── dashboard/          ← Gráficos e métricas
│   ├── timer/              ← Display do cronômetro
│   ├── calculator/         ← Gerenciador de matérias
│   ├── calendar/           ← Grade semanal + EventDialog
│   ├── notes/              ← Workspace + Editor Tiptap
│   └── glossary/           ← Tabela + formulário
├── store/timerStore.ts     ← Estado global do timer (Zustand)
├── lib/supabase/           ← Clientes browser/server
└── types/                  ← Types TypeScript do banco
```

---

## Funcionalidades Implementadas

| Módulo | Funcionalidade |
|--------|---------------|
| Dashboard | Saudação dinâmica, métricas rápidas (horas, streak, próximo evento), gráfico de barras horizontais (planejado vs. estudado), gráfico de área semanal, widget "hoje" |
| Foco | Stopwatch e Pomodoro com seletor de matéria, círculo de progresso, salva sessão no Supabase, timer persiste entre rotas via Zustand |
| Planejamento | Cadastro de matérias, peso 1–5, algoritmo proporcional de distribuição horária, salva alocação no banco |
| Agenda | Grade semanal 07–22h, cria/edita/deleta eventos com tipos (estudo/prova/trabalho), navigation entre semanas |
| Cadernos | Sidebar com pastas, editor Tiptap (bold/italic/listas/checklists/blocos de código/citação), autosave com debounce |
| Glossário | Tabela com busca em tempo real, filtro por matéria, CRUD completo, suporte a idiomas e tags |
| Layout | Sidebar colapsável, Light/Dark mode (next-themes), indicador de timer ativo, middleware de auth |
