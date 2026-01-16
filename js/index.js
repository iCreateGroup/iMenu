import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://qozzxdrjwjskmwmxscqj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvenp4ZHJqd2pza213bXhzY3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODkyNjgsImV4cCI6MjA4MTU2NTI2OH0.3C_4cTXacx0Gf8eRtBYp2uaNZ61OE4SEEOUTDSW4P98'
const supabase = createClient(supabaseUrl, supabaseKey)

const params = new URLSearchParams(window.location.search)
const clienteId = params.get('cliente')

console.log('Cliente ID:', clienteId)

async function cargarCarta(clienteId) {
  const mainMenu = document.getElementById('mainMenu')
  
  if (!clienteId) {
    mainMenu.innerHTML = '<div class="empty-message">URL inválida. Falta el parámetro "cliente".</div>'
    return
  }

  try {
    console.log('Cargando categorías para usuario:', clienteId)
    
    const { data: categorias, error: catError } = await supabase
      .from('Categorias')
      .select('*')
      .eq('user_id', clienteId)
      .eq('activa', true)
      .order('orden')

    console.log('Categorías recibidas:', categorias)
    console.log('Error categorías:', catError)

    if (catError) throw catError

    const { data: platos, error: platosError } = await supabase
      .from('Menu')
      .select('*')
      .eq('user_id', clienteId)
      .eq('activo', true)
      .order('orden')

    console.log('Platos recibidos:', platos)
    console.log('Error platos:', platosError)

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
            otherBtn.nextElementSibling.classList.remove("show");
          }
        })
        
        btn.classList.toggle("active")
        const content = btn.nextElementSibling
        content.classList.toggle('show');
      })
    })

  } catch (error) {
    console.error('Error cargando carta:', error)
    mainMenu.innerHTML = `<div class="empty-message">Error al cargar la carta: ${error.message}</div>`
  }
}

if (clienteId) {
  cargarCarta(clienteId)
} else {
  document.getElementById('mainMenu').innerHTML = '<div class="empty-message">URL inválida. Agrega ?cliente=TU_USER_ID a la URL</div>'
}