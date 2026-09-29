create or replace function public.get_leaderboard(p_game text,p_mode text,p_limit int default 10)
returns table(rank bigint,user_id uuid,display_name text,score numeric,aux jsonb,is_me boolean)
language sql security definer stable set search_path='public' as $$
 with mine as (select classroom_id from public.class_members where user_id=auth.uid()), ranked as (
  select g.user_id,m.display_name,g.score,g.aux,row_number() over(order by case when p_game in ('math','game2048','gomoku') then -g.score else g.score end asc,case when p_game in ('match','baseball') then (g.aux->>'elapsed')::numeric end asc nulls last,g.updated_at asc) as rank
  from public.game_bests g join mine on mine.classroom_id=g.classroom_id join public.class_members m on m.user_id=g.user_id
  where g.game_key=p_game and g.mode_key=p_mode
 ) select rank,user_id,display_name,score,aux,user_id=auth.uid() from ranked
   where rank<=least(greatest(p_limit,1),50) or user_id=auth.uid()
   order by rank
$$;

revoke all on function public.get_leaderboard(text,text,int) from public,anon;
grant execute on function public.get_leaderboard(text,text,int) to authenticated;
