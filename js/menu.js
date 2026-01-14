import { supabase } from "./supabase.js";

// leer bar desde la URL
const params = new URLSearchParams(window.location.search);
const barSlug = params.get("bar");

if (!barSlug) {
  document.body.innerHTML = "Carta no válida";
  throw new Error("No bar slug");
}

// obtener datos del bar
const { data: bar, error: barError } = await supabase
  .from("bars")
  .select("id, name")
  .eq("slug", barSlug)
  .single();

if (barError) {
  document.body.innerHTML = "Bar no encontrado";
  throw barError;
}

document.getElementById("bar-name").textContent = bar.name;

// obtener productos
const { data: products } = await supabase
  .from("products")
  .select("name, price, description")
  .eq("bar_id", bar.id)
  .eq("available", true)
  .order("name");

// pintar carta
const menu = document.getElementById("menu");

products.forEach(p => {
  menu.innerHTML += `
    <div class="product">
      <strong>${p.name}</strong>
      <span>${p.price.toFixed(2)} €</span>
      <p>${p.description || ""}</p>
    </div>
  `;
});
