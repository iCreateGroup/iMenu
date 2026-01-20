import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// =============================
// Supabase (usa tus credenciales actuales)
// =============================
const supabaseUrl = 'https://qozzxdrjwjskmwmxscqj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvenp4ZHJqd2pza213bXhzY3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODkyNjgsImV4cCI6MjA4MTU2NTI2OH0.3C_4cTXacx0Gf8eRtBYp2uaNZ61OE4SEEOUTDSW4P98'
const supabase = createClient(supabaseUrl, supabaseKey)

const params = new URLSearchParams(window.location.search)
const clienteId = params.get('cliente')

// =============================
// DOM
// =============================
const viewHome = document.getElementById('viewHome')
const viewCategory = document.getElementById('viewCategory')

const cover = document.getElementById('cover')
const coverImg = document.getElementById('coverImg')
const placeTitle = document.getElementById('placeTitle')
const homeCategories = document.getElementById('homeCategories')

const ratingBtn = document.getElementById('ratingBtn')
const ratingPrimary = document.getElementById('ratingPrimary')
const ratingSecondary = document.getElementById('ratingSecondary')
const infoBtn = document.getElementById('infoBtn')
const infoSecondary = document.getElementById('infoSecondary')

const backBtn = document.getElementById('backBtn')
const categoryTitle = document.getElementById('categoryTitle')
const subcatChips = document.getElementById('subcatChips')
const dishList = document.getElementById('dishList')

const searchOverlay = document.getElementById('searchOverlay')
const searchInput = document.getElementById('searchInput')
const clearSearch = document.getElementById('clearSearch')
const closeSearch = document.getElementById('closeSearch')
const searchBackdrop = document.getElementById('searchBackdrop')

const homeSearchBtn = document.getElementById('homeSearchBtn')
const catSearchBtn = document.getElementById('catSearchBtn')

const ctaBtn = document.getElementById('ctaBtn')

const dishSheet = document.getElementById('dishSheet')
const sheetImageWrap = document.getElementById('sheetImageWrap')
const sheetImage = document.getElementById('sheetImage')
const sheetTitle = document.getElementById('sheetTitle')
const sheetPrice = document.getElementById('sheetPrice')
const sheetDesc = document.getElementById('sheetDesc')
const sheetAllergenSection = document.getElementById('sheetAllergenSection')
const sheetAllergens = document.getElementById('sheetAllergens')

// =============================
// State
// =============================
let CATEGORIAS = []
let PLATOS = []

let ACTIVE_CAT_ID = null
let ACTIVE_SUBCAT = 'all'
let SEARCH_Q = ''

// Perfil (opcional): si existe tabla "Perfiles" o "Perfil", la usamos.
let PROFILE = null

// =============================
// Utils
// =============================
function normalize(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function formatPrice(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return `${n.toFixed(2)} €`
}

function safeText(v) {
  return (v ?? '').toString()
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== '') return obj[k]
  }
  return null
}

function setView(which) {
  const home = which === 'home'
  viewHome.classList.toggle('is-hidden', !home)
  viewCategory.classList.toggle('is-active', !home)
  viewHome.setAttribute('aria-hidden', home ? 'false' : 'true')
  viewCategory.setAttribute('aria-hidden', home ? 'true' : 'false')
}

function openSearch() {
  searchOverlay.classList.add('is-open')
  searchOverlay.setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'
  setTimeout(() => searchInput.focus(), 50)
}

function closeSearchOverlay() {
  searchOverlay.classList.remove('is-open')
  searchOverlay.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''
}

function openSheet(plato) {
  const imgUrl = pick(plato, ['imagen_url', 'image_url', 'foto_url', 'img_url'])
  if (imgUrl) {
    sheetImageWrap.style.display = ''
    sheetImage.src = imgUrl
    sheetImage.alt = plato.plato ? `${plato.plato}` : ''
  } else {
    sheetImageWrap.style.display = 'none'
    sheetImage.removeAttribute('src')
  }

  sheetTitle.textContent = safeText(plato.plato)
  sheetPrice.textContent = plato.precio != null ? formatPrice(plato.precio) : ''
  sheetDesc.textContent = safeText(plato.descripcion)

  // alérgenos (tu sistema actual: array + iconos locales /alergenos/*.svg)
  const alergs = Array.isArray(plato.alergenos) ? plato.alergenos : []
  sheetAllergens.innerHTML = ''
  if (alergs.length) {
    sheetAllergenSection.style.display = ''
    alergs.forEach(a => {
      const img = document.createElement('img')
      img.src = `alergenos/${a}.svg`
      img.alt = a
      img.title = a.replace(/_/g, ' ')
      sheetAllergens.appendChild(img)
    })
  } else {
    sheetAllergenSection.style.display = 'none'
  }

  dishSheet.classList.add('is-open')
  dishSheet.setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'
}

function closeSheet() {
  dishSheet.classList.remove('is-open')
  dishSheet.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''
}

// =============================
// Render
// =============================
function renderHome() {
  homeCategories.innerHTML = ''

  const catsWithItems = CATEGORIAS.filter(c => PLATOS.some(p => String(p.categoria_id) === String(c.id)))
  if (!catsWithItems.length) {
    const p = document.createElement('p')
    p.className = 'muted'
    p.textContent = 'Esta carta aún no tiene categorías con platos.'
    homeCategories.appendChild(p)
    return
  }

  catsWithItems.forEach(cat => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'catBtn'
    btn.textContent = cat.nombre
    btn.addEventListener('click', () => {
      goCategory(String(cat.id))
    })
    homeCategories.appendChild(btn)
  })
}

function buildChip(label, active) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = `chip${active ? ' chip--active' : ''}`
  btn.textContent = label
  return btn
}

function renderSubcatChips(catId) {
  subcatChips.innerHTML = ''
  ACTIVE_SUBCAT = ACTIVE_SUBCAT || 'all'

  const platosCat = PLATOS.filter(p => String(p.categoria_id) === String(catId))
  const subcats = Array.from(
    new Set(
      platosCat
        .map(p => pick(p, ['subcategoria', 'sub_category', 'subcat']))
        .filter(Boolean)
        .map(s => safeText(s).trim())
        .filter(Boolean)
    )
  )

  // Siempre "Todo"
  const allChip = buildChip('Todo', ACTIVE_SUBCAT === 'all')
  allChip.addEventListener('click', () => {
    ACTIVE_SUBCAT = 'all'
    renderSubcatChips(catId)
    renderDishList(catId)
  })
  subcatChips.appendChild(allChip)

  subcats.forEach(sc => {
    const chip = buildChip(sc, ACTIVE_SUBCAT === sc)
    chip.addEventListener('click', () => {
      ACTIVE_SUBCAT = sc
      renderSubcatChips(catId)
      renderDishList(catId)
    })
    subcatChips.appendChild(chip)
  })
}

function passesSearch(plato) {
  const q = normalize(SEARCH_Q)
  if (!q) return true
  const name = normalize(plato.plato)
  const desc = normalize(plato.descripcion)
  return name.includes(q) || desc.includes(q)
}

function renderDishList(catId) {
  const cat = CATEGORIAS.find(c => String(c.id) === String(catId))
  categoryTitle.textContent = cat ? cat.nombre : 'Categoría'

  dishList.innerHTML = ''

  const platosCat = PLATOS
    .filter(p => String(p.categoria_id) === String(catId))
    .filter(p => {
      if (ACTIVE_SUBCAT === 'all') return true
      const sc = pick(p, ['subcategoria', 'sub_category', 'subcat'])
      return safeText(sc).trim() === ACTIVE_SUBCAT
    })
    .filter(passesSearch)

  if (!platosCat.length) {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = SEARCH_Q ? 'No hay resultados.' : 'No hay platos en esta sección.'
    dishList.appendChild(empty)
    return
  }

  // Si existen subcategorías, pintamos separadores por grupo (como NordQR)
  const hasSubcats = PLATOS.some(p => String(p.categoria_id) === String(catId) && pick(p, ['subcategoria', 'sub_category', 'subcat']))
  if (hasSubcats && ACTIVE_SUBCAT === 'all') {
    const groups = new Map()
    platosCat.forEach(p => {
      const sc = safeText(pick(p, ['subcategoria', 'sub_category', 'subcat']) || 'Otros').trim() || 'Otros'
      if (!groups.has(sc)) groups.set(sc, [])
      groups.get(sc).push(p)
    })

    for (const [sc, items] of groups.entries()) {
      const h = document.createElement('h2')
      h.className = 'groupTitle'
      h.textContent = sc
      dishList.appendChild(h)
      items.forEach(p => dishList.appendChild(buildDishRow(p)))
    }
  } else {
    platosCat.forEach(p => dishList.appendChild(buildDishRow(p)))
  }
}

function buildDishRow(plato) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'dishRow'
  btn.addEventListener('click', () => openSheet(plato))

  const left = document.createElement('div')
  left.className = 'dishLeft'

  const name = document.createElement('div')
  name.className = 'dishName'
  name.textContent = safeText(plato.plato)

  const desc = document.createElement('div')
  desc.className = 'dishDesc'
  desc.textContent = safeText(plato.descripcion)

  const price = document.createElement('div')
  price.className = 'dishPrice'
  price.textContent = plato.precio != null ? formatPrice(plato.precio) : ''

  // iconitos alérgenos (tipo NordQR: justo al lado del nombre)
  const alergs = Array.isArray(plato.alergenos) ? plato.alergenos : []
  if (alergs.length) {
    const badgeWrap = document.createElement('span')
    badgeWrap.className = 'miniBadges'
    alergs.slice(0, 3).forEach(a => {
      const s = document.createElement('span')
      s.className = 'miniBadge'
      // si tienes emojis, puedes mapear aquí. por ahora solo un puntito.
      s.title = a.replace(/_/g, ' ')
      s.textContent = '•'
      badgeWrap.appendChild(s)
    })
    const titleLine = document.createElement('div')
    titleLine.className = 'dishTitleLine'
    titleLine.appendChild(name)
    titleLine.appendChild(badgeWrap)
    left.appendChild(titleLine)
  } else {
    left.appendChild(name)
  }

  if (plato.descripcion) left.appendChild(desc)
  if (plato.precio != null) left.appendChild(price)

  const right = document.createElement('div')
  right.className = 'dishRight'

  const imgUrl = pick(plato, ['imagen_url', 'image_url', 'foto_url', 'img_url'])
  if (imgUrl) {
    const img = document.createElement('img')
    img.src = imgUrl
    img.alt = safeText(plato.plato)
    img.loading = 'lazy'
    right.appendChild(img)
  } else {
    // si no hay imagen, oculta el hueco
    right.style.display = 'none'
  }

  btn.appendChild(left)
  btn.appendChild(right)
  return btn
}

// =============================
// Navigation
// =============================
function goCategory(catId) {
  ACTIVE_CAT_ID = catId
  ACTIVE_SUBCAT = 'all'
  SEARCH_Q = ''
  searchInput.value = ''
  clearSearch.style.visibility = 'hidden'

  setView('category')
  renderSubcatChips(catId)
  renderDishList(catId)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goHome() {
  ACTIVE_CAT_ID = null
  ACTIVE_SUBCAT = 'all'
  SEARCH_Q = ''
  searchInput.value = ''
  clearSearch.style.visibility = 'hidden'
  setView('home')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// =============================
// Load
// =============================
async function loadProfileIfExists() {
  // Intentamos dos nombres para no romperte si ya has creado uno.
  const candidates = ['Perfil', 'Perfiles', 'Clientes', 'Bares', 'bars', 'clientes']
  for (const table of candidates) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', clienteId)
        .limit(1)
        .maybeSingle()
      if (error) continue
      if (data) {
        PROFILE = { table, ...data }
        return
      }
    } catch {
      // ignore
    }
  }
}

function applyProfileToHome() {
  if (!PROFILE) {
    // Fallback: si no hay portada, ponemos un degradado para no quedar feo
    coverImg.style.display = 'none'
    cover.style.background = 'linear-gradient(135deg, #d7d7dd, #f5f5f7)'
    placeTitle.textContent = 'Carta'
    return
  }

  const name = pick(PROFILE, ['nombre', 'name', 'restaurant_name', 'local_name', 'titulo'])
  if (name) placeTitle.textContent = name

  const portada = pick(PROFILE, ['portada_url', 'cover_url', 'imagen_portada', 'hero_url', 'banner_url'])
  if (portada) {
    coverImg.src = portada
    coverImg.style.display = ''
  } else {
    coverImg.style.display = 'none'
    cover.style.background = 'linear-gradient(135deg, #d7d7dd, #f5f5f7)'
  }

  // Rating (opcional)
  const rating = pick(PROFILE, ['rating', 'valoracion', 'stars'])
  const ratingCount = pick(PROFILE, ['rating_count', 'valoraciones', 'reviews'])
  if (rating != null) {
    ratingBtn.style.display = ''
    ratingPrimary.textContent = `${Number(rating).toFixed(1)} · Excelente`
    ratingSecondary.textContent = ratingCount ? `${ratingCount} valoraciones` : ''
  }

  // Info (opcional)
  const info = []
  if (pick(PROFILE, ['wifi', 'wifi_name'])) info.push('Wi‑Fi')
  if (pick(PROFILE, ['telefono', 'phone'])) info.push('Teléfono')
  if (pick(PROFILE, ['direccion', 'address'])) info.push('Dirección')
  if (info.length) {
    infoBtn.style.display = ''
    infoSecondary.textContent = info.join(', ')
  }

  // CTA valoraciones (opcional)
  const reviewsUrl = pick(PROFILE, ['reviews_url', 'google_reviews_url', 'valoraciones_url'])
  if (reviewsUrl) {
    ctaBtn.style.display = ''
    ctaBtn.addEventListener('click', () => window.open(reviewsUrl, '_blank', 'noopener'))
  }
}

async function loadMenu() {
  dishList.innerHTML = '<div class="loading">Cargando…</div>'

  if (!clienteId) {
    placeTitle.textContent = 'URL inválida'
    homeCategories.innerHTML = '<p class="muted">Falta el parámetro <b>?cliente=</b>.</p>'
    return
  }

  // Perfil opcional
  await loadProfileIfExists()
  applyProfileToHome()

  try {
    const { data: categorias, error: catError } = await supabase
      .from('Categorias')
      .select('*')
      .eq('user_id', clienteId)
      .eq('activa', true)
      .order('orden', { ascending: true })

    if (catError) throw catError

    const { data: platos, error: platosError } = await supabase
      .from('Menu')
      .select('*')
      .eq('user_id', clienteId)
      .eq('activo', true)
      .order('orden', { ascending: true })

    if (platosError) throw platosError

    CATEGORIAS = Array.isArray(categorias) ? categorias : []
    PLATOS = Array.isArray(platos) ? platos : []

    renderHome()
    setView('home')
  } catch (e) {
    console.error(e)
    placeTitle.textContent = 'Error'
    homeCategories.innerHTML = `<p class="muted">No se pudo cargar la carta: ${safeText(e.message)}</p>`
  }
}

// =============================
// Events
// =============================
backBtn.addEventListener('click', goHome)

homeSearchBtn.addEventListener('click', () => {
  // Si estás en home, buscamos en TODA la carta y llevamos al primer match.
  // Para simplificar: abrimos overlay y filtramos dentro de la última categoría visitada o la primera.
  if (!ACTIVE_CAT_ID) {
    const firstCat = CATEGORIAS.find(c => PLATOS.some(p => String(p.categoria_id) === String(c.id)))
    if (firstCat) ACTIVE_CAT_ID = String(firstCat.id)
  }
  if (ACTIVE_CAT_ID) {
    setView('category')
    renderSubcatChips(ACTIVE_CAT_ID)
    renderDishList(ACTIVE_CAT_ID)
  }
  openSearch()
})

catSearchBtn.addEventListener('click', openSearch)

clearSearch.addEventListener('click', () => {
  SEARCH_Q = ''
  searchInput.value = ''
  clearSearch.style.visibility = 'hidden'
  if (ACTIVE_CAT_ID) renderDishList(ACTIVE_CAT_ID)
})

searchInput.addEventListener('input', () => {
  SEARCH_Q = searchInput.value
  clearSearch.style.visibility = SEARCH_Q ? 'visible' : 'hidden'
  if (ACTIVE_CAT_ID) renderDishList(ACTIVE_CAT_ID)
})

closeSearch.addEventListener('click', closeSearchOverlay)
searchBackdrop.addEventListener('click', closeSearchOverlay)

dishSheet.addEventListener('click', (e) => {
  const t = e.target
  if (t?.dataset?.close === 'true') closeSheet()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (dishSheet.classList.contains('is-open')) closeSheet()
    if (searchOverlay.classList.contains('is-open')) closeSearchOverlay()
  }
})

// =============================
// Init
// =============================
loadMenu()
