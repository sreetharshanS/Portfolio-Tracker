grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.asset_categories,
  public.holdings,
  public.transactions,
  public.asset_targets,
  public.milestones,
  public.milestone_achievements,
  public.portfolio_snapshots,
  public.import_batches
to authenticated;
