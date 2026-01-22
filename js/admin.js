import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://qozzxdrjwjskmwmxscqj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvenp4ZHJqd2pza213bXhzY3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODkyNjgsImV4cCI6MjA4MTU2NTI2OH0.3C_4cTXacx0Gf8eRtBYp2uaNZ61OE4SEEOUTDSW4P98";
const supabase = createClient(supabaseUrl, supabaseKey);

const db = supabase.schema("iMenu");
// Bucket recomendado para imágenes (Supabase Storage)
const STORAGE_BUCKET = "imenu";

let user = null;

const ALERGENOS = [
  "gluten",
  "crustaceos",
  "huevos",
  "pescado",
  "cacahuetes",
  "soja",
  "lacteos",
  "frutos_secos",
  "apio",
  "mostaza",
  "sesamo",
  "sulfitos",
  "altramuces",
  "moluscos",
];

let alergenosSeleccionados = [];

// Cache para UI (filtro/buscador/badges)
let ALL_CATEGORIAS = [];
let ALL_PLATOS = [];

// Sortable instances (para destruir/recrear al re-render)
let sortableCategorias = null;
let sortablePlatos = null;

// ========== DOM (LOGIN) ==========
const loginForm = document.getElementById("login-form");
const adminPanel = document.getElementById("admin-panel");
const loginError = document.getElementById("loginError");

// PERFIL
const perfilNombre = document.getElementById("perfilNombre");
const perfilSlug = document.getElementById("perfilSlug");
const perfilTelefono = document.getElementById("perfilTelefono");
const perfilDireccion = document.getElementById("perfilDireccion");
const perfilWifi = document.getElementById("perfilWifi");
const perfilWifiPass = document.getElementById("perfilWifiPass");
const perfilWifiPin = document.getElementById("perfilWifiPin");
const perfilReviews = document.getElementById("perfilReviews");
const perfilRating = document.getElementById("perfilRating");
const perfilRatingCount = document.getElementById("perfilRatingCount");
const perfilPortadaUrl = document.getElementById("perfilPortadaUrl");
const perfilPortadaFile = document.getElementById("perfilPortadaFile");
const perfilPortadaPreview = document.getElementById("perfilPortadaPreview");
const perfilGooglePlaceId = document.getElementById("perfilGooglePlaceId");
const buscarPlaceIdBtn = document.getElementById("buscarPlaceIdBtn");

// Modal Place ID
const placeIdModal = document.getElementById("placeIdModal");
const placeIdModalBackdrop = document.getElementById("placeIdModalBackdrop");
const placeIdModalClose = document.getElementById("placeIdModalClose");
const placeSearchInput = document.getElementById("placeSearchInput");
const placeResultName = document.getElementById("placeResultName");
const placeResultAddr = document.getElementById("placeResultAddr");
const placeResultId = document.getElementById("placeResultId");
const usePlaceIdBtn = document.getElementById("usePlaceIdBtn");

// CATEGORIAS
const editCategoriaId = document.getElementById("editCategoriaId");
const categoriaNombre = document.getElementById("categoriaNombre");
const guardarCategoriaBtn = document.getElementById("guardarCategoriaBtn");
const cancelCategoriaBtn = document.getElementById("cancelCategoriaBtn");
const categoriaFormTitle = document.getElementById("categoria-form-title");

// PLATOS (form)
const editPlatoId = document.getElementById("editPlatoId");
const platoNombre = document.getElementById("platoNombre");
const platoDescripcion = document.getElementById("platoDescripcion");
const platoPrecio = document.getElementById("platoPrecio");
const platoSubcategoria = document.getElementById("platoSubcategoria");
const platoCategoria = document.getElementById("platoCategoria");
const platoImagenUrl = document.getElementById("platoImagenUrl");
const platoImagenFile = document.getElementById("platoImagenFile");
const platoImagenPreview = document.getElementById("platoImagenPreview");
const guardarPlatoBtn = document.getElementById("guardarPlatoBtn");
const cancelPlatoBtn = document.getElementById("cancelPlatoBtn");
const platoFormTitle = document.getElementById("plato-form-title");
const platoEditAside = document.getElementById("platoEditAside");
const platoEditAsideBody = document.getElementById("platoEditAsideBody");

// PLATOS (toolbar)
const platosCategoriaFilter = document.getElementById("platosCategoriaFilter");
const platosSearch = document.getElementById("platosSearch");

// ========== HELPERS ==========
function safeText(v) {
  return (v ?? "").toString();
}

function slugify(input) {
  return safeText(input)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function showPreview(el, url) {
  if (!el) return;
  if (!url) {
    el.style.display = "none";
    el.innerHTML = "";
    return;
  }
  el.style.display = "";
  el.innerHTML = `<img src="${url}" alt="preview" style="max-width:100%;border-radius:12px;display:block"/>`;
}

function normalizeAllergenKey(v) {
  const raw = safeText(v).trim().toLowerCase();
  if (!raw) return "";
  const clean = raw.replace(/^alergenos\//, "").replace(/\.svg$/, "");
  const n = clean
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  const includes = (needle) => n.includes(needle);
  if (includes("gluten")) return "gluten";
  if (includes("huevo")) return "huevos";
  if (includes("lact") || includes("leche")) return "lacteos";
  if (includes("crust")) return "crustaceos";
  if (includes("molusc")) return "moluscos";
  if (includes("cacahuet")) return "cacahuetes";
  if (includes("sesam")) return "sesamo";
  if (includes("mostaz")) return "mostaza";
  if (includes("pescad")) return "pescado";
  if (includes("soja")) return "soja";
  if (includes("apio")) return "apio";
  if (includes("altram")) return "altramuces";
  if (includes("sulfit")) return "sulfitos";
  if (includes("frutos") && (includes("cascara") || includes("secos")))
    return "frutos_secos";
  return n.replace(/\s+/g, "_");
}

function categoriaNombreById(id) {
  const c = ALL_CATEGORIAS.find((x) => Number(x.id) === Number(id));
  return c?.nombre || "";
}

async function uploadToStorage(file, folder) {
  if (!file) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) {
    throw new Error(`No se pudo subir la imagen a Storage: ${upErr.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

// ========== LOGIN ==========
document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    loginError.textContent = error.message;
    return;
  }
  user = data.user;
  loginForm.style.display = "none";
  adminPanel.style.display = "block";
  await cargarTodo();
};

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

// ========== TABS ==========
document.querySelectorAll(".tab").forEach((tab) => {
  tab.onclick = () => {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  };
});

// ========== PERFIL ==========
async function cargarPerfil() {
  const { data, error } = await db
    .from("Perfil")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("Perfil:", error.message);
    return;
  }

  if (data) {
    perfilNombre.value = safeText(data.nombre);
    perfilSlug.value = safeText(data.slug);
    perfilTelefono.value = safeText(data.telefono);
    perfilDireccion.value = safeText(data.direccion);

    // Wi-Fi: SOLO nombre + clave (sin columna legacy "wifi")
    perfilWifi.value = safeText(data.wifi_name);
    if (perfilWifiPass) perfilWifiPass.value = safeText(data.wifi_pass);

    // El PIN no se puede leer (se guarda hasheado). Déjalo en blanco.
    if (perfilWifiPin) perfilWifiPin.value = "";

    perfilReviews.value = safeText(data.reviews_url);
    perfilRating.value = data.rating ?? "";
    perfilRatingCount.value = data.rating_count ?? "";
    perfilPortadaUrl.value = safeText(data.portada_url);
    perfilGooglePlaceId.value = safeText(data.google_place_id);
    showPreview(perfilPortadaPreview, data.portada_url);
  }
}

// Autogenerar slug si está vacío
perfilNombre?.addEventListener("input", () => {
  if (!perfilSlug.value.trim()) perfilSlug.value = slugify(perfilNombre.value);
});

perfilPortadaUrl?.addEventListener("input", () => {
  showPreview(perfilPortadaPreview, perfilPortadaUrl.value.trim());
});

perfilPortadaFile?.addEventListener("change", () => {
  const f = perfilPortadaFile.files?.[0];
  if (!f) return;
  const blob = URL.createObjectURL(f);
  showPreview(perfilPortadaPreview, blob);
});

document.getElementById("guardarPerfilBtn").onclick = async () => {
  try {
    let portadaFinal = perfilPortadaUrl.value.trim();
    const f = perfilPortadaFile.files?.[0];
    if (f) {
      portadaFinal = await uploadToStorage(f, `${user.id}/portadas`);
      perfilPortadaUrl.value = portadaFinal;
      perfilPortadaFile.value = "";
      showPreview(perfilPortadaPreview, portadaFinal);
    }

    const payload = {
      user_id: user.id,
      nombre: perfilNombre.value.trim() || null,
      slug: perfilSlug.value.trim() || null,
      telefono: perfilTelefono.value.trim() || null,
      direccion: perfilDireccion.value.trim() || null,

      // Wi-Fi nuevo: SOLO wifi_name y wifi_pass
      wifi_name: perfilWifi.value.trim() || null,
      wifi_pass: perfilWifiPass?.value.trim() || null,

      reviews_url: perfilReviews.value.trim() || null,
      google_place_id: perfilGooglePlaceId.value.trim() || null,
      rating: perfilRating.value !== "" ? Number(perfilRating.value) : null,
      rating_count:
        perfilRatingCount.value !== "" ? Number(perfilRatingCount.value) : null,
      portada_url: portadaFinal || null,
    };

    const { error } = await db.from("Perfil").upsert(payload);
    if (error) throw error;

    // Si el usuario ha escrito un PIN, lo guardamos (hasheado) via RPC
    const pinRaw = (perfilWifiPin?.value || "").trim();
    if (pinRaw) {
      const { error: pinErr } = await supabase.rpc("imenu_set_wifi_pin", {
        p_pin: pinRaw,
      });
      if (pinErr) throw pinErr;
      // Limpia el input por seguridad (no se queda visible)
      try {
        perfilWifiPin.value = "";
      } catch {}
    }

    alert("Perfil guardado ✅");
  } catch (e) {
    alert(e.message);
  }
};

// ========== PLACE ID FINDER (Google Places Autocomplete) ==========
function openPlaceIdModal() {
  if (!placeIdModal) return;
  placeIdModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  // reset
  if (placeSearchInput) placeSearchInput.value = "";
  if (placeResultName) placeResultName.textContent = "-";
  if (placeResultAddr) placeResultAddr.textContent = "-";
  if (placeResultId) placeResultId.textContent = "-";
  setTimeout(() => placeSearchInput?.focus(), 50);

  // Inicializa Autocomplete si no está ya
  initPlaceAutocompleteOnce();
}

function closePlaceIdModal() {
  if (!placeIdModal) return;
  placeIdModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

let __placeAutocompleteInit = false;
function initPlaceAutocompleteOnce() {
  if (__placeAutocompleteInit) return;
  if (!placeSearchInput) return;

  // Espera a que cargue Google Maps JS
  if (!window.google?.maps?.places) {
    console.warn(
      "Google Maps JS no está cargado. Revisa TU_API_KEY y libraries=places.",
    );
    return;
  }

  const ac = new google.maps.places.Autocomplete(placeSearchInput, {
    fields: ["place_id", "name", "formatted_address"],
    componentRestrictions: { country: "es" },
  });

  ac.addListener("place_changed", () => {
    const p = ac.getPlace();
    const pid = p?.place_id || "";
    if (placeResultName) placeResultName.textContent = p?.name || "-";
    if (placeResultAddr)
      placeResultAddr.textContent = p?.formatted_address || "-";
    if (placeResultId) placeResultId.textContent = pid || "-";
  });

  __placeAutocompleteInit = true;
}

buscarPlaceIdBtn?.addEventListener("click", () => {
  window.open(
    "https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder",
    "_blank",
    "noopener",
  );
});
// (El modal/autocomplete antiguo se mantiene en el archivo, pero ya no se usa)
placeIdModalBackdrop?.addEventListener("click", closePlaceIdModal);
placeIdModalClose?.addEventListener("click", closePlaceIdModal);
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    placeIdModal?.getAttribute("aria-hidden") === "false"
  ) {
    closePlaceIdModal();
  }
});

usePlaceIdBtn?.addEventListener("click", async () => {
  const pid = safeText(placeResultId?.textContent).trim();
  if (!pid || pid === "-") return;
  if (perfilGooglePlaceId) perfilGooglePlaceId.value = pid;

  try {
    await navigator.clipboard.writeText(pid);
  } catch {}

  closePlaceIdModal();
});

// ========== ALERGENOS ==========
function cargarAlergenosGrid() {
  const grid = document.getElementById("alergenosGrid");
  grid.innerHTML = "";

  ALERGENOS.forEach((a) => {
    const div = document.createElement("div");
    div.className = "alergeno-item";
    div.dataset.alergeno = a;
    if (alergenosSeleccionados.includes(a)) div.classList.add("selected");

    div.innerHTML = `
      <img src="alergenos/${a}.svg" alt="${a}" onerror="this.style.display='none'">
      <span>${a.replace(/_/g, " ")}</span>
    `;

    div.onclick = () => {
      const idx = alergenosSeleccionados.indexOf(a);
      if (idx > -1) {
        alergenosSeleccionados.splice(idx, 1);
        div.classList.remove("selected");
      } else {
        alergenosSeleccionados.push(a);
        div.classList.add("selected");
      }
    };

    grid.appendChild(div);
  });
}

// ========== CATEGORIAS ==========
async function cargarCategorias() {
  const { data: categorias, error } = await db
    .from("Categorias")
    .select("*")
    .eq("user_id", user.id)
    .order("orden", { ascending: true });

  if (error) {
    console.warn("Categorias:", error.message);
    return;
  }

  ALL_CATEGORIAS = categorias || [];

  const container = document.getElementById("categoriasContainer");
  container.innerHTML = "";

  if (!ALL_CATEGORIAS.length) {
    container.innerHTML =
      '<div class="empty-state">No hay categorías. ¡Crea la primera!</div>';
    actualizarSelectCategorias([]);
    fillPlatosCategoriaFilter([]);
    return;
  }

  ALL_CATEGORIAS.forEach((cat) => {
    const div = document.createElement("div");
    div.className = "categoria-item" + (cat.activa ? "" : " inactiva");
    div.dataset.id = cat.id;
    div.innerHTML = `
      <span class="drag-handle">☰</span>
      <div class="categoria-nombre">${cat.nombre} ${cat.activa ? "" : "(Desactivada)"}</div>
      <div class="categoria-actions">
        <button class="btn-editar" data-id="${cat.id}">✏️ Editar</button>
        <button class="btn-toggle" data-id="${cat.id}">${cat.activa ? "👁️ Ocultar" : "👁️ Mostrar"}</button>
        <button class="btn-eliminar" data-id="${cat.id}">🗑️ Eliminar</button>
      </div>
    `;
    container.appendChild(div);
  });

  container
    .querySelectorAll(".btn-editar")
    .forEach((btn) => (btn.onclick = () => editarCategoria(btn.dataset.id)));
  container
    .querySelectorAll(".btn-toggle")
    .forEach((btn) => (btn.onclick = () => toggleCategoria(btn.dataset.id)));
  container
    .querySelectorAll(".btn-eliminar")
    .forEach((btn) => (btn.onclick = () => eliminarCategoria(btn.dataset.id)));

  // Select del form de platos + select del filtro
  actualizarSelectCategorias(ALL_CATEGORIAS);
  fillPlatosCategoriaFilter(ALL_CATEGORIAS);

  // Sortable (móvil y PC)
  makeSortableCategorias(container);
}

function actualizarSelectCategorias(categorias) {
  platoCategoria.innerHTML = "";
  if (!categorias || !categorias.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Crea una categoría primero";
    platoCategoria.appendChild(opt);
    return;
  }
  categorias.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.nombre;
    platoCategoria.appendChild(opt);
  });
}

function fillPlatosCategoriaFilter(categorias) {
  if (!platosCategoriaFilter) return;

  const prev = platosCategoriaFilter.value;
  platosCategoriaFilter.innerHTML =
    `<option value="">Todas</option>` +
    (categorias || [])
      .map((c) => `<option value="${c.id}">${c.nombre}</option>`)
      .join("");

  // intenta mantener selección previa
  if ([...platosCategoriaFilter.options].some((o) => o.value === prev)) {
    platosCategoriaFilter.value = prev;
  } else {
    platosCategoriaFilter.value = "";
  }
}

function editarCategoria(id) {
  const cat = ALL_CATEGORIAS.find((c) => String(c.id) === String(id));
  editCategoriaId.value = id;
  categoriaNombre.value = cat?.nombre || "";
  categoriaFormTitle.textContent = "✏️ Editar Categoría";
  cancelCategoriaBtn.style.display = "";
}

cancelCategoriaBtn.onclick = () => {
  editCategoriaId.value = "";
  categoriaNombre.value = "";
  categoriaFormTitle.textContent = "➕ Nueva Categoría";
  cancelCategoriaBtn.style.display = "none";
};

guardarCategoriaBtn.onclick = async () => {
  const nombre = categoriaNombre.value.trim();
  if (!nombre) return alert("Pon un nombre");

  const id = editCategoriaId.value;
  if (id) {
    await db.from("Categorias").update({ nombre }).eq("id", id);
  } else {
    // orden al final
    const nextOrden = ALL_CATEGORIAS.length;
    await db
      .from("Categorias")
      .insert({ nombre, user_id: user.id, activa: true, orden: nextOrden });
  }

  cancelCategoriaBtn.onclick();
  await cargarCategorias();
  await cargarPlatos();
};

async function toggleCategoria(id) {
  const cat = ALL_CATEGORIAS.find((c) => String(c.id) === String(id));
  await db.from("Categorias").update({ activa: !cat.activa }).eq("id", id);
  await cargarCategorias();
}

async function eliminarCategoria(id) {
  if (
    !confirm("¿Eliminar categoría? También se quedarán platos sin categoría.")
  )
    return;
  await db.from("Categorias").delete().eq("id", id);
  await cargarCategorias();
  await cargarPlatos();
}

function makeSortableCategorias(container) {
  if (!window.Sortable) return;

  if (sortableCategorias) {
    sortableCategorias.destroy();
    sortableCategorias = null;
  }

  sortableCategorias = Sortable.create(container, {
    animation: 150,
    handle: ".drag-handle",
    ghostClass: "drag-ghost",
    onEnd: async () => {
      const items = [...container.querySelectorAll(".categoria-item")];
      for (let i = 0; i < items.length; i++) {
        const id = items[i].dataset.id;
        await db.from("Categorias").update({ orden: i }).eq("id", id);
      }
      await cargarCategorias();
    },
  });
}

// ========== PLATOS ==========
function resetPlatoForm() {
  editPlatoId.value = "";
  platoNombre.value = "";
  platoDescripcion.value = "";
  platoPrecio.value = "";
  platoSubcategoria.value = "";
  platoImagenUrl.value = "";
  platoImagenFile.value = "";
  platoFormTitle.textContent = "➕ Nuevo Plato";
  cancelPlatoBtn.style.display = "none";
  alergenosSeleccionados = [];
  cargarAlergenosGrid();
  showPreview(platoImagenPreview, null);
  if (platoEditAside) platoEditAside.style.display = "none";
  if (platoEditAsideBody) platoEditAsideBody.innerHTML = "";
}

platoImagenUrl?.addEventListener("input", () => {
  showPreview(platoImagenPreview, platoImagenUrl.value.trim());
});

platoImagenFile?.addEventListener("change", () => {
  const f = platoImagenFile.files?.[0];
  if (!f) return;
  const blob = URL.createObjectURL(f);
  showPreview(platoImagenPreview, blob);
});

cancelPlatoBtn.onclick = resetPlatoForm;

async function cargarPlatos() {
  const { data: platos, error } = await db
    .from("Menu")
    .select("*")
    .eq("user_id", user.id)
    // ayuda a que "Todas" se vea agrupado
    .order("categoria_id", { ascending: true })
    .order("orden", { ascending: true });

  if (error) {
    console.warn("Menu:", error.message);
    return;
  }

  ALL_PLATOS = platos || [];
  renderPlatosFiltrados();
}

function renderPlatosFiltrados() {
  const catId = platosCategoriaFilter?.value
    ? Number(platosCategoriaFilter.value)
    : null;
  const q = (platosSearch?.value || "").trim().toLowerCase();

  const filtered = ALL_PLATOS.filter((p) => {
    const okCat = !catId || Number(p.categoria_id) === catId;
    const okQ =
      !q ||
      (p.plato || "").toLowerCase().includes(q) ||
      (p.descripcion || "").toLowerCase().includes(q);
    return okCat && okQ;
  });

  renderPlatosList(filtered);
}

function renderPlatosList(platos) {
  const container = document.getElementById("platosContainer");
  container.innerHTML = "";

  if (!platos || !platos.length) {
    container.innerHTML =
      '<div class="empty-state">No hay platos con este filtro.</div>';
    if (sortablePlatos) {
      sortablePlatos.destroy();
      sortablePlatos = null;
    }
    return;
  }

  platos.forEach((p) => {
    const div = document.createElement("div");
    div.className = "plato-item" + (p.activo ? "" : " inactiva");
    div.dataset.id = p.id;

    const img = p.imagen_url
      ? `<img src="${p.imagen_url}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:10px;margin-right:10px"/>`
      : "";

    const catName = categoriaNombreById(p.categoria_id);

    div.innerHTML = `
      <span class="drag-handle">☰</span>
      ${img}
      <div class="plato-info">
        <div class="plato-nombre">${safeText(p.plato)} ${p.activo ? "" : "(Oculto)"}</div>
        <div class="plato-desc">${p.descripcion ? safeText(p.descripcion) : ""}</div>
        <div class="plato-meta">
          ${catName ? `<span class="badge-cat">${catName}</span>` : ""}
          ${p.subcategoria ? `<span class="chipmini">${safeText(p.subcategoria)}</span>` : ""}
        </div>
      </div>
      <div class="plato-precio">${p.precio != null ? Number(p.precio).toFixed(2) + " €" : ""}</div>
      <div class="plato-actions">
        <button class="btn-editar" data-id="${p.id}">✏️</button>
        <button class="btn-toggle" data-id="${p.id}">${p.activo ? "👁️" : "🙈"}</button>
        <button class="btn-eliminar" data-id="${p.id}">🗑️</button>
      </div>
    `;

    container.appendChild(div);
  });

  container
    .querySelectorAll(".btn-editar")
    .forEach((btn) => (btn.onclick = () => editarPlato(btn.dataset.id)));
  container
    .querySelectorAll(".btn-toggle")
    .forEach((btn) => (btn.onclick = () => togglePlato(btn.dataset.id)));
  container
    .querySelectorAll(".btn-eliminar")
    .forEach((btn) => (btn.onclick = () => eliminarPlato(btn.dataset.id)));

  makeSortablePlatos(container);
}

function editarPlato(id) {
  const p = ALL_PLATOS.find((x) => String(x.id) === String(id));
  if (!p) return;

  editPlatoId.value = p.id;
  platoNombre.value = p.plato || "";
  platoDescripcion.value = p.descripcion || "";
  platoPrecio.value = p.precio ?? "";
  platoSubcategoria.value = p.subcategoria || "";
  platoCategoria.value = p.categoria_id ?? "";
  platoImagenUrl.value = p.imagen_url || "";
  showPreview(platoImagenPreview, p.imagen_url || null);

  const existing = Array.isArray(p.alergenos) ? p.alergenos : [];
  alergenosSeleccionados = existing
    .map(normalizeAllergenKey)
    .filter(Boolean)
    .filter((k) => ALERGENOS.includes(k));

  cargarAlergenosGrid();

  // Aside "Editando"
  if (platoEditAside && platoEditAsideBody) {
    const catName = categoriaNombreById(p.categoria_id);
    const thumb = p.imagen_url
      ? `<img class="edit-aside-thumb" src="${p.imagen_url}" alt="">`
      : `<div class="edit-aside-thumb"></div>`;

    const tags = [];
    if (catName) tags.push(`<span class="edit-tag">${catName}</span>`);
    if (p.subcategoria)
      tags.push(`<span class="edit-tag">${safeText(p.subcategoria)}</span>`);
    if (p.precio != null)
      tags.push(
        `<span class="edit-tag">${Number(p.precio).toFixed(2)} €</span>`,
      );

    platoEditAsideBody.innerHTML = `
      ${thumb}
      <div class="edit-aside-meta">
        <div class="edit-aside-name">${safeText(p.plato)}</div>
        <div class="edit-aside-tags">${tags.join("")}</div>
      </div>
    `;
    platoEditAside.style.display = "";
  }

  platoFormTitle.textContent = "✏️ Editar Plato";
  cancelPlatoBtn.style.display = "";
}

async function togglePlato(id) {
  const p = ALL_PLATOS.find((x) => String(x.id) === String(id));
  await db.from("Menu").update({ activo: !p.activo }).eq("id", id);
  await cargarPlatos();
}

async function eliminarPlato(id) {
  if (!confirm("¿Eliminar plato?")) return;
  await db.from("Menu").delete().eq("id", id);
  await cargarPlatos();
}

function makeSortablePlatos(container) {
  if (!window.Sortable) return;

  if (sortablePlatos) {
    sortablePlatos.destroy();
    sortablePlatos = null;
  }

  sortablePlatos = Sortable.create(container, {
    animation: 150,
    handle: ".drag-handle",
    ghostClass: "drag-ghost",
    onEnd: async () => {
      const visibleIds = [...container.querySelectorAll(".plato-item")].map(
        (el) => Number(el.dataset.id),
      );

      // Si hay filtro de categoría, ordenamos SOLO dentro de esa categoría (lo más lógico)
      const catId = platosCategoriaFilter?.value
        ? Number(platosCategoriaFilter.value)
        : null;

      for (let i = 0; i < visibleIds.length; i++) {
        const id = visibleIds[i];
        const plato = ALL_PLATOS.find((p) => Number(p.id) === Number(id));
        if (!plato) continue;

        if (!catId || Number(plato.categoria_id) === catId) {
          await db.from("Menu").update({ orden: i }).eq("id", id);
        }
      }

      await cargarPlatos();
    },
  });
}

guardarPlatoBtn.onclick = async () => {
  const nombre = platoNombre.value.trim();
  if (!nombre) return alert("Pon un nombre");

  const catId = platoCategoria.value ? Number(platoCategoria.value) : null;
  if (!catId) return alert("Selecciona una categoría");

  try {
    let imgFinal = platoImagenUrl.value.trim();
    const f = platoImagenFile.files?.[0];
    if (f) {
      imgFinal = await uploadToStorage(f, `${user.id}/platos`);
      platoImagenUrl.value = imgFinal;
      platoImagenFile.value = "";
      showPreview(platoImagenPreview, imgFinal);
    }

    const payload = {
      plato: nombre,
      descripcion: platoDescripcion.value.trim() || null,
      precio: platoPrecio.value !== "" ? Number(platoPrecio.value) : null,
      categoria_id: catId,
      subcategoria: platoSubcategoria.value.trim() || null,
      imagen_url: imgFinal || null,
      alergenos: alergenosSeleccionados,
      user_id: user.id,
    };

    const id = editPlatoId.value;
    const { error } = id
      ? await db.from("Menu").update(payload).eq("id", id)
      : await supabase
          .from("Menu")
          .insert({ ...payload, activo: true, orden: 0 });

    if (error) throw error;

    resetPlatoForm();
    await cargarPlatos();
  } catch (e) {
    alert(e.message);
  }
};

// Toolbar listeners
platosCategoriaFilter?.addEventListener("change", renderPlatosFiltrados);
platosSearch?.addEventListener("input", renderPlatosFiltrados);

// ========== INIT ==========
async function cargarTodo() {
  cargarAlergenosGrid();
  await cargarPerfil();
  await cargarCategorias();
  await cargarPlatos();
}

// Si ya hay sesion, auto login
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) {
    user = data.session.user;
    loginForm.style.display = "none";
    adminPanel.style.display = "block";
    await cargarTodo();
  }
})();
