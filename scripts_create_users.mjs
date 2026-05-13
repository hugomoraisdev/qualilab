import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(url, key, { auth: { persistSession: false } })

function pwd() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 12; i++) s += c[Math.floor(Math.random() * c.length)]
  return s + '!9'
}

const users = [
  { email: 'admin@qualilab.demo',   name: 'Admin Demo',   role: 'admin' },
  { email: 'gestor@qualilab.demo',  name: 'Gestor Demo',  role: 'gestor' },
  { email: 'tecnico@qualilab.demo', name: 'Técnico Demo', role: 'tecnico' },
  { email: 'auditor@qualilab.demo', name: 'Auditor Demo', role: 'auditor' },
  { email: 'consulta@qualilab.demo',name: 'Consulta Demo',role: 'consulta' },
]

const results = []
for (const u of users) {
  const password = pwd()
  const { data, error } = await sb.auth.admin.createUser({
    email: u.email,
    password,
    email_confirm: true,
    user_metadata: { name: u.name },
  })
  if (error) { results.push({ ...u, error: error.message }); continue }
  const uid = data.user.id
  // handle_new_user trigger creates profile + role 'consulta'. Override role if needed.
  if (u.role !== 'consulta') {
    await sb.from('user_roles').delete().eq('user_id', uid)
    await sb.from('user_roles').insert({ user_id: uid, role: u.role })
  }
  results.push({ ...u, password, id: uid })
}
console.log(JSON.stringify(results, null, 2))
