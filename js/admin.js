import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://qozzxdrjwjskmwmxscqj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvenp4ZHJqd2pza213bXhzY3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODkyNjgsImV4cCI6MjA4MTU2NTI2OH0.3C_4cTXacx0Gf8eRtBYp2uaNZ61OE4SEEOUTDSW4P98'
const supabase = createClient(supabaseUrl, supabaseKey)

// Bucket recomendado para imágenes (Supabase Storage)
// Crea un bucket llamado "imenu" (publico o con policies) para que el upload funcione.
const STORAGE_BUCKET = 'imenu'

let user = null

const ALERGENOS = [
  'gluten','crustaceos','huevos','pescado','cacahuetes',
  'soja','lacteos','frutos_secos','apio','mostaza',
  'sesamo','sulfitos','altramuces','moluscos'
]

let alergenosSeleccionados = []

// ========== DOM (LOGIN) ==========
const loginForm = document.getElementById('login-form')
const adminPanel = document.getElementById('admin-panel')
const loginError = document.getElementById('loginError')

// PERFIL
const perfilNombre = document.getElementById('perfilNombre')
const perfilSlug = document.getElementById('perfilSlug')
const perfilTelefono = document.getElementById('perfilTelefono')
const perfilDireccion = document.getElementById('perfilDireccion')
const perfilWifi = document.getElementById('perfilWifi')
const perfilReviews = document.getElementById('perfilReviews')
const perfilRating = document.getElementById('perfilRating')
const perfilRatingCount = document.getElementById('perfilRatingCount')
const perfilPortadaUrl = document.getElementById('perfilPortadaUrl')
const perfilPortadaFile = document.getElementById('perfilPortadaFile')
const perfilPortadaPreview = document.getElementById('perfilPortadaPreview')

// CATEGORIAS
const editCategoriaId = document.getElementById('editCategoriaId')
const categoriaNombre = document.getElementById('categoriaNombre')
const guardarCategoriaBtn = document.getElementById('guardarCategoriaBtn')
const cancelCategoriaBtn = document.getElementById('cancelCategoriaBtn')
const categoriaFormTitle = document.getElementById('categoria-form-title')

// PLATOS
const editPlatoId = document.getElementById('editPlatoId')
const platoNombre = document.getElementById('platoNombre')
const platoDescripcion = document.getElementById('platoDescripcion')
const platoPrecio = document.getElementById('platoPrecio')
const platoSubcategoria = document.getElementById('platoSubcategoria')
const platoCategoria = document.getElementById('platoCategoria')
const platoImagenUrl = document.getElementById('platoImagenUrl')
const platoImagenFile = document.getElementById('platoImagenFile')
const platoImagenPreview = document.getElementById('platoImagenPreview')
const guardarPlatoBtn = document.getElementById('guardarPlatoBtn')
const cancelPlatoBtn = document.getElementById('cancelPlatoBtn')
const platoFormTitle = document.getElementById('plato-form-title')
const platoEditAside = document.getElementById('platoEditAside')
const platoEditAsideBody = document.getElementById('platoEditAsideBody')

// ========== HELPERS ==========
function safeText(v){ return (v ?? '').toString() }

function normalizeAllergenKey(v){
  const raw = safeText(v).trim().toLowerCase()
  if (!raw) return ''
  const clean = raw.replace(/^alergenos\//,'').replace(/\.svg$/,'')
  const n = clean
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/\s+/g,' ')
    .trim()

  const includes = (needle) => n.includes(needle)
  if (includes('gluten')) return 'gluten'
  if (includes('huevo')) return 'huevos'
  if (includes('lact') || includes('leche')) return 'lacteos'
  if (includes('crust')) return 'crustaceos'
  if (includes('molusc')) return 'moluscos'
  if (includes('cacahuet')) return 'cacahuetes'
  if (includes('sesam')) return 'sesamo'
  if (includes('mostaz')) return 'mostaza'
  if (includes('pescad')) return 'pescado'
  if (includes('soja')) return 'soja'
  if (includes('apio')) return 'apio'
  if (includes('altram')) return 'altramuces'
  if (includes('sulfit')) return 'sulfitos'
  if (includes('frutos') && (includes('cascara') || includes('secos'))) return 'frutos_secos'

  return n.replace(/\s+/g,'_')
}

function showPreview(el, url){
  if (!url){ el.style.display = 'none'; el.innerHTML = ''; return }
  el.style.display = ''
  el.innerHTML = `<img src="${url}" alt="preview" style="max-width:100%;border-radius:12px;display:block"/>`
}

function slugify(input){
  return safeText(input)
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'')
}

async function uploadToStorage(file, folder){
  if (!file) return null
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${folder}/${crypto.randomUUID()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (upErr){
    throw new Error(`No se pudo subir la imagen a Storage: ${upErr.message}`)
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}

// ========== LOGIN ==========
document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error){
    loginError.textContent = error.message
    return
  }
  user = data.user
  loginForm.style.display = 'none'
  adminPanel.style.display = 'block'
  await cargarTodo()
}

document.getElementById('logoutBtn').onclick = async () => {
  await supabase.auth.signOut()
  location.reload()
}

// ========== TABS ==========
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active')
  }
})

// ========== PERFIL ==========
async function cargarPerfil(){
  const { data, error } = await supabase
    .from('Perfil')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error){
    console.warn('Perfil:', error.message)
    return
  }

  if (data){
    perfilNombre.value = safeText(data.nombre)
    perfilSlug.value = safeText(data.slug)
    perfilTelefono.value = safeText(data.telefono)
    perfilDireccion.value = safeText(data.direccion)
    perfilWifi.value = safeText(data.wifi)
    perfilReviews.value = safeText(data.reviews_url)
    perfilRating.value = data.rating ?? ''
    perfilRatingCount.value = data.rating_count ?? ''
    perfilPortadaUrl.value = safeText(data.portada_url)
    showPreview(perfilPortadaPreview, data.portada_url)
  }
}

// Autogenerar slug cuando escriben nombre (si slug vacio)
perfilNombre?.addEventListener('input', () => {
  if (!perfilSlug.value.trim()) perfilSlug.value = slugify(perfilNombre.value)
})

perfilPortadaUrl?.addEventListener('input', () => {
  showPreview(perfilPortadaPreview, perfilPortadaUrl.value.trim())
})

perfilPortadaFile?.addEventListener('change', () => {
  const f = perfilPortadaFile.files?.[0]
  if (!f) return
  const blob = URL.createObjectURL(f)
  showPreview(perfilPortadaPreview, blob)
})

document.getElementById('guardarPerfilBtn').onclick = async () => {
  try{
    let portadaFinal = perfilPortadaUrl.value.trim()
    const f = perfilPortadaFile.files?.[0]
    if (f){
      portadaFinal = await uploadToStorage(f, `${user.id}/portadas`)
      perfilPortadaUrl.value = portadaFinal
      perfilPortadaFile.value = ''
      showPreview(perfilPortadaPreview, portadaFinal)
    }

    const payload = {
      user_id: user.id,
      nombre: perfilNombre.value.trim() || null,
      slug: perfilSlug.value.trim() || null,
      telefono: perfilTelefono.value.trim() || null,
      direccion: perfilDireccion.value.trim() || null,
      wifi: perfilWifi.value.trim() || null,
      reviews_url: perfilReviews.value.trim() || null,
      rating: perfilRating.value !== '' ? Number(perfilRating.value) : null,
      rating_count: perfilRatingCount.value !== '' ? Number(perfilRatingCount.value) : null,
      portada_url: portadaFinal || null
    }

    const { error } = await supabase.from('Perfil').upsert(payload)
    if (error) throw error

    alert('Perfil guardado ✅')
  }catch(e){
    alert(e.message)
  }
}

// ========== ALERGENOS ==========
function cargarAlergenosGrid(){
  const grid = document.getElementById('alergenosGrid')
  grid.innerHTML = ''

  ALERGENOS.forEach(a => {
    const div = document.createElement('div')
    div.className = 'alergeno-item'
    div.dataset.alergeno = a
    if (alergenosSeleccionados.includes(a)) div.classList.add('selected')

    div.innerHTML = `
      <img src="alergenos/${a}.svg" alt="${a}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22%23ddd%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2214%22>?</text></svg>'">
      <span>${a.replace(/_/g,' ')}</span>
    `

    div.onclick = () => {
      const idx = alergenosSeleccionados.indexOf(a)
      if (idx > -1){
        alergenosSeleccionados.splice(idx,1)
        div.classList.remove('selected')
      } else {
        alergenosSeleccionados.push(a)
        div.classList.add('selected')
      }
    }

    grid.appendChild(div)
  })
}

// ========== CATEGORIAS ==========
async function cargarCategorias(){
  const { data: categorias } = await supabase
    .from('Categorias')
    .select('*')
    .eq('user_id', user.id)
    .order('orden', { ascending: true })

  const container = document.getElementById('categoriasContainer')
  container.innerHTML = ''

  if (!categorias || categorias.length === 0){
    container.innerHTML = '<div class="empty-state">No hay categorías. ¡Crea la primera!</div>'
    actualizarSelectCategorias([])
    return
  }

  categorias.forEach(cat => {
    const div = document.createElement('div')
    div.className = 'categoria-item' + (cat.activa ? '' : ' inactiva')
    div.dataset.id = cat.id
    div.innerHTML = `
      <span class="drag-handle">☰</span>
      <div class="categoria-nombre">${cat.nombre} ${cat.activa ? '' : '(Desactivada)'}</div>
      <div class="categoria-actions">
        <button class="btn-editar" data-id="${cat.id}">✏️ Editar</button>
        <button class="btn-toggle" data-id="${cat.id}">${cat.activa ? '👁️ Ocultar' : '👁️ Mostrar'}</button>
        <button class="btn-eliminar" data-id="${cat.id}">🗑️ Eliminar</button>
      </div>
    `
    container.appendChild(div)
  })

  container.querySelectorAll('.btn-editar').forEach(btn => btn.onclick = () => editarCategoria(btn.dataset.id, categorias))
  container.querySelectorAll('.btn-toggle').forEach(btn => btn.onclick = () => toggleCategoria(btn.dataset.id, categorias))
  container.querySelectorAll('.btn-eliminar').forEach(btn => btn.onclick = () => eliminarCategoria(btn.dataset.id))

  makeSortableCategorias(container)
  actualizarSelectCategorias(categorias)
}

function actualizarSelectCategorias(categorias){
  platoCategoria.innerHTML = ''
  if (!categorias || !categorias.length){
    const opt = document.createElement('option')
    opt.value = ''
    opt.textContent = 'Crea una categoría primero'
    platoCategoria.appendChild(opt)
    return
  }
  categorias.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c.id
    opt.textContent = c.nombre
    platoCategoria.appendChild(opt)
  })
}

async function actualizarOrdenCategorias(container){
  const items = [...container.querySelectorAll('.categoria-item')]
  for (let i = 0; i < items.length; i++){
    const id = items[i].dataset.id
    await supabase.from('Categorias').update({ orden: i }).eq('id', id)
  }
}

function makeSortableCategorias(container){
  let draggedElement = null
  let isDragging = false

  container.querySelectorAll('.categoria-item').forEach(item => {
    const dragHandle = item.querySelector('.drag-handle')
    item.draggable = false

    dragHandle.onmousedown = () => { dragHandle.draggable = true }
    dragHandle.ondragstart = (e) => {
      draggedElement = item
      item.classList.add('dragging')
      isDragging = true
      e.dataTransfer.effectAllowed = 'move'
    }
    dragHandle.ondragend = () => {
      item.classList.remove('dragging')
      draggedElement = null
      isDragging = false
      dragHandle.draggable = false
    }

    item.ondragover = (e) => {
      if (!isDragging) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }

    item.ondrop = async (e) => {
      if (!isDragging) return
      e.preventDefault()
      if (draggedElement && draggedElement !== item){
        const allItems = [...container.querySelectorAll('.categoria-item')]
        const draggedIndex = allItems.indexOf(draggedElement)
        const targetIndex = allItems.indexOf(item)
        if (draggedIndex < targetIndex) item.after(draggedElement)
        else item.before(draggedElement)
        await actualizarOrdenCategorias(container)
      }
    }

    // touch
    dragHandle.ontouchstart = (e) => {
      e.stopPropagation()
      draggedElement = item
      item.classList.add('dragging')
      isDragging = true
    }
    dragHandle.ontouchmove = (e) => {
      if (!isDragging) return
      e.preventDefault()
      e.stopPropagation()
      const touchY = e.touches[0].clientY
      const after = getDragAfterElement(container, touchY)
      if (after == null) container.appendChild(draggedElement)
      else container.insertBefore(draggedElement, after)
    }
    dragHandle.ontouchend = async (e) => {
      if (!isDragging) return
      e.stopPropagation()
      item.classList.remove('dragging')
      await actualizarOrdenCategorias(container)
      draggedElement = null
      isDragging = false
    }
  })
}

function getDragAfterElement(container, y){
  const els = [...container.querySelectorAll('.categoria-item:not(.dragging)')]
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect()
    const offset = y - box.top - box.height / 2
    if (offset < 0 && offset > closest.offset) return { offset, element: child }
    return closest
  }, { offset: Number.NEGATIVE_INFINITY }).element
}

function editarCategoria(id, categorias){
  const cat = categorias.find(c => String(c.id) === String(id))
  editCategoriaId.value = id
  categoriaNombre.value = cat?.nombre || ''
  categoriaFormTitle.textContent = '✏️ Editar Categoría'
  cancelCategoriaBtn.style.display = ''
}

cancelCategoriaBtn.onclick = () => {
  editCategoriaId.value = ''
  categoriaNombre.value = ''
  categoriaFormTitle.textContent = '➕ Nueva Categoría'
  cancelCategoriaBtn.style.display = 'none'
}

guardarCategoriaBtn.onclick = async () => {
  const nombre = categoriaNombre.value.trim()
  if (!nombre) return alert('Pon un nombre')

  const id = editCategoriaId.value
  if (id){
    await supabase.from('Categorias').update({ nombre }).eq('id', id)
  } else {
    await supabase.from('Categorias').insert({ nombre, user_id: user.id, activa: true, orden: 0 })
  }

  cancelCategoriaBtn.onclick()
  await cargarCategorias()
  await cargarPlatos()
}

async function toggleCategoria(id, categorias){
  const cat = categorias.find(c => String(c.id) === String(id))
  await supabase.from('Categorias').update({ activa: !cat.activa }).eq('id', id)
  await cargarCategorias()
}

async function eliminarCategoria(id){
  if (!confirm('¿Eliminar categoría? También se quedarán platos sin categoría.')) return
  await supabase.from('Categorias').delete().eq('id', id)
  await cargarCategorias()
  await cargarPlatos()
}

// ========== PLATOS ==========
function resetPlatoForm(){
  editPlatoId.value = ''
  platoNombre.value = ''
  platoDescripcion.value = ''
  platoPrecio.value = ''
  platoSubcategoria.value = ''
  platoImagenUrl.value = ''
  platoImagenFile.value = ''
  platoFormTitle.textContent = '➕ Nuevo Plato'
  cancelPlatoBtn.style.display = 'none'
  alergenosSeleccionados = []
  cargarAlergenosGrid()
  showPreview(platoImagenPreview, null)
  if (platoEditAside){
    platoEditAside.style.display = 'none'
  }
  if (platoEditAsideBody){
    platoEditAsideBody.innerHTML = ''
  }
}

platoImagenUrl?.addEventListener('input', () => {
  showPreview(platoImagenPreview, platoImagenUrl.value.trim())
})

platoImagenFile?.addEventListener('change', () => {
  const f = platoImagenFile.files?.[0]
  if (!f) return
  const blob = URL.createObjectURL(f)
  showPreview(platoImagenPreview, blob)
})

cancelPlatoBtn.onclick = resetPlatoForm

async function cargarPlatos(){
  const { data: platos } = await supabase
    .from('Menu')
    .select('*')
    .eq('user_id', user.id)
    .order('orden', { ascending: true })

  const container = document.getElementById('platosContainer')
  container.innerHTML = ''

  if (!platos || !platos.length){
    container.innerHTML = '<div class="empty-state">No hay platos. ¡Crea el primero!</div>'
    return
  }

  platos.forEach(p => {
    const div = document.createElement('div')
    div.className = 'plato-item' + (p.activo ? '' : ' inactiva')
    div.dataset.id = p.id

    const img = p.imagen_url ? `<img src="${p.imagen_url}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:10px;margin-right:10px"/>` : ''

    div.innerHTML = `
      <span class="drag-handle">☰</span>
      ${img}
      <div class="plato-info">
        <div class="plato-nombre">${p.plato} ${p.activo ? '' : '(Oculto)'}</div>
        <div class="plato-desc">${p.descripcion ? p.descripcion : ''}</div>
        <div class="plato-meta">${p.subcategoria ? `<span class="chipmini">${p.subcategoria}</span>` : ''}</div>
      </div>
      <div class="plato-precio">${p.precio != null ? Number(p.precio).toFixed(2)+' €' : ''}</div>
      <div class="plato-actions">
        <button class="btn-editar" data-id="${p.id}">✏️</button>
        <button class="btn-toggle" data-id="${p.id}">${p.activo ? '👁️' : '🙈'}</button>
        <button class="btn-eliminar" data-id="${p.id}">🗑️</button>
      </div>
    `

    container.appendChild(div)
  })

  container.querySelectorAll('.btn-editar').forEach(btn => btn.onclick = () => editarPlato(btn.dataset.id, platos))
  container.querySelectorAll('.btn-toggle').forEach(btn => btn.onclick = () => togglePlato(btn.dataset.id, platos))
  container.querySelectorAll('.btn-eliminar').forEach(btn => btn.onclick = () => eliminarPlato(btn.dataset.id))

  makeSortablePlatos(container)
}

function editarPlato(id, platos){
  const p = platos.find(x => String(x.id) === String(id))
  if (!p) return

  editPlatoId.value = p.id
  platoNombre.value = p.plato || ''
  platoDescripcion.value = p.descripcion || ''
  platoPrecio.value = p.precio ?? ''
  platoSubcategoria.value = p.subcategoria || ''
  platoCategoria.value = p.categoria_id ?? ''
  platoImagenUrl.value = p.imagen_url || ''
  showPreview(platoImagenPreview, p.imagen_url || null)

  // Limpieza: si antes se guardaron textos ("cereales con gluten"...),
  // los normalizamos a keys válidas para tus SVG y descartamos lo desconocido.
  const existing = Array.isArray(p.alergenos) ? p.alergenos : []
  alergenosSeleccionados = existing
    .map(normalizeAllergenKey)
    .filter(Boolean)
    .filter(k => ALERGENOS.includes(k))
  cargarAlergenosGrid()

  // Aside "Editando" (para no perder contexto)
  if (platoEditAside && platoEditAsideBody){
    const catName = platoCategoria?.selectedOptions?.[0]?.textContent || ''
    const thumb = p.imagen_url ? `<img class="edit-aside-thumb" src="${p.imagen_url}" alt="">` : `<div class="edit-aside-thumb"></div>`
    const tags = []
    if (catName) tags.push(`<span class="edit-tag">${catName}</span>`)
    if (p.subcategoria) tags.push(`<span class="edit-tag">${p.subcategoria}</span>`)
    if (p.precio != null) tags.push(`<span class="edit-tag">${Number(p.precio).toFixed(2)} €</span>`)

    platoEditAsideBody.innerHTML = `
      ${thumb}
      <div class="edit-aside-meta">
        <div class="edit-aside-name">${safeText(p.plato)}</div>
        <div class="edit-aside-tags">${tags.join('')}</div>
      </div>
    `
    platoEditAside.style.display = ''
  }

  platoFormTitle.textContent = '✏️ Editar Plato'
  cancelPlatoBtn.style.display = ''
}

async function togglePlato(id, platos){
  const p = platos.find(x => String(x.id) === String(id))
  await supabase.from('Menu').update({ activo: !p.activo }).eq('id', id)
  await cargarPlatos()
}

async function eliminarPlato(id){
  if (!confirm('¿Eliminar plato?')) return
  await supabase.from('Menu').delete().eq('id', id)
  await cargarPlatos()
}

async function actualizarOrdenPlatos(container){
  const items = [...container.querySelectorAll('.plato-item')]
  for (let i = 0; i < items.length; i++){
    const id = items[i].dataset.id
    await supabase.from('Menu').update({ orden: i }).eq('id', id)
  }
}

function makeSortablePlatos(container){
  let draggedElement = null
  let isDragging = false

  container.querySelectorAll('.plato-item').forEach(item => {
    const dragHandle = item.querySelector('.drag-handle')
    item.draggable = false

    dragHandle.onmousedown = () => { dragHandle.draggable = true }
    dragHandle.ondragstart = (e) => {
      draggedElement = item
      item.classList.add('dragging')
      isDragging = true
      e.dataTransfer.effectAllowed = 'move'
    }
    dragHandle.ondragend = () => {
      item.classList.remove('dragging')
      draggedElement = null
      isDragging = false
      dragHandle.draggable = false
    }

    item.ondragover = (e) => {
      if (!isDragging) return
      e.preventDefault()
    }

    item.ondrop = async (e) => {
      if (!isDragging) return
      e.preventDefault()
      if (draggedElement && draggedElement !== item){
        const allItems = [...container.querySelectorAll('.plato-item')]
        const draggedIndex = allItems.indexOf(draggedElement)
        const targetIndex = allItems.indexOf(item)
        if (draggedIndex < targetIndex) item.after(draggedElement)
        else item.before(draggedElement)
        await actualizarOrdenPlatos(container)
      }
    }

    // touch
    dragHandle.ontouchstart = (e) => {
      e.stopPropagation()
      draggedElement = item
      item.classList.add('dragging')
      isDragging = true
    }
    dragHandle.ontouchmove = (e) => {
      if (!isDragging) return
      e.preventDefault()
      e.stopPropagation()
      const touchY = e.touches[0].clientY
      const after = getDragAfterElementPlatos(container, touchY)
      if (after == null) container.appendChild(draggedElement)
      else container.insertBefore(draggedElement, after)
    }
    dragHandle.ontouchend = async (e) => {
      if (!isDragging) return
      e.stopPropagation()
      item.classList.remove('dragging')
      await actualizarOrdenPlatos(container)
      draggedElement = null
      isDragging = false
    }
  })
}

function getDragAfterElementPlatos(container, y){
  const els = [...container.querySelectorAll('.plato-item:not(.dragging)')]
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect()
    const offset = y - box.top - box.height / 2
    if (offset < 0 && offset > closest.offset) return { offset, element: child }
    return closest
  }, { offset: Number.NEGATIVE_INFINITY }).element
}

guardarPlatoBtn.onclick = async () => {
  const nombre = platoNombre.value.trim()
  if (!nombre) return alert('Pon un nombre')

  const catId = platoCategoria.value ? Number(platoCategoria.value) : null
  if (!catId) return alert('Selecciona una categoría')

  try{
    let imgFinal = platoImagenUrl.value.trim()
    const f = platoImagenFile.files?.[0]
    if (f){
      imgFinal = await uploadToStorage(f, `${user.id}/platos`)
      platoImagenUrl.value = imgFinal
      platoImagenFile.value = ''
      showPreview(platoImagenPreview, imgFinal)
    }

    const payload = {
      plato: nombre,
      descripcion: platoDescripcion.value.trim() || null,
      precio: platoPrecio.value !== '' ? Number(platoPrecio.value) : null,
      categoria_id: catId,
      subcategoria: platoSubcategoria.value.trim() || null,
      imagen_url: imgFinal || null,
      alergenos: alergenosSeleccionados,
      user_id: user.id,
      activo: true
    }

    const id = editPlatoId.value
    const { error } = id
      ? await supabase.from('Menu').update(payload).eq('id', id)
      : await supabase.from('Menu').insert(payload)

    if (error) throw error

    resetPlatoForm()
    await cargarPlatos()
  }catch(e){
    alert(e.message)
  }
}

// ========== INIT ==========
async function cargarTodo(){
  cargarAlergenosGrid()
  await cargarPerfil()
  await cargarCategorias()
  await cargarPlatos()
}

// Si ya hay sesion, auto login
;(async () => {
  const { data } = await supabase.auth.getSession()
  if (data?.session?.user){
    user = data.session.user
    loginForm.style.display = 'none'
    adminPanel.style.display = 'block'
    await cargarTodo()
  }
})()
