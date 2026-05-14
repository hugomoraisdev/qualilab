import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const PASSWORD = 'Qualilab@2026'
const emails = [
  'admin@qualilab.demo',
  'gestor@qualilab.demo',
  'tecnico@qualilab.demo',
  'auditor@qualilab.demo',
  'consulta@qualilab.demo',
]

const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
const out = []
for (const email of emails) {
  const u = list.users.find((x) => x.email === email)
  if (!u) { out.push({ email, error: 'not found' }); continue }
  const { error } = await sb.auth.admin.updateUserById(u.id, {
    password: PASSWORD,
    email_confirm: true,
  })
  out.push({ email, password: PASSWORD, ok: !error, error: error?.message })
}
console.log(JSON.stringify(out, null, 2))
