-- Table: questions
create table questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  options jsonb not null,
  correct_option integer not null,
  created_at timestamptz default now()
);

-- Table: answers
create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id),
  selected_option integer,
  is_correct boolean,
  explanation text,
  created_at timestamptz default now()
);

-- Table: player_stats
create table player_stats (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  correct_count integer default 0,
  incorrect_count integer default 0,
  updated_at timestamptz default now()
);

-- Table: high_scores
create table high_scores (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  score integer,
  created_at timestamptz default now()
);