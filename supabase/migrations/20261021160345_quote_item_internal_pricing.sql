-- Purchasing information is for the authenticated quote administration only.
-- Public quote and acceptance endpoints must keep their explicit column lists.
alter table public.quote_items
  add column if not exists supplier_name text
    constraint quote_items_supplier_name_length check (char_length(supplier_name) <= 300),
  add column if not exists unit_cost numeric(14,2)
    constraint quote_items_unit_cost_nonnegative check (unit_cost >= 0),
  add column if not exists markup_percent numeric(12,4)
    constraint quote_items_markup_nonnegative check (markup_percent >= 0);

comment on column public.quote_items.supplier_name is 'Internal supplier; never include in buyer APIs or printouts.';
comment on column public.quote_items.unit_cost is 'Internal purchase cost per unit; null means not supplied.';
comment on column public.quote_items.markup_percent is 'Optional cost markup percentage; null is manual pricing, zero is a valid markup.';

alter table public.quote_items enable row level security;
revoke all on table public.quote_items from anon, authenticated;
grant select, insert, update, delete on table public.quote_items to service_role;
