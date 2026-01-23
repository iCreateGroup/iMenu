import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// =============================
// Supabase (usa tus credenciales actuales)
// =============================
const supabaseUrl = "https://qozzxdrjwjskmwmxscqj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvenp4ZHJqd2pza213bXhzY3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODkyNjgsImV4cCI6MjA4MTU2NTI2OH0.3C_4cTXacx0Gf8eRtBYp2uaNZ61OE4SEEOUTDSW4P98";
const supabase = createClient(supabaseUrl, supabaseKey);

const db = supabase.schema("iMenu");
const params = new URLSearchParams(window.location.search);
// Compatibilidad:
// - ?cliente=<uuid> (modo antiguo)
// - ?cliente=<slug> (nuevo: friendly)
// - ?bar=<slug>
const clienteParam = params.get("cliente") || params.get("bar");

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v || ""),
  );
}

let clienteId = null; // siempre será UUID al final

// =============================
// DOM
// =============================
const viewHome = document.getElementById("viewHome");
const viewCategory = document.getElementById("viewCategory");

const cover = document.getElementById("cover");
const coverImg = document.getElementById("coverImg");
const placeTitle = document.getElementById("placeTitle");
const homeCategories = document.getElementById("homeCategories");

const ratingBtn = document.getElementById("ratingBtn");
const ratingPrimary = document.getElementById("ratingPrimary");
const ratingSecondary = document.getElementById("ratingSecondary");
const infoBtn = document.getElementById("infoBtn");
const infoSecondary = document.getElementById("infoSecondary");

const backBtn = document.getElementById("backBtn");
const categoryTitle = document.getElementById("categoryTitle");
const subcatChips = document.getElementById("subcatChips");
const dishList = document.getElementById("dishList");

const searchOverlay = document.getElementById("searchOverlay");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const closeSearch = document.getElementById("closeSearch");
const searchBackdrop = document.getElementById("searchBackdrop");

const homeSearchBtn = document.getElementById("homeSearchBtn");
const catSearchBtn = document.getElementById("catSearchBtn");

const ctaBtn = document.getElementById("ctaBtn");

const dishSheet = document.getElementById("dishSheet");
const sheetImageWrap = document.getElementById("sheetImageWrap");
const sheetImage = document.getElementById("sheetImage");
const sheetTitle = document.getElementById("sheetTitle");
const sheetPrice = document.getElementById("sheetPrice");
const sheetDesc = document.getElementById("sheetDesc");
const sheetAllergenSection = document.getElementById("sheetAllergenSection");
const sheetAllergens = document.getElementById("sheetAllergens");

const ratingsSheet = document.getElementById("ratingsSheet");
const ratingsValue = document.getElementById("ratingsValue");
const ratingsStars = document.getElementById("ratingsStars");
const ratingsCount = document.getElementById("ratingsCount");
const ratingsBars = document.getElementById("ratingsBars");
const openReviewsBtn = document.getElementById("openReviewsBtn");

const infoSheet = document.getElementById("infoSheet");
const infoTitle = document.getElementById("infoTitle");
const mapWrap = document.getElementById("mapWrap");
const mapFrame = document.getElementById("mapFrame");
const infoRows = document.getElementById("infoRows");

// =============================
// State
// =============================
let CATEGORIAS = [];
let PLATOS = [];

let ACTIVE_CAT_ID = null;
let ACTIVE_SUBCAT = "all";
let SEARCH_Q = "";

// Perfil (opcional): si existe tabla "Perfiles" o "Perfil", la usamos.
let PROFILE = null;

// =============================
// Utils
// =============================
function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function formatPrice(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return `${n.toFixed(2)} €`;
}

function baseUrl(path) {
  return new URL(path, document.baseURI).toString();
}

function normalizeAllergenKey(v) {
  const raw = (v || "").toString().trim().toLowerCase();
  if (!raw) return "";

  // si viene como 'gluten.svg' o 'alergenos/gluten.svg'
  const clean = raw.replace(/^alergenos\//, "").replace(/\.svg$/, "");
  const n = clean
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  // Mapeo tolerante: si en BD guardaste textos tipo "cereales con gluten",
  // los convertimos a las keys que tienes como SVG.
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
  if (
    includes("frutos") &&
    (includes("cascara") || includes("carcara") || includes("secos"))
  )
    return "frutos_secos";

  // fallback: convierte espacios a _ para intentar cargar un SVG con ese nombre
  return n.replace(/\s+/g, "_");
}

function allergenKeyToUrl(v) {
  const key = normalizeAllergenKey(v);
  if (!key) return null;
  return baseUrl(`alergenos/${key}.svg`);
}

function renderStars(container, value) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  container.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const span = document.createElement("span");
    span.className = "star";
    if (i < full) span.textContent = "★";
    else if (i == full && half) span.textContent = "★";
    else span.textContent = "☆";
    container.appendChild(span);
  }
}

function openGenericSheet(sheetEl) {
  sheetEl.classList.add("is-open");
  sheetEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeGenericSheet(sheetEl) {
  sheetEl.classList.remove("is-open");
  sheetEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function safeText(v) {
  return (v ?? "").toString();
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return null;
}

function getWriteReviewUrl(profile) {
  const placeId = pick(profile, [
    "google_place_id",
    "place_id",
    "googlePlaceId",
  ]);
  if (!placeId) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

function getGoogleReviewsSearchUrl(profile) {
  const placeId = pick(profile, [
    "google_place_id",
    "place_id",
    "googlePlaceId",
  ]);
  if (!placeId) return null;

  // Usa el nombre del local como query; si no existe, al menos ponemos "restaurante"
  const q =
    pick(profile, [
      "nombre",
      "name",
      "restaurant_name",
      "local_name",
      "titulo",
    ]) || "restaurante";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&query_place_id=${encodeURIComponent(placeId)}`;
}

function setView(which) {
  const home = which === "home";
  viewHome.classList.toggle("is-hidden", !home);
  viewCategory.classList.toggle("is-active", !home);
  viewHome.setAttribute("aria-hidden", home ? "false" : "true");
  viewCategory.setAttribute("aria-hidden", home ? "true" : "false");
}

function openSearch() {
  searchOverlay.classList.add("is-open");
  searchOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => searchInput.focus(), 50);
}

function closeSearchOverlay() {
  searchOverlay.classList.remove("is-open");
  searchOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function openSheet(plato) {
  const imgUrl = pick(plato, [
    "imagen_url",
    "image_url",
    "foto_url",
    "img_url",
  ]);
  if (imgUrl) {
    sheetImageWrap.style.display = "";
    sheetImage.src = imgUrl;
    sheetImage.alt = plato.plato ? `${plato.plato}` : "";
  } else {
    sheetImageWrap.style.display = "none";
    sheetImage.removeAttribute("src");
  }

  sheetTitle.textContent = safeText(plato.plato);
  sheetPrice.textContent =
    plato.precio != null ? formatPrice(plato.precio) : "";
  sheetDesc.textContent = safeText(plato.descripcion);

  // alergenos: usamos tus SVG de /alergenos (sin texto). Click => ampliar.
  const alergs = Array.isArray(plato.alergenos) ? plato.alergenos : [];
  sheetAllergens.innerHTML = "";
  if (alergs.length) {
    sheetAllergenSection.style.display = "";
    alergs.forEach((aRaw) => {
      const key = normalizeAllergenKey(aRaw);
      if (!key) return;
      const img = document.createElement("img");
      img.className = "sheetAllergenIcon";
      img.alt = key.replace(/_/g, " ");
      img.title = img.alt;
      img.src = allergenKeyToUrl(key);
      img.loading = "lazy";
      img.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openAllergenZoom(img.src, img.alt);
      });
      // si falla, simplemente lo ocultamos (no mostramos texto)
      img.onerror = () => img.remove();
      sheetAllergens.appendChild(img);
    });
  } else {
    sheetAllergenSection.style.display = "none";
  }

  dishSheet.classList.add("is-open");
  dishSheet.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

// =============================
// Allergen zoom (lightbox)
// =============================
const allergenZoom = document.getElementById("allergenZoom");
const allergenZoomImg = document.getElementById("allergenZoomImg");
const allergenZoomTitle = document.getElementById("allergenZoomTitle");
const allergenZoomClose = document.getElementById("allergenZoomClose");
const allergenZoomBackdrop = document.getElementById("allergenZoomBackdrop");

function openAllergenZoom(src, title) {
  if (!allergenZoom) return;
  allergenZoomImg.src = src;
  allergenZoomTitle.textContent = title || "Alérgeno";
  allergenZoom.classList.add("is-open");
  allergenZoom.setAttribute("aria-hidden", "false");
}

function closeAllergenZoom() {
  if (!allergenZoom) return;
  allergenZoom.classList.remove("is-open");
  allergenZoom.setAttribute("aria-hidden", "true");
  allergenZoomImg.removeAttribute("src");
}

allergenZoomClose?.addEventListener("click", closeAllergenZoom);
allergenZoomBackdrop?.addEventListener("click", closeAllergenZoom);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && allergenZoom?.classList.contains("is-open"))
    closeAllergenZoom();
});

function closeSheet() {
  dishSheet.classList.remove("is-open");
  dishSheet.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// =============================
// Render
// =============================
function renderHome() {
  homeCategories.innerHTML = "";

  const catsWithItems = CATEGORIAS.filter((c) =>
    PLATOS.some((p) => String(p.categoria_id) === String(c.id)),
  );
  if (!catsWithItems.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Esta carta aún no tiene categorías con platos.";
    homeCategories.appendChild(p);
    return;
  }

  catsWithItems.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "catBtn";
    btn.textContent = cat.nombre;
    btn.addEventListener("click", () => {
      goCategory(String(cat.id));
    });
    homeCategories.appendChild(btn);
  });
}

function buildChip(label, active) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `chip${active ? " chip--active" : ""}`;
  btn.textContent = label;
  return btn;
}

function renderSubcatChips(catId) {
  subcatChips.innerHTML = "";
  ACTIVE_SUBCAT = ACTIVE_SUBCAT || "all";

  const platosCat = PLATOS.filter(
    (p) => String(p.categoria_id) === String(catId),
  );
  const subcats = Array.from(
    new Set(
      platosCat
        .map((p) => pick(p, ["subcategoria", "sub_category", "subcat"]))
        .filter(Boolean)
        .map((s) => safeText(s).trim())
        .filter(Boolean),
    ),
  );

  // Siempre "Todo"
  const allChip = buildChip("Todo", ACTIVE_SUBCAT === "all");
  allChip.addEventListener("click", () => {
    ACTIVE_SUBCAT = "all";
    renderSubcatChips(catId);
    renderDishList(catId);
  });
  subcatChips.appendChild(allChip);

  subcats.forEach((sc) => {
    const chip = buildChip(sc, ACTIVE_SUBCAT === sc);
    chip.addEventListener("click", () => {
      ACTIVE_SUBCAT = sc;
      renderSubcatChips(catId);
      renderDishList(catId);
    });
    subcatChips.appendChild(chip);
  });
}

function passesSearch(plato) {
  const q = normalize(SEARCH_Q);
  if (!q) return true;
  const name = normalize(plato.plato);
  const desc = normalize(plato.descripcion);
  return name.includes(q) || desc.includes(q);
}

function renderDishList(catId) {
  const cat = CATEGORIAS.find((c) => String(c.id) === String(catId));
  categoryTitle.textContent = cat ? cat.nombre : "Categoría";

  dishList.innerHTML = "";

  const platosCat = PLATOS.filter(
    (p) => String(p.categoria_id) === String(catId),
  )
    .filter((p) => {
      if (ACTIVE_SUBCAT === "all") return true;
      const sc = pick(p, ["subcategoria", "sub_category", "subcat"]);
      return safeText(sc).trim() === ACTIVE_SUBCAT;
    })
    .filter(passesSearch);

  if (!platosCat.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = SEARCH_Q
      ? "No hay resultados."
      : "No hay platos en esta sección.";
    dishList.appendChild(empty);
    return;
  }

  // Si existen subcategorías, pintamos separadores por grupo (como NordQR)
  const hasSubcats = PLATOS.some(
    (p) =>
      String(p.categoria_id) === String(catId) &&
      pick(p, ["subcategoria", "sub_category", "subcat"]),
  );
  if (hasSubcats && ACTIVE_SUBCAT === "all") {
    const groups = new Map();
    platosCat.forEach((p) => {
      const sc =
        safeText(
          pick(p, ["subcategoria", "sub_category", "subcat"]) || "Otros",
        ).trim() || "Otros";
      if (!groups.has(sc)) groups.set(sc, []);
      groups.get(sc).push(p);
    });

    for (const [sc, items] of groups.entries()) {
      const h = document.createElement("h2");
      h.className = "groupTitle";
      h.textContent = sc;
      dishList.appendChild(h);
      items.forEach((p) => dishList.appendChild(buildDishRow(p)));
    }
  } else {
    platosCat.forEach((p) => dishList.appendChild(buildDishRow(p)));
  }
}

function buildDishRow(plato) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dishRow";
  btn.addEventListener("click", () => openSheet(plato));

  const left = document.createElement("div");
  left.className = "dishLeft";

  const name = document.createElement("div");
  name.className = "dishName";
  name.textContent = safeText(plato.plato);

  const desc = document.createElement("div");
  desc.className = "dishDesc";
  desc.textContent = safeText(plato.descripcion);

  const price = document.createElement("div");
  price.className = "dishPrice";
  price.textContent = plato.precio != null ? formatPrice(plato.precio) : "";

  // iconitos alérgenos (tipo NordQR: justo al lado del nombre)
  const alergs = Array.isArray(plato.alergenos) ? plato.alergenos : [];
  if (alergs.length) {
    const badgeWrap = document.createElement("span");
    badgeWrap.className = "miniBadges";
    alergs.slice(0, 3).forEach((a) => {
      const s = document.createElement("span");
      s.className = "miniBadge";
      const img = document.createElement("img");
      img.className = "allergenIcon miniBadgeImg";
      const key = normalizeAllergenKey(a);
      if (!key) return;
      img.alt = key.replace(/_/g, " ");
      img.title = img.alt;
      const url = allergenKeyToUrl(key);
      if (url) img.src = url;
      img.onerror = () => {
        s.textContent = "•";
      };
      s.appendChild(img);
      badgeWrap.appendChild(s);
    });
    const titleLine = document.createElement("div");
    titleLine.className = "dishTitleLine";
    titleLine.appendChild(name);
    titleLine.appendChild(badgeWrap);
    left.appendChild(titleLine);
  } else {
    left.appendChild(name);
  }

  if (plato.descripcion) left.appendChild(desc);
  if (plato.precio != null) left.appendChild(price);

  const right = document.createElement("div");
  right.className = "dishRight";

  const imgUrl = pick(plato, [
    "imagen_url",
    "image_url",
    "foto_url",
    "img_url",
  ]);
  if (imgUrl) {
    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = safeText(plato.plato);
    img.loading = "lazy";
    right.appendChild(img);
  } else {
    // si no hay imagen, oculta el hueco
    right.style.display = "none";
  }

  btn.appendChild(left);
  btn.appendChild(right);
  return btn;
}

// =============================
// Navigation
// =============================
function goCategory(catId) {
  ACTIVE_CAT_ID = catId;
  ACTIVE_SUBCAT = "all";
  SEARCH_Q = "";
  searchInput.value = "";
  clearSearch.style.visibility = "hidden";

  setView("category");
  renderSubcatChips(catId);
  renderDishList(catId);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHome() {
  ACTIVE_CAT_ID = null;
  ACTIVE_SUBCAT = "all";
  SEARCH_Q = "";
  searchInput.value = "";
  clearSearch.style.visibility = "hidden";
  setView("home");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// =============================
// Load
// =============================
async function loadProfileIfExists() {
  // Intentamos dos nombres para no romperte si ya has creado uno.
  const candidates = ["Perfil_publico"]; // 👈 fuente pública (sin wifi_pass)
  for (const table of candidates) {
    try {
      const { data, error } = await db
        .from(table)
        .select("*")
        .eq("user_id", clienteId)
        .limit(1)
        .maybeSingle();
      if (error) continue;
      if (data) {
        PROFILE = { table, ...data };
        return;
      }
    } catch {
      // ignore
    }
  }
}

function applyProfileToHome() {
  if (!PROFILE) {
    // Fallback: si no hay portada, ponemos un degradado para no quedar feo
    coverImg.style.display = "none";
    cover.style.background = "linear-gradient(135deg, #d7d7dd, #f5f5f7)";
    placeTitle.textContent = "Carta";
    return;
  }

  const name = pick(PROFILE, [
    "nombre",
    "name",
    "restaurant_name",
    "local_name",
    "titulo",
  ]);
  if (name) placeTitle.textContent = name;

  const portada = pick(PROFILE, [
    "portada_url",
    "cover_url",
    "imagen_portada",
    "hero_url",
    "banner_url",
  ]);
  if (portada) {
    coverImg.src = portada;
    coverImg.style.display = "";
  } else {
    coverImg.style.display = "none";
    cover.style.background = "linear-gradient(135deg, #d7d7dd, #f5f5f7)";
  }

  // Reseñas / Rating (opcional)
  // Mostramos el "botón de reseñas" si hay rating o si existe google_place_id (para abrir Google Maps).
  const rating = pick(PROFILE, ["rating", "valoracion", "stars"]);
  const ratingCount = pick(PROFILE, [
    "rating_count",
    "valoraciones",
    "reviews",
  ]);
  const googleReviewsUrl = getGoogleReviewsSearchUrl(PROFILE);

  if (rating != null || googleReviewsUrl) {
    ratingBtn.style.display = "";

    // Texto del botón (home): el usuario quiere que ponga "Reseñas"
    ratingPrimary.textContent = "Reseñas";
    if (ratingCount) {
      ratingSecondary.textContent = `${ratingCount} reseñas`;
    } else if (rating != null) {
      ratingSecondary.textContent = `${Number(rating).toFixed(1)} ★`;
    } else {
      ratingSecondary.textContent = "Ver en Google";
    }
  }

  // Info (opcional)
  const info = [];
  if (pick(PROFILE, ["wifi", "wifi_name"])) info.push("Wi‑Fi");
  if (pick(PROFILE, ["telefono", "phone"])) info.push("Teléfono");
  if (pick(PROFILE, ["direccion", "address"])) info.push("Dirección");
  if (info.length) {
    infoBtn.style.display = "";
    infoSecondary.textContent = info.join(", ");
  }

  // CTA valoraciones (opcional)
  const reviewsUrl = pick(PROFILE, [
    "reviews_url",
    "google_reviews_url",
    "valoraciones_url",
  ]);
  if (reviewsUrl) {
    ctaBtn.style.display = "";
    ctaBtn.addEventListener("click", () =>
      window.open(reviewsUrl, "_blank", "noopener"),
    );
  }
}

async function loadMenu() {
  dishList.innerHTML = '<div class="loading">Cargando…</div>';

  if (!clienteParam) {
    placeTitle.textContent = "URL inválida";
    homeCategories.innerHTML =
      '<p class="muted">Falta el parámetro <b>?cliente=</b> (UUID o slug) o <b>?bar=</b>.</p>';
    return;
  }

  // Resolver UUID final
  if (isUuid(clienteParam)) {
    clienteId = clienteParam;
  } else {
    // Nuevo modo: slug en Perfil.slug
    const slug = String(clienteParam).trim();
    const { data: perfilBySlug, error: slugErr } = await db
      .from("Perfil_publico")
      .select("user_id")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (slugErr || !perfilBySlug?.user_id) {
      placeTitle.textContent = "No encontrado";
      homeCategories.innerHTML =
        '<p class="muted">No existe ninguna carta con ese identificador.</p>';
      return;
    }
    clienteId = perfilBySlug.user_id;
    // (WiFi PIN) guardamos también en el contexto si ya existe
    if (_wifiCtx) _wifiCtx.clienteId = clienteId;
  }

  // Perfil opcional
  await loadProfileIfExists();
  applyProfileToHome();

  try {
    const { data: categorias, error: catError } = await db
      .from("Categorias")
      .select("*")
      .eq("user_id", clienteId)
      .eq("activa", true)
      .order("orden", { ascending: true });

    if (catError) throw catError;

    const { data: platos, error: platosError } = await db
      .from("Menu")
      .select("*")
      .eq("user_id", clienteId)
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (platosError) throw platosError;

    CATEGORIAS = Array.isArray(categorias) ? categorias : [];
    PLATOS = Array.isArray(platos) ? platos : [];

    renderHome();
    setView("home");
  } catch (e) {
    console.error(e);
    placeTitle.textContent = "Error";
    homeCategories.innerHTML = `<p class="muted">No se pudo cargar la carta: ${safeText(e.message)}</p>`;
  }
}

function openRatingsSheet() {
  if (!PROFILE) return;
  const rating = pick(PROFILE, ["rating", "valoracion", "stars"]);
  const count = pick(PROFILE, ["rating_count", "valoraciones", "reviews"]);
  ratingsValue.textContent = rating != null ? Number(rating).toFixed(1) : "-";
  renderStars(ratingsStars, rating || 0);
  ratingsCount.textContent = count ? `(${count})` : "";

  // Barras (UI): si no hay desglose real, aproximamos con el rating
  const aspects = ["Comida", "Ambiente", "Servicio", "Limpieza", "Precio"];
  ratingsBars.innerHTML = "";
  const base = Number(rating) || 4.5;
  aspects.forEach((label, i) => {
    const row = document.createElement("div");
    row.className = "barRow";
    const left = document.createElement("div");
    left.className = "barLabel";
    left.textContent = label;

    const track = document.createElement("div");
    track.className = "barTrack";
    const fill = document.createElement("div");
    fill.className = "barFill";
    const v = Math.max(0, Math.min(5, base + (i % 2 === 0 ? 0.1 : 0)));
    fill.style.width = `${(v / 5) * 100}%`;
    track.appendChild(fill);

    const val = document.createElement("div");
    val.className = "barValue";
    val.textContent = v.toFixed(1);

    row.appendChild(left);
    row.appendChild(track);
    row.appendChild(val);
    ratingsBars.appendChild(row);
  });

  const writeReviewUrl = getWriteReviewUrl(PROFILE);
  const fallbackReviewsUrl = pick(PROFILE, ["reviews_url", "valoraciones_url"]);
  const finalReviewsUrl = writeReviewUrl || fallbackReviewsUrl;
  if (finalReviewsUrl) {
    openReviewsBtn.style.display = "";
    openReviewsBtn.textContent = writeReviewUrl
      ? "Escribir reseña en Google"
      : "Ver en Google";
    openReviewsBtn.onclick = () =>
      window.open(finalReviewsUrl, "_blank", "noopener");
  } else {
    openReviewsBtn.style.display = "none";
  }

  openGenericSheet(ratingsSheet);
}

function openInfoSheet() {
  if (!PROFILE) return;
  const name = pick(PROFILE, [
    "nombre",
    "name",
    "restaurant_name",
    "local_name",
    "titulo",
  ]);
  infoTitle.textContent = name ? name : "Info";

  const direccion = pick(PROFILE, ["direccion", "address"]);
  if (direccion) {
    mapWrap.style.display = "";
    mapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed`;
  } else {
    mapWrap.style.display = "none";
    mapFrame.removeAttribute("src");
  }

  const wifiName = pick(PROFILE, ["wifi_name", "wifi", "wifi_ssid"]);
  const wifiPass = pick(PROFILE, ["wifi_pass", "wifi_password", "wifiPass"]);
  const telefono = pick(PROFILE, ["telefono", "phone"]);

  infoRows.innerHTML = "";

  function row(icon, title, sub, actionLabel, onAction) {
    const wrap = document.createElement("div");
    wrap.className = "infoRow";
    const ic = document.createElement("div");
    ic.className = "infoRowIcon";
    ic.textContent = icon;
    const main = document.createElement("div");
    main.className = "infoRowMain";
    const t = document.createElement("div");
    t.className = "infoRowTitle";
    t.textContent = title;
    const s = document.createElement("div");
    s.className = "infoRowSub";
    s.textContent = sub;
    main.appendChild(t);
    main.appendChild(s);

    wrap.appendChild(ic);
    wrap.appendChild(main);

    if (actionLabel && onAction) {
      const btn = document.createElement("button");
      btn.className = "infoRowBtn";
      btn.type = "button";
      btn.textContent = actionLabel;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        onAction();
      });
      wrap.appendChild(btn);
    }

    return wrap;
  }

  if (wifiName) {
    const sub = wifiPass ? `${wifiName}` : `${wifiName}`;
    infoRows.appendChild(
      row("📶", "Wi‑Fi", sub, "Ver clave", () => {
        openWifiPinModal({ wifiName, clienteId });
      }),
    );
  }

  if (telefono) {
    infoRows.appendChild(
      row("📞", "Teléfono", telefono, "Llamar", () => {
        window.location.href = `tel:${String(telefono).replace(/\s+/g, "")}`;
      }),
    );
  }

  if (direccion) {
    infoRows.appendChild(
      row("📍", "Dirección", direccion, "Abrir", () => {
        window.open(
          `https://www.google.com/maps?q=${encodeURIComponent(direccion)}`,
          "_blank",
          "noopener",
        );
      }),
    );
  }

  openGenericSheet(infoSheet);
}

// =============================
// Events
// =============================
backBtn.addEventListener("click", goHome);

ratingBtn.addEventListener("click", () => {
  const url = PROFILE ? getGoogleReviewsSearchUrl(PROFILE) : null;
  if (url) return window.open(url, "_blank", "noopener");
  // Fallback: si no hay Place ID, abrimos la hoja de rating local
  openRatingsSheet();
});
infoBtn.addEventListener("click", openInfoSheet);

homeSearchBtn.addEventListener("click", () => {
  // Si estás en home, buscamos en TODA la carta y llevamos al primer match.
  // Para simplificar: abrimos overlay y filtramos dentro de la última categoría visitada o la primera.
  if (!ACTIVE_CAT_ID) {
    const firstCat = CATEGORIAS.find((c) =>
      PLATOS.some((p) => String(p.categoria_id) === String(c.id)),
    );
    if (firstCat) ACTIVE_CAT_ID = String(firstCat.id);
  }
  if (ACTIVE_CAT_ID) {
    setView("category");
    renderSubcatChips(ACTIVE_CAT_ID);
    renderDishList(ACTIVE_CAT_ID);
  }
  openSearch();
});

catSearchBtn.addEventListener("click", openSearch);

clearSearch.addEventListener("click", () => {
  SEARCH_Q = "";
  searchInput.value = "";
  clearSearch.style.visibility = "hidden";
  if (ACTIVE_CAT_ID) renderDishList(ACTIVE_CAT_ID);
});

searchInput.addEventListener("input", () => {
  SEARCH_Q = searchInput.value;
  clearSearch.style.visibility = SEARCH_Q ? "visible" : "hidden";
  if (ACTIVE_CAT_ID) renderDishList(ACTIVE_CAT_ID);
});

closeSearch.addEventListener("click", closeSearchOverlay);
searchBackdrop.addEventListener("click", closeSearchOverlay);

dishSheet.addEventListener("click", (e) => {
  const t = e.target;
  if (t?.dataset?.close === "true") closeSheet();
});

ratingsSheet.addEventListener("click", (e) => {
  const t = e.target;
  if (t?.dataset?.close === "true") closeGenericSheet(ratingsSheet);
});

infoSheet.addEventListener("click", (e) => {
  const t = e.target;
  if (t?.dataset?.close === "true") closeGenericSheet(infoSheet);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (dishSheet.classList.contains("is-open")) closeSheet();
    if (ratingsSheet.classList.contains("is-open"))
      closeGenericSheet(ratingsSheet);
    if (infoSheet.classList.contains("is-open")) closeGenericSheet(infoSheet);
    if (searchOverlay.classList.contains("is-open")) closeSearchOverlay();
  }
});

// =============================
// Init
// =============================
loadMenu();

// =============================
// Wi‑Fi PIN modal (revelar clave)
// =============================
const wifiPinModal = document.getElementById("wifiPinModal");
const wifiPinBackdrop = document.getElementById("wifiPinBackdrop");
const wifiPinClose = document.getElementById("wifiPinClose");
const wifiPinInput = document.getElementById("wifiPinInput");
const wifiPinSubmit = document.getElementById("wifiPinSubmit");
const wifiPinCopy = document.getElementById("wifiPinCopy");
const wifiPinError = document.getElementById("wifiPinError");
const wifiPinResult = document.getElementById("wifiPinResult");
const wifiPinSsid = document.getElementById("wifiPinSsid");

let _wifiCtx = null; // {wifiName, clienteId, slug, wifiPass}

function showWifiError(msg) {
  if (!wifiPinError) return;
  wifiPinError.textContent = msg;
  wifiPinError.style.display = msg ? "block" : "none";
}

function showWifiResult(msg) {
  if (!wifiPinResult) return;
  wifiPinResult.textContent = msg;
  wifiPinResult.style.display = msg ? "block" : "none";
}

function openWifiPinModal(ctx) {
  _wifiCtx = { ...ctx, wifiPass: null };
  if (wifiPinSsid)
    wifiPinSsid.textContent = ctx.wifiName ? `Red: ${ctx.wifiName}` : "";
  showWifiError("");
  showWifiResult("");
  if (wifiPinInput) wifiPinInput.value = "";
  if (wifiPinModal) {
    wifiPinModal.setAttribute("aria-hidden", "false");
    wifiPinModal.classList.add("open");
  }
  setTimeout(() => wifiPinInput?.focus?.(), 50);
}

function closeWifiPinModal() {
  if (wifiPinModal) {
    wifiPinModal.setAttribute("aria-hidden", "true");
    wifiPinModal.classList.remove("open");
  }
  _wifiCtx = null;
}

async function fetchWifiPass() {
  if (!_wifiCtx) return null;

  const pin = wifiPinInput?.value?.trim();
  if (!pin) {
    showWifiError("Introduce el PIN.");
    return null;
  }

  showWifiError("");

  if (error) {
    showPinError("Error al validar el PIN");
    return;
  }

  if (!data || data.length === 0) {
    showPinError("PIN incorrecto");
    return;
  }

  // ✅ AQUÍ ESTABA EL PROBLEMA
  const wifi = data[0];

  // Mostrar contraseña
  wifiPasswordEl.textContent = wifi.wifi_pass;

  // Activar botón copiar
  copyWifiBtn.disabled = false;

  // Copiar al portapapeles
  copyWifiBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(wifi.wifi_pass);
      copyWifiBtn.textContent = "Copiado ✓";
      setTimeout(() => (copyWifiBtn.textContent = "Copiar"), 1500);
    } catch (e) {
      alert("No se pudo copiar la contraseña");
    }
  };

  if (error) {
    showWifiError("No se pudo verificar el PIN. Inténtalo de nuevo.");
    return null;
  }

  // data puede ser array (table function)
  const row = Array.isArray(data) ? data[0] : data;
  const pass = row?.wifi_pass;

  if (!pass) {
    showWifiError("PIN incorrecto.");
    return null;
  }

  _wifiCtx.wifiPass = String(pass);
  showWifiResult(`Clave: ${_wifiCtx.wifiPass}`);
  return _wifiCtx.wifiPass;
}

wifiPinBackdrop?.addEventListener("click", closeWifiPinModal);
wifiPinClose?.addEventListener("click", closeWifiPinModal);

wifiPinSubmit?.addEventListener("click", async () => {
  await fetchWifiPass();
});

wifiPinCopy?.addEventListener("click", async () => {
  const pass = _wifiCtx?.wifiPass || (await fetchWifiPass());
  if (!pass) return;
  try {
    await navigator.clipboard.writeText(String(pass));
  } catch {}
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeWifiPinModal();
});
