alter table public.yepii_leads
  add column if not exists state_registration varchar(50),
  add column if not exists icms_taxpayer_status text
    constraint yepii_leads_icms_taxpayer_status_check
    check (icms_taxpayer_status in ('contribuinte', 'isento', 'nao_contribuinte')),
  add column if not exists municipal_registration varchar(50);

comment on column public.yepii_leads.state_registration is 'Inscricao Estadual informada manualmente no CRM; texto para preservar zeros e formatacao.';
comment on column public.yepii_leads.icms_taxpayer_status is 'Situacao do ICMS: contribuinte, isento ou nao_contribuinte; NULL quando nao informado.';
comment on column public.yepii_leads.municipal_registration is 'Inscricao Municipal informada manualmente no CRM; texto para preservar zeros e formatacao.';
