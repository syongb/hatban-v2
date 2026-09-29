create extension if not exists pgcrypto;

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  join_code_hash text not null unique check (char_length(join_code_hash)=64),
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(classroom_id,user_id)
);

create table if not exists public.game_bests (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null,
  mode_key text not null,
  score numeric not null,
  aux jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(user_id,game_key,mode_key)
);
create index if not exists game_bests_board_idx on public.game_bests(classroom_id,game_key,mode_key,score);

alter table public.classrooms enable row level security;
alter table public.class_members enable row level security;
alter table public.game_bests enable row level security;
revoke all on public.classrooms,public.class_members,public.game_bests from anon,authenticated;
grant select on public.class_members,public.game_bests to authenticated;

create or replace function public.my_classroom_id() returns uuid language sql security definer stable set search_path='public' as $$
 select classroom_id from public.class_members where user_id=auth.uid()
$$;

create policy "members see classmates" on public.class_members for select to authenticated using (classroom_id=public.my_classroom_id());
create policy "members see class scores" on public.game_bests for select to authenticated using (
  classroom_id=public.my_classroom_id()
);

create or replace function public.clean_display_name(raw text) returns text language sql immutable set search_path='' as $$
  select nullif(left(regexp_replace(trim(coalesce(raw,'')),'[<>]','','g'),20),'')
$$;

create or replace function public.join_classroom(join_code text, requested_name text)
returns table(classroom_id uuid,classroom_name text,display_name text)
language plpgsql security definer set search_path='public','extensions' as $$
declare target public.classrooms; clean_name text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  clean_name:=public.clean_display_name(requested_name);
  if clean_name is null then raise exception 'display name required'; end if;
  select * into target from public.classrooms c where c.join_code_hash=encode(digest(upper(trim(join_code)),'sha256'),'hex');
  if target.id is null then raise exception 'invalid classroom code'; end if;
  insert into public.class_members(user_id,classroom_id,display_name) values(auth.uid(),target.id,clean_name)
  on conflict(user_id) do update set classroom_id=excluded.classroom_id,display_name=excluded.display_name,updated_at=now();
  return query select target.id,target.name,clean_name;
end $$;

create or replace function public.get_my_membership()
returns table(classroom_id uuid,classroom_name text,display_name text)
language sql security definer stable set search_path='public' as $$
  select m.classroom_id,c.name,m.display_name from public.class_members m join public.classrooms c on c.id=m.classroom_id where m.user_id=auth.uid()
$$;

create or replace function public.update_my_display_name(requested_name text) returns text
language plpgsql security definer set search_path='public' as $$
declare clean_name text:=public.clean_display_name(requested_name);
begin
 if auth.uid() is null or clean_name is null then raise exception 'valid name required'; end if;
 update public.class_members set display_name=clean_name,updated_at=now() where user_id=auth.uid();
 return clean_name;
end $$;

create or replace function public.submit_game_score(p_game text,p_mode text,p_score numeric,p_aux jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path='public' as $$
declare cid uuid; maximize boolean; cumulative boolean:=false; changed boolean:=false;
begin
 select classroom_id into cid from public.class_members where user_id=auth.uid();
 if cid is null then raise exception 'classroom membership required'; end if;
 if p_game not in ('match','math','mine','tensec','gomoku','baseball','sudoku','reaction','game2048') then raise exception 'unsupported game'; end if;
 if p_mode !~ '^[a-z0-9:-]{1,40}$' or p_score is null then raise exception 'invalid score'; end if;
 if not (
   (p_game='match' and p_mode ~ '^count:(10|12|14|16|18|20|22|24|26|28|30|32|34|36|38|40|42|44|46|48|50|52|54|56|58|60|62|64|66|68|70|72)$')
   or (p_game='math' and p_mode ~ '^(add|sub|mul|div):(easy|medium|hard)$')
   or (p_game in ('mine','sudoku') and p_mode in ('easy','medium','hard'))
   or (p_game='baseball' and p_mode in ('length:3','length:4','length:5'))
   or (p_game='gomoku' and p_mode='ai:standard')
   or (p_game in ('tensec','reaction','game2048') and p_mode='default')
 ) then raise exception 'unsupported game mode'; end if;
 if octet_length(coalesce(p_aux,'{}')::text)>2048 then raise exception 'score details too large'; end if;
 if p_game in ('match','baseball') and (jsonb_typeof(p_aux->'elapsed') is distinct from 'number' or (p_aux->>'elapsed')::numeric<0 or (p_aux->>'elapsed')::numeric>7200000) then raise exception 'valid elapsed time required'; end if;
 maximize:=p_game in ('math','game2048','gomoku'); cumulative:=p_game='gomoku';
 if (p_game='reaction' and (p_score<80 or p_score>5000))
   or (p_game in ('mine','sudoku') and (p_score<500 or p_score>7200000))
   or (p_game='tensec' and (p_score<0 or p_score>10000))
   or (p_game='match' and (p_score<1 or p_score>10000))
   or (p_game='baseball' and (p_score<1 or p_score>1000))
   or (p_game in ('math','game2048') and (p_score<0 or p_score>100000000))
   or (p_game='gomoku' and (p_mode<>'ai:standard' or p_score<>1)) then raise exception 'score outside allowed range'; end if;
 insert into public.game_bests(classroom_id,user_id,game_key,mode_key,score,aux) values(cid,auth.uid(),p_game,p_mode,p_score,coalesce(p_aux,'{}'))
 on conflict(user_id,game_key,mode_key) do update set
  score=case when cumulative then game_bests.score+excluded.score when maximize then greatest(game_bests.score,excluded.score) else least(game_bests.score,excluded.score) end,
  aux=case when cumulative then game_bests.aux||jsonb_build_object('plays',coalesce((game_bests.aux->>'plays')::int,0)+1) when (maximize and excluded.score>game_bests.score) or (not maximize and excluded.score<game_bests.score) or (p_game in ('match','baseball') and excluded.score=game_bests.score and (excluded.aux->>'elapsed')::numeric<(game_bests.aux->>'elapsed')::numeric) then excluded.aux else game_bests.aux end,
  updated_at=now()
 where cumulative or (maximize and excluded.score>game_bests.score) or (not maximize and excluded.score<game_bests.score) or (p_game in ('match','baseball') and excluded.score=game_bests.score and (excluded.aux->>'elapsed')::numeric<(game_bests.aux->>'elapsed')::numeric);
 get diagnostics changed=row_count; return changed;
end $$;

create or replace function public.get_leaderboard(p_game text,p_mode text,p_limit int default 10)
returns table(rank bigint,user_id uuid,display_name text,score numeric,aux jsonb,is_me boolean)
language sql security definer stable set search_path='public' as $$
 with mine as (select classroom_id from public.class_members where user_id=auth.uid()), ranked as (
  select g.user_id,m.display_name,g.score,g.aux,row_number() over(order by case when p_game in ('math','game2048','gomoku') then -g.score else g.score end asc,case when p_game in ('match','baseball') then (g.aux->>'elapsed')::numeric end asc nulls last,g.updated_at asc) as rank
  from public.game_bests g join mine on mine.classroom_id=g.classroom_id join public.class_members m on m.user_id=g.user_id
  where g.game_key=p_game and g.mode_key=p_mode
 ) select rank,user_id,display_name,score,aux,user_id=auth.uid() from ranked order by rank limit least(greatest(p_limit,1),50)
$$;

revoke all on function public.my_classroom_id(),public.join_classroom(text,text),public.get_my_membership(),public.update_my_display_name(text),public.submit_game_score(text,text,numeric,jsonb),public.get_leaderboard(text,text,int) from public,anon;
grant execute on function public.my_classroom_id() to authenticated;
grant execute on function public.join_classroom(text,text),public.get_my_membership(),public.update_my_display_name(text),public.submit_game_score(text,text,numeric,jsonb),public.get_leaderboard(text,text,int) to authenticated;

insert into public.classrooms(name,join_code_hash) values('햇반국','61302f671d17201b76819a03d784e1afcbc0a80eea184024aa24a8bfc751e7c5') on conflict(join_code_hash) do nothing;
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='game_bests') then
    alter publication supabase_realtime add table public.game_bests;
  end if;
end $$;
