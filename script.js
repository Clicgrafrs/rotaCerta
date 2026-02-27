console.log("Rota Fácil PRO carregado");

let origemAtual = null;
let destinosGlobais = [];
let rotaOrdenada = [];
let linkAtual = null;

/* =========================
   iOS
========================= */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/* =========================
   LOCALIZAÇÃO PRECISA
========================= */
function usarLocalizacao() {
  if (!navigator.geolocation) {
    alert("Geolocalização não suportada");
    return;
  }

  let melhor = null;
  let finalizado = false;

  function finalizar(c) {
    if (finalizado) return;
    finalizado = true;

    origemAtual = {
      lat: c.latitude,
      lon: c.longitude,
      texto: `${c.latitude},${c.longitude}`
    };

    document.getElementById("infoLocalizacao").innerText =
      `📍 Localização ativa (${Math.round(c.accuracy)}m)`;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      melhor = pos.coords;
      finalizar(pos.coords);
    },
    () => {},
    { enableHighAccuracy: false, timeout: 5000 }
  );

  const watch = navigator.geolocation.watchPosition(
    pos => {
      if (!melhor || pos.coords.accuracy < melhor.accuracy) {
        melhor = pos.coords;
      }
      if (pos.coords.accuracy <= 40) {
        finalizar(pos.coords);
        navigator.geolocation.clearWatch(watch);
      }
    },
    () => {
      if (melhor) finalizar(melhor);
      navigator.geolocation.clearWatch(watch);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* =========================
   NORMALIZAÇÃO
========================= */
function normalizar(v) {
  return Number(v).toFixed(5);
}
function mesmoLocal(a, b) {
  return normalizar(a.lat) === normalizar(b.lat) &&
         normalizar(a.lon) === normalizar(b.lon);
}

/* =========================
   AUTOCOMPLETE
========================= */
async function sugerirEndereco(input, datalistId) {
  const q = input.value.trim();
  if (q.length < 3) return;

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=br&q=${encodeURIComponent(q)}`
  );
  const d = await r.json();

  const dl = document.getElementById(datalistId);
  dl.innerHTML = "";

  d.forEach(i => {
    const opt = document.createElement("option");
    opt.value = i.display_name;
    dl.appendChild(opt);
  });
}

/* =========================
   GEOCODIFICAR INTELIGENTE
========================= */
async function geocodificar(txt) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=br&q=${encodeURIComponent(txt)}`
  );
  const d = await r.json();
  if (!d.length) throw new Error("Endereço não encontrado");

  const res =
    d.find(i => i.type === "amenity" || i.class === "amenity") ||
    d.find(i => i.address?.city || i.address?.town || i.address?.village) ||
    d[0];

  return {
    texto: res.display_name,
    lat: +res.lat,
    lon: +res.lon
  };
}

/* =========================
   DISTÂNCIA
========================= */
function dist(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x =
    Math.sin(dLat/2)**2 +
    Math.cos(a.lat*Math.PI/180) *
    Math.cos(b.lat*Math.PI/180) *
    Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

/* =========================
   CALCULAR ROTA (NÃO PULA)
========================= */
async function calcularRota() {
  if (!origemAtual) {
    origemAtual = await geocodificar(
      document.getElementById("origem").value.trim()
    );
  }

  const novos = [];

  for (let i of document.querySelectorAll(".endereco")) {
    if (!i.value.trim()) continue;

    try {
      const g = await geocodificar(i.value);
      if (!novos.some(d => mesmoLocal(d, g))) {
        novos.push(g);
      }
    } catch (e) {
      alert(`Endereço ignorado:\n${i.value}`);
    }
  }

  if (!novos.length) {
    alert("Nenhum destino válido");
    return;
  }

  destinosGlobais = novos;
  otimizarEGerar();
}

/* =========================
   ADD PARADA (CORRIGIDO)
========================= */
async function adicionarDestino() {
  if (!origemAtual || !destinosGlobais.length) {
    alert("Calcule uma rota antes");
    return;
  }

  const input = document.getElementById("novaParada");
  if (!input.value.trim()) return;

  const novo = await geocodificar(input.value);

  if (destinosGlobais.some(d => mesmoLocal(d, novo))) {
    alert("Destino já existe");
    return;
  }

  destinosGlobais = [...destinosGlobais, novo];
  otimizarEGerar();
  input.value = "";
}

/* =========================
   OTIMIZAR
========================= */
function otimizarEGerar() {
  const rota = [];
  let atual = origemAtual;
  let rest = [...destinosGlobais];

  while (rest.length) {
    rest.sort((a, b) => dist(atual, a) - dist(atual, b));
    atual = rest.shift();
    rota.push(atual);
  }

  rotaOrdenada = rota;
  gerarLink();
}

/* =========================
   GERAR LINK
========================= */
function gerarLink() {
  if (isIOS()) {
    const p = [origemAtual.texto, ...rotaOrdenada.map(r => r.texto)].join("+to:");
    linkAtual = `https://maps.apple.com/?daddr=${encodeURIComponent(p)}`;
  } else {
    const o = encodeURIComponent(origemAtual.texto);
    const d = encodeURIComponent(rotaOrdenada.at(-1).texto);
    const w = rotaOrdenada.slice(0,-1).map(r => encodeURIComponent(r.texto)).join("|");
    linkAtual =
      `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}` +
      (w ? `&waypoints=${w}` : "");
  }

  document.getElementById("resultado").innerHTML =
    `<a href="${linkAtual}" target="_blank">🚗 Abrir rota</a>`;
}
