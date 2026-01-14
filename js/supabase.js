import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

export const supabaseUrl = 'https://qozzxdrjwjskmwmxscqj.supabase.co'
export const supabaseKey = 'sb_publishable_UtBfupVv8e2zniYdv1jvEA_SXIyWE0Z'
export const supabase = createClient(supabaseUrl, supabaseKey)

export function getUser() {
  return supabase.auth.user()
}

export async function login(email, password) {
  const { user, error } = await supabase.auth.signIn({ email, password })
  if (error) console.error(error)
  return user
}

export async function logout() {
  await supabase.auth.signOut()
}

// CRUD
export async function getMenu() {
  const user = getUser()
  if (!user) return []
  const { data, error } = await supabase.from('Menu').select('*').eq('user_id', user.id).order('id')
  if (error) console.error(error)
  return data
}

export async function addPlato(plato, descripcion, precio, categoria) {
  const user = getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('Menu')
    .insert([{ plato, descripcion, precio, categoria, user_id: user.id }])
  if (error) console.error(error)
  return data
}

export async function updatePlato(id, plato, descripcion, precio, categoria) {
  const { data, error } = await supabase
    .from('Menu')
    .update({ plato, descripcion, precio, categoria })
    .eq('id', id)
  if (error) console.error(error)
  return data
}

export async function deletePlato(id) {
  const { data, error } = await supabase.from('Menu').delete().eq('id', id)
  if (error) console.error(error)
  return data
}
