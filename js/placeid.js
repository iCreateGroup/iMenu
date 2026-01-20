// placeid.js
async function init() {
  // Asegúrate de que google.maps existe (carga el script de Maps)
  if (!window.google?.maps) {
    console.error("Google Maps JS no cargó (API key?)");
    return;
  }

  const mapEl = document.querySelector("gmp-map");
  const map = mapEl.innerMap;

  const pac = document.querySelector("gmp-place-autocomplete");

  const placeName = document.getElementById("placeName");
  const placeAddr = document.getElementById("placeAddr");
  const placeIdEl = document.getElementById("placeId");
  const copyBtn = document.getElementById("copyBtn");

  copyBtn.addEventListener("click", async () => {
    const id = placeIdEl.textContent?.trim();
    if (!id || id === "-") return;
    try {
      await navigator.clipboard.writeText(id);
      copyBtn.textContent = "Copiado ✅";
      setTimeout(() => (copyBtn.textContent = "Copiar"), 1200);
    } catch {
      // si falla clipboard, no pasa nada
    }
  });

  // Cuando el usuario elige un sitio del autocomplete:
  pac.addEventListener("gmp-select", async (ev) => {
    const prediction = ev.placePrediction;
    const place = prediction.toPlace();

    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location", "id"],
    });

    if (place.location) {
      map.setCenter(place.location);
      map.setZoom(17);
    }

    placeName.textContent = place.displayName || "-";
    placeAddr.textContent = place.formattedAddress || "-";
    placeIdEl.textContent = place.id || "-";
  });
}

init();
