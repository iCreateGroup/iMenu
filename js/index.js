import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://qozzxdrjwjskmwmxscqj.supabase.co'
const supabaseKey = 'sb_publishable_UtBfupVv8e2zniYdv1jvEA_SXIyWE0Z'
const supabase = createClient(supabaseUrl, supabaseKey)

const params = new URLSearchParams(window.location.search)
const clienteId = params.get('cliente')

async function cargarCarta(clienteId) {
  const mainMenu = document.getElementById('mainMenu')
  
  if (!clienteId) {
    mainMenu.innerHTML = '<div class="empty-message">URL inválida. Falta el parámetro "cliente".</div>'
    return
  }

  try {
    const { data: categorias, error: catError } = await supabase
      .from('Categorias')
      .select('*')
      .eq('user_id', clienteId)
      .eq('activa', true)
      .order('orden')

    if (catError) throw catError

    const { data: platos, error: platosError } = await supabase
      .from('Menu')
      .select('*')
      .eq('user_id', clienteId)
      .eq('activo', true)
      .order('orden')

    if (platosError) throw platosError

    mainMenu.innerHTML = ''

    if (!categorias || categorias.length === 0) {
      mainMenu.innerHTML = '<div class="empty-message">Esta carta aún no tiene contenido.</div>'
      return
    }

    categorias.forEach(categoria => {
      const platosCat = platos.filter(p => p.categoria_id == categoria.id)
      
      if (platosCat.length === 0) return

      const section = document.createElement('section')
      section.className = 'menu-section'

      const button = document.createElement('button')
      button.className = 'collapsible'
      button.textContent = categoria.nombre

      const contentDiv = document.createElement('div')
      contentDiv.className = 'content'

      const ul = document.createElement('ul')

      platosCat.forEach(plato => {
        const li = document.createElement('li')
        
        let alergenosHTML = ''
        if (plato.alergenos && plato.alergenos.length > 0) {
          alergenosHTML = '<div class="alergenos">'
          plato.alergenos.forEach(alergeno => {
            alergenosHTML += `<img src="alergenos/${alergeno}.svg" alt="${alergeno}" title="${alergeno.replace('_', ' ')}">`
          })
          alergenosHTML += '</div>'
        }
        
        li.innerHTML = `
          <div class="plato-info">
            <span class="dish">${plato.plato}</span>
            ${plato.descripcion ? `<div class="descripcion">${plato.descripcion}</div>` : ''}
          </div>
          <div class="plato-derecha">
            ${alergenosHTML}
            ${plato.precio ? `<div class="precio">${parseFloat(plato.precio).toFixed(2)}€</div>` : ''}
          </div>
        `
        
        ul.appendChild(li)
      })

      contentDiv.appendChild(ul)
      section.appendChild(button)
      section.appendChild(contentDiv)
      mainMenu.appendChild(section)
    })

    document.querySelectorAll(".collapsible").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".collapsible").forEach(otherBtn => {
          if (otherBtn !== btn) {
            otherBtn.classList.remove("active")
            otherBtn.nextElementSibling.style.display = "none"
          }
        })
        
        btn.classList.toggle("active")
        const content = btn.nextElementSibling
        content.style.display = content.style.display === "block" ? "none" : "block"
      })
    })

  } catch (error) {
    console.error('Error cargando carta:', error)
    mainMenu.innerHTML = '<div class="empty-message">Error al cargar la carta. Por favor, intenta de nuevo más tarde.</div>'
  }
}

if (clienteId) {
  cargarCarta(clienteId)
} else {
  document.getElementById('mainMenu').innerHTML = '<div class="empty-message">URL inválida. Agrega ?cliente=TU_USER_ID a la URL</div>'
}