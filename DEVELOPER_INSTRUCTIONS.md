# Developer Instructions: Run Locally & Deploy

---

## Running Locally

### 1. Prerequisites

- Node.js >= 18
- npm or yarn
- Supabase CLI (`npm install -g supabase`)
- Git
- Docker

---

### 2. Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/ai-trivia-arena.git
cd ai-trivia-arena
```

---

### 3. Setup Supabase Locally

```bash
cd supabase
npx supabase init
npx supabase start
```
- This starts the local Supabase stack (database, authentication, studio).

#### a. Create Database Tables

- Open Supabase Studio at [http://localhost:54323](http://localhost:54323).
- Run the SQL in `supabase/schema.sql` to create tables.

#### c. Add API Keys

- Create `supabase/functions/.env` with your OpenAI/Gemini keys:
  ```
  OPENAI_API_KEY=your-openai-key
  GEMINI_API_KEY=your-gemini-key
  ```

---

### 4. Serve Edge Functions Locally

```bash
npx supabase functions serve --env-file ./functions/.env
```
- Functions available at `http://localhost:54321/functions/v1/`

---

### 5. Setup Frontend

```bash
cd ../frontend
npm install
```
- Create `.env.local`:
  ```
  REACT_APP_SUPABASE_URL=http://localhost:54321
  REACT_APP_SUPABASE_ANON_KEY=your-local-anon-key
  ```

---

### 6. Run Frontend Locally

```bash
npm start
```
- App runs at [http://localhost:3000](http://localhost:3000)

---

## Deploying to Production

### 1. Supabase Cloud

- Create a project at [https://app.supabase.com/](https://app.supabase.com/)
- Run your schema in the SQL editor.
- Add Edge Function secrets in Supabase dashboard (`OPENAI_API_KEY`, `GEMINI_API_KEY`).

#### Deploy Edge Functions

```bash
cd supabase
npx supabase link    # Link to your cloud project if not done
npx supabase functions deploy generate-question
npx supabase functions deploy submit-answer
```

---

### 2. Deploy Frontend to Vercel

#### a. Push frontend to GitHub

```bash
cd frontend
```

#### b. Import to Vercel

- Go to [https://vercel.com/import](https://vercel.com/import)
- Select your repo.

#### c. Set Environment Variables on Vercel

- Add:
  - `REACT_APP_SUPABASE_URL` (e.g., `https://your-project-ref.supabase.co`)
  - `REACT_APP_SUPABASE_ANON_KEY` (from Supabase dashboard)

#### d. Deploy

```bash
vercel --prod
```
- Vercel auto-builds and deploys.
- Visit your Vercel URL to test.

---

### 3. Final Steps

- Update Supabase CORS to allow your Vercel domain.
- Test the app.
- Monitor logs for errors in Vercel and Supabase dashboards.

---

## Quick Reference

- **Local:**  
  - `supabase start`
  - `supabase functions serve`
  - `npm start` (in frontend)

- **Production:**  
  - `supabase functions deploy <function>`
  - Push to GitHub, Vercel auto-deploys

---