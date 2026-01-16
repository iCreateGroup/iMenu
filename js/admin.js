import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://qozzxdrjwjskmwmxscqj.supabase.co'
const supabaseKey = 'sb_publishable_UtBfupVv8e2zniYdv1jvEA_SXIyWE0Z'
const supabase = createClient(supabaseUrl, supabaseKey)

let user = null

const ALERGENOS = [
  'gluten', 'crustaceos', 'huevos', 'pescado', 'cacahuetes', 
  'soja', 'lacteos', 'frutos_secos', 'apio', 'mostaza', 
  'sesamo', 'sulfitos', 'altramuces', 'moluscos'
]

let alergenosSeleccionados = []

// ========== LOGIN ==========

document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) { 
    document.getElementById('loginError').textContent = error.message
    return
  }
  user = data.user
  document.getElementById('login-form').style.display = 'none'
  document.getElementById('admin-panel').style.display = 'block'
  cargarTodo()
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

// ========== ALÉRGENOS ==========

function cargarAlergenosGrid() {
  const grid = document.getElementById('alergenosGrid')
  grid.innerHTML = ''
  
  ALERGENOS.forEach(alergeno => {
    const div = document.createElement('div')
    div.className = 'alergeno-item'
    div.dataset.alergeno = alergeno
    
    if (alergenosSeleccionados.includes(alergeno)) {
      div.classList.add('selected')
    }
    
    div.innerHTML = `
      <img src="alergenos/${alergeno}.svg" alt="${alergeno}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22%23ddd%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2214%22>?</text></svg>'">
      <span>${alergeno.replace('_', ' ')}</span>
    `
    
    div.onclick = () => {
      const idx = alergenosSeleccionados.indexOf(alergeno)
      if (idx > -1) {
        alergenosSeleccionados.splice(idx, 1)
        div.classList.remove('selected')
      } else {
        alergenosSeleccionados.push(alergeno)
        div.classList.add('selected')
      }
    }
    
    grid.appendChild(div)
  })
}

// ========== CATEGORÍAS ==========

async function cargarCategorias() {
  const { data: categorias } = await supabase
    .from('Categorias')
    .select('*')
    .eq('user_id', user.id)
    .order('orden', { ascending: true })

  const container = document.getElementById('categoriasContainer')
  container.innerHTML = ''

  if (!categorias || categorias.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay categorías. ¡Crea la primera!</div>'
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

  container.querySelectorAll('.btn-editar').forEach(btn => {
    btn.onclick = () => editarCategoria(btn.dataset.id, categorias)
  })
  container.querySelectorAll('.btn-toggle').forEach(btn => {
    btn.onclick = () => toggleCategoria(btn.dataset.id, categorias)
  })
  container.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.onclick = () => eliminarCategoria(btn.dataset.id)
  })

  makeSortableCategorias(container)
  actualizarSelectCategorias(categorias)
}

function makeSortableCategorias(container) {
  let draggedElement = null

  container.querySelectorAll('.categoria-item').forEach(item => {
    item.draggable = true
    
    item.ondragstart = () => {
      draggedElement = item
      item.classList.add('dragging')
    }
    
    item.ondragend = () => {
      item.classList.remove('dragging')
      draggedElement = null
    }
    
    item.ondragover = (e) => {
      e.preventDefault()
    }
    
    item.ondrop = async (e) => {
      e.preventDefault()
      if (draggedElement && draggedElement !== item) {
        const allItems = [...container.querySelectorAll('.categoria-item')]
        const draggedIndex = allItems.indexOf(draggedElement)
        const targetIndex = allItems.indexOf(item)
        
        if (draggedIndex < targetIndex) {
          item.after(draggedElement)
        } else {
          item.before(draggedElement)
        }
        
        await actualizarOrdenCategorias(container)
      }
    }
  })
}

async function actualizarOrdenCategorias(container) {
  const items = [...container.querySelectorAll('.categoria-item')]
  for (let i = 0; i < items.length; i++) {
    const id = items[i].dataset.id
    await supabase.from('Categorias').update({ orden: i }).eq('id', id)
  }
}

function editarCategoria(id, categorias) {
  const cat = categorias.find(c => c.id == id)
  document.getElementById('editCategoriaId').value = id
  document.getElementById('categoriaNombre').value = cat.nombre
  document.getElementById('categoria-form-title').textContent = '✏️ Editar Categoría'
  document.getElementById('cancelCategoriaBtn').style.display = 'inline-block'
}

async function toggleCategoria(id, categorias) {
  const cat = categorias.find(c => c.id == id)
  await supabase.from('Categorias').update({ activa: !cat.activa }).eq('id', id)
  cargarCategorias()
}

async function eliminarCategoria(id) {
  if (!confirm('¿Eliminar esta categoría? Los platos asociados quedarán sin categoría.')) return
  await supabase.from('Categorias').delete().eq('id', id)
  cargarCategorias()
  cargarPlatos()
}

document.getElementById('guardarCategoriaBtn').onclick = async () => {
  const nombre = document.getElementById('categoriaNombre').value.trim()
  if (!nombre) return alert('El nombre es obligatorio')

  const editId = document.getElementById('editCategoriaId').value

  if (editId) {
    await supabase.from('Categorias').update({ nombre }).eq('id', editId)
  } else {
    const { data: maxOrden } = await supabase
      .from('Categorias')
      .select('orden')
      .eq('user_id', user.id)
      .order('orden', { ascending: false })
      .limit(1)
    
    const nuevoOrden = maxOrden && maxOrden.length > 0 ? maxOrden[0].orden + 1 : 0

    await supabase.from('Categorias').insert({
      nombre,
      orden: nuevoOrden,
      user_id: user.id
    })
  }

  limpiarFormCategoria()
  cargarCategorias()
}

document.getElementById('cancelCategoriaBtn').onclick = limpiarFormCategoria

function limpiarFormCategoria() {
  document.getElementById('editCategoriaId').value = ''
  document.getElementById('categoriaNombre').value = ''
  document.getElementById('categoria-form-title').textContent = '➕ Nueva Categoría'
  document.getElementById('cancelCategoriaBtn').style.display = 'none'
}

// ========== PLATOS ==========

async function cargarPlatos() {
  const { data: categorias } = await supabase
    .from('Categorias')
    .select('*')
    .eq('user_id', user.id)
    .order('orden')

  const { data: platos } = await supabase
    .from('Menu')
    .select('*')
    .eq('user_id', user.id)
    .order('orden')

  const container = document.getElementById('platosContainer')
  container.innerHTML = ''

  if (!categorias || categorias.length === 0) {
    container.innerHTML = '<div class="empty-state">Primero crea categorías en la pestaña anterior.</div>'
    return
  }

  categorias.forEach(cat => {
    const catDiv = document.createElement('div')
    catDiv.className = 'platos-por-categoria'
    
    const catPlatos = platos.filter(p => p.categoria_id == cat.id)
    
    catDiv.innerHTML = `<h3>${cat.nombre}</h3>`
    
    const platosContainerCat = document.createElement('div')
    platosContainerCat.className = 'platos-container-cat'
    platosContainerCat.dataset.categoriaId = cat.id
    
    if (catPlatos.length === 0) {
      platosContainerCat.innerHTML = '<div class="empty-state">No hay platos en esta categoría</div>'
    } else {
      catPlatos.forEach(plato => {
        const platoDiv = document.createElement('div')
        platoDiv.className = 'plato-item' + (plato.activo ? '' : ' inactivo')
        platoDiv.dataset.id = plato.id
        platoDiv.dataset.categoriaId = plato.categoria_id
        
        let alergenosHTML = ''
        if (plato.alergenos && plato.alergenos.length > 0) {
          alergenosHTML = '<div class="plato-alergenos">'
          plato.alergenos.forEach(alergeno => {
            alergenosHTML += `<img src="alergenos/${alergeno}.svg" alt="${alergeno}" title="${alergeno}">`
          })
          alergenosHTML += '</div>'
        }
        
        platoDiv.innerHTML = `
          <span class="drag-handle">☰</span>
          <div class="plato-info">
            <div class="plato-nombre">${plato.plato} ${plato.activo ? '' : '(Desactivado)'}</div>
            ${plato.descripcion ? `<div class="plato-descripcion">${plato.descripcion}</div>` : ''}
            ${alergenosHTML}
          </div>
          ${plato.precio ? `<div class="plato-precio">${plato.precio}€</div>` : ''}
          <div class="plato-actions">
            <button class="btn-editar" data-id="${plato.id}">✏️</button>
            <button class="btn-toggle" data-id="${plato.id}">${plato.activo ? '👁️' : '✓'}</button>
            <button class="btn-eliminar" data-id="${plato.id}">🗑️</button>
          </div>
        `
        platosContainerCat.appendChild(platoDiv)
      })
    }
    
    catDiv.appendChild(platosContainerCat)
    container.appendChild(catDiv)
  })

  container.querySelectorAll('.btn-editar').forEach(btn => {
    btn.onclick = () => editarPlato(btn.dataset.id, platos)
  })
  container.querySelectorAll('.btn-toggle').forEach(btn => {
    btn.onclick = () => togglePlato(btn.dataset.id, platos)
  })
  container.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.onclick = () => eliminarPlato(btn.dataset.id)
  })

  makeSortablePlatos()
}

function makeSortablePlatos() {
  let draggedElement = null

  document.querySelectorAll('.plato-item').forEach(item => {
    item.draggable = true
    
    item.ondragstart = () => {
      draggedElement = item
      item.classList.add('dragging')
    }
    
    item.ondragend = () => {
      item.classList.remove('dragging')
      document.querySelectorAll('.plato-item').forEach(el => el.classList.remove('drag-over'))
      draggedElement = null
    }
    
    item.ondragover = (e) => {
      e.preventDefault()
      if (draggedElement && draggedElement !== item) {
        if (draggedElement.dataset.categoriaId === item.dataset.categoriaId) {
          item.classList.add('drag-over')
        }
      }
    }
    
    item.ondragleave = () => {
      item.classList.remove('drag-over')
    }
    
    item.ondrop = async (e) => {
      e.preventDefault()
      item.classList.remove('drag-over')
      
      if (draggedElement && draggedElement !== item) {
        if (draggedElement.dataset.categoriaId === item.dataset.categoriaId) {
          const container = item.parentElement
          const allItems = [...container.querySelectorAll('.plato-item')]
          const draggedIndex = allItems.indexOf(draggedElement)
          const targetIndex = allItems.indexOf(item)
          
          if (draggedIndex < targetIndex) {
            item.after(draggedElement)
          } else {
            item.before(draggedElement)
          }
          
          await actualizarOrdenPlatos(container)
        }
      }
    }
  })
}

async function actualizarOrdenPlatos(container) {
  const items = [...container.querySelectorAll('.plato-item')]
  for (let i = 0; i < items.length; i++) {
    const id = items[i].dataset.id
    await supabase.from('Menu').update({ orden: i }).eq('id', id)
  }
}

function editarPlato(id, platos) {
  const plato = platos.find(p => p.id == id)
  document.getElementById('editPlatoId').value = id
  document.getElementById('platoNombre').value = plato.plato
  document.getElementById('platoDescripcion').value = plato.descripcion || ''
  document.getElementById('platoPrecio').value = plato.precio || ''
  document.getElementById('platoCategoria').value = plato.categoria_id || ''
  
  alergenosSeleccionados = plato.alergenos || []
  cargarAlergenosGrid()
  
  document.getElementById('plato-form-title').textContent = '✏️ Editar Plato'
  document.getElementById('cancelPlatoBtn').style.display = 'inline-block'
  
  document.getElementById('tab-platos').scrollIntoView({ behavior: 'smooth' })
}

async function togglePlato(id, platos) {
  const plato = platos.find(p => p.id == id)
  await supabase.from('Menu').update({ activo: !plato.activo }).eq('id', id)
  cargarPlatos()
}

async function eliminarPlato(id) {
  if (!confirm('¿Eliminar este plato?')) return
  await supabase.from('Menu').delete().eq('id', id)
  cargarPlatos()
}

document.getElementById('guardarPlatoBtn').onclick = async () => {
  const nombre = document.getElementById('platoNombre').value.trim()
  const descripcion = document.getElementById('platoDescripcion').value.trim()
  const precio = document.getElementById('platoPrecio').value
  const categoriaId = document.getElementById('platoCategoria').value

  if (!nombre) return alert('El nombre es obligatorio')
  if (!categoriaId) return alert('Selecciona una categoría')

  const editId = document.getElementById('editPlatoId').value

  if (editId) {
    await supabase.from('Menu').update({
      plato: nombre,
      descripcion,
      precio: precio || null,
      categoria_id: categoriaId,
      alergenos: alergenosSeleccionados
    }).eq('id', editId)
  } else {
    const { data: maxOrden } = await supabase
      .from('Menu')
      .select('orden')
      .eq('user_id', user.id)
      .eq('categoria_id', categoriaId)
      .order('orden', { ascending: false })
      .limit(1)
    
    const nuevoOrden = maxOrden && maxOrden.length > 0 ? maxOrden[0].orden + 1 : 0

    await supabase.from('Menu').insert({
      plato: nombre,
      descripcion,
      precio: precio || null,
      categoria_id: categoriaId,
      user_id: user.id,
      orden: nuevoOrden,
      activo: true,
      alergenos: alergenosSeleccionados
    })
  }

  limpiarFormPlato()
  cargarPlatos()
}

document.getElementById('cancelPlatoBtn').onclick = limpiarFormPlato

function limpiarFormPlato() {
  document.getElementById('editPlatoId').value = ''
  document.getElementById('platoNombre').value = ''
  document.getElementById('platoDescripcion').value = ''
  document.getElementById('platoPrecio').value = ''
  document.getElementById('platoCategoria').value = ''
  document.getElementById('plato-form-title').textContent = '➕ Nuevo Plato'
  document.getElementById('cancelPlatoBtn').style.display = 'none'
  alergenosSeleccionados = []
  cargarAlergenosGrid()
}

function actualizarSelectCategorias(categorias) {
  const select = document.getElementById('platoCategoria')
  select.innerHTML = '<option value="">-- Selecciona categoría --</option>'
  categorias.filter(c => c.activa).forEach(cat => {
    select.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`
  })
}

async function cargarTodo() {
  cargarAlergenosGrid()
  await cargarCategorias()
  await cargarPlatos()
}