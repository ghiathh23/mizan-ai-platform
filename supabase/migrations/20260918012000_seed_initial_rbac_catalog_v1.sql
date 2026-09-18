insert into public.permissions (code, description) values
  ('organization.read', 'قراءة بيانات المؤسسة'),
  ('organization.manage', 'إدارة إعدادات المؤسسة وأعضائها'),
  ('project.read', 'قراءة بيانات المشاريع'),
  ('project.manage', 'إدارة إعدادات المشاريع'),
  ('meter.read', 'قراءة العدادات والقراءات'),
  ('meter.reading.create', 'إنشاء قراءة مقترحة'),
  ('meter.reading.validate', 'اعتماد أو تصحيح القراءات'),
  ('billing.read', 'قراءة بيانات الفوترة'),
  ('billing.generate', 'إنشاء الفواتير'),
  ('audit.read', 'قراءة سجل التدقيق')
on conflict (code) do nothing;

insert into public.roles (code, name, scope, description) values
  ('organization_admin', 'مدير المؤسسة', 'organization', 'إدارة المؤسسة والمشاريع التابعة ضمن نطاق المؤسسة'),
  ('project_manager', 'مدير المشروع', 'project', 'إدارة عمليات المشروع ضمن نطاقه'),
  ('field_operator', 'مشغل ميداني', 'project', 'إدخال القراءات المقترحة وقراءة بيانات التشغيل')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on (
  (r.code = 'organization_admin' and p.code in ('organization.read','organization.manage','project.read','project.manage','meter.read','meter.reading.create','meter.reading.validate','billing.read','billing.generate','audit.read'))
  or (r.code = 'project_manager' and p.code in ('project.read','project.manage','meter.read','meter.reading.create','meter.reading.validate','billing.read','billing.generate','audit.read'))
  or (r.code = 'field_operator' and p.code in ('project.read','meter.read','meter.reading.create'))
)
on conflict do nothing;

insert into public.user_roles (user_id, role_id, organization_id)
select '63fed843-c001-449c-a87d-fa69deac3c06'::uuid, r.id, '86e43633-1d14-4896-a41f-f77a4dda684f'::uuid
from public.roles r
where r.code = 'organization_admin'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = '63fed843-c001-449c-a87d-fa69deac3c06'::uuid
      and ur.role_id = r.id
      and ur.organization_id = '86e43633-1d14-4896-a41f-f77a4dda684f'::uuid
  );
