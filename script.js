console.log("Rota Fácil PRO carregado");

/* =========================
   ESTADO GLOBAL
========================= */
let origemAtual = null;
let destinosGlobais = [];
let rotaOrdenada = [];
let linkAtual = null;
const cacheGeo = {};

/* =========================
   UTILIDADES
========================= */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function normalizar(v) {
  return Number(v).toFixed(5);
}

function mesmoLocal(a, b) {
  return normalizar(a.lat) === normalizar(b.lat) &&
         normalizar(a.lon) === normalizar(b.lon);
}

/* =========================
   GERAR CAMPOS DE DESTINO
========================= */
function gerarCampos() {
  const qtd = +document.getElementById("qtd").value;
  const container = document.getElementById("enderecos");
  container.innerHTML = "";

  if (!qtd || qtd < 1) return;

  for (let i = 0; i < qtd; i++) {
    const div = document.createElement("div");
    div.className = "destino";
    div.innerHTML = `
      <input type="text" class="endereco" placeholder="Endereço da parada ${i + 1}">
    `;
    container.appendChild(div);
  }
}

/* =========================
   GEOLOCALIZAÇÃO
========================= */
function usarLocalizacao() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      origemAtual = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        texto: `${pos.coords.latitude},${pos.coords.longitude}`
      };
      document.getElementById("infoLocalizacao").innerText =
        `📍 Localização ativa (${Math.round(pos.coords.accuracy)}m)`;
    },
    () => alert("Erro ao obter localização"),
    { enableHighAccuracy: true }
  );
}

/* =========================
   GEOCODIFICAÇÃO
========================= */
async function geocodificar(txt) {
  if (cacheGeo[txt]) return cacheGeo[txt];

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(txt)}`,
    { headers: { "User-Agent": "RotaFacilPRO/1.0" } }
  );

  const d = await r.json();
  if (!d.length) throw new Error("Endereço não encontrado");

  return cacheGeo[txt] = {
    texto: d[0].display_name,
    lat: +d[0].lat,
    lon: +d[0].lon
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
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/* =========================
   CALCULAR ROTA
========================= */
async function calcularRota() {
  if (!origemAtual) {
    const o = document.getElementById("origem").value.trim();
    if (!o) return alert("Informe a origem");
    origemAtual = await geocodificar(o);
  }

  for (let i of document.querySelectorAll(".endereco")) {
    if (!i.value.trim()) continue;
    try {
      const g = await geocodificar(i.value);
      if (!destinosGlobais.some(d => mesmoLocal(d, g)))
        destinosGlobais.push(g);
    } catch {}
  }

  if (!destinosGlobais.length)
    return alert("Nenhum destino válido");

  otimizarEGerar();
}

/* =========================
   ADICIONAR PARADA (HTML)
========================= */
async function adicionarParada() {
  const input = document.getElementById("novaParada");
  if (!input.value.trim()) return;

  const novo = await geocodificar(input.value);

  if (destinosGlobais.some(d => mesmoLocal(d, novo)))
    return alert("Destino já existe");

  destinosGlobais.push(novo);
  otimizarEGerar();
  input.value = "";
}

/* =========================
   OTIMIZAR
========================= */
function otimizarEGerar() {
  let atual = origemAtual;
  let rest = [...destinosGlobais];
  rotaOrdenada = [];

  while (rest.length) {
    rest.sort((a, b) => dist(atual, a) - dist(atual, b));
    atual = rest.shift();
    rotaOrdenada.push(atual);
  }

  gerarLink();
}

/* =========================
   GERAR LINK
========================= */
function gerarLink() {
  const o = encodeURIComponent(origemAtual.texto);
  const d = encodeURIComponent(rotaOrdenada.at(-1).texto);
  const w = rotaOrdenada.slice(0, -1).map(r => encodeURIComponent(r.texto)).join("|");

  linkAtual =
    `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}` +
    (w ? `&waypoints=${w}` : "");

  document.getElementById("resultado").innerHTML =
    `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota</a></li>`;
}

/* =========================
   ROTAS SALVAS
========================= */
function salvarRota() {
  if (!linkAtual) return alert("Nenhuma rota calculada");

  const nome = prompt("Nome da rota:");
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
  rotas.push({ nome, link: linkAtual });
  localStorage.setItem("rotas", JSON.stringify(rotas));
  listarRotas();
}

function listarRotas() {
  const sel = document.getElementById("rotasSelect");
  sel.innerHTML = `<option value="">Selecione uma rota</option>`;

  JSON.parse(localStorage.getItem("rotas") || []).forEach((r, i) => {
    sel.innerHTML += `<option value="${i}">${r.nome}</option>`;
  });
}

function abrirRotaSelecionada() {
  const sel = document.getElementById("rotasSelect");
  if (!sel.value) return;

  const r = JSON.parse(localStorage.getItem("rotas"))[sel.value];
  window.open(r.link, "_blank");
}

function excluirRotaSelecionada() {
  const sel = document.getElementById("rotasSelect");
  if (!sel.value) return;

  if (!confirm("Excluir rota?")) return;

  const rotas = JSON.parse(localStorage.getItem("rotas"));
  rotas.splice(sel.value, 1);
  localStorage.setItem("rotas", JSON.stringify(rotas));
  listarRotas();
}

/* =========================
   INIT
========================= */
listarRotas();
