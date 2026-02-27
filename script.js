console.log("Rota Fácil PRO carregado");

let origemAtual = null;
let destinosGlobais = [];
let rotaOrdenada = [];
let linkAtual = null;

/* =========================
   DETECTAR iOS
========================= */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/* =========================
   CLIENTES (STORAGE)
========================= */
function getClientes() {
  return JSON.parse(localStorage.getItem("clientes") || "[]");
}

function salvarClientesStorage(clientes) {
  localStorage.setItem("clientes", JSON.stringify(clientes));
}

/* =========================
   ROTAS (STORAGE)
========================= */
function getRotas() {
  return JSON.parse(localStorage.getItem("rotas") || "[]");
}

function salvarRotasStorage(rotas) {
  localStorage.setItem("rotas", JSON.stringify(rotas));
}

/* =========================
   NORMALIZAÇÃO
========================= */
function normalizarCoordenada(v, casas = 5) {
  return Number(v).toFixed(casas);
}

function mesmoLocal(a, b) {
  return (
    normalizarCoordenada(a.lat) === normalizarCoordenada(b.lat) &&
    normalizarCoordenada(a.lon) === normalizarCoordenada(b.lon)
  );
}

/* =========================
   GEOCODIFICAÇÃO
========================= */
async function geocodificar(txt) {
  const texto = txt.trim();
  if (texto.length < 2) {
    throw new Error("Digite ao menos parte do endereço");
  }

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br&q=${encodeURIComponent(texto)}`
  );

  const d = await r.json();
  if (!d.length) {
    throw new Error("Endereço não encontrado");
  }

  return {
    texto: d[0].display_name,
    lat: +d[0].lat,
    lon: +d[0].lon
  };
}

/* =========================
   DISTÂNCIA
========================= */
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =========================
   OTIMIZAR ROTA
========================= */
function otimizarRota(origem, destinos) {
  const restantes = [...destinos];
  const rota = [];
  let atual = origem;

  while (restantes.length) {
    let menor = Infinity;
    let idx = 0;

    restantes.forEach((d, i) => {
      const dist = calcularDistancia(atual.lat, atual.lon, d.lat, d.lon);
      if (dist < menor) {
        menor = dist;
        idx = i;
      }
    });

    atual = restantes.splice(idx, 1)[0];
    rota.push(atual);
  }

  return rota;
}

/* =========================
   CALCULAR ROTA
========================= */
async function calcularRota() {
  try {
    origemAtual = await geocodificar(
      document.getElementById("origem").value
    );

    destinosGlobais = [];
    for (let i of document.querySelectorAll(".endereco")) {
      if (!i.value.trim()) throw new Error("Preencha todos os endereços");
      destinosGlobais.push(await geocodificar(i.value));
    }

    rotaOrdenada = otimizarRota(origemAtual, destinosGlobais);
    gerarLink();
    salvarRota();

  } catch (e) {
    alert(e.message);
  }
}

/* =========================
   ADICIONAR DESTINO (CORRIGIDO)
========================= */
async function adicionarDestino() {
  if (!rotaOrdenada.length) {
    alert("Calcule uma rota primeiro");
    return;
  }

  const input = document.getElementById("novaParada");
  if (!input.value.trim()) return;

  const novo = await geocodificar(input.value);

  if (destinosGlobais.some(d => mesmoLocal(d, novo))) {
    alert("Destino já existe na rota");
    return;
  }

  destinosGlobais.push(novo);
  rotaOrdenada = otimizarRota(origemAtual, destinosGlobais);
  gerarLink();
  salvarRota();

  input.value = "";
}

/* =========================
   GERAR LINK
========================= */
function gerarLink() {
  if (!rotaOrdenada.length) return;

  const o = encodeURIComponent(origemAtual.texto);
  const d = encodeURIComponent(rotaOrdenada.at(-1).texto);
  const w = rotaOrdenada.slice(0, -1)
    .map(r => encodeURIComponent(r.texto))
    .join("|");

  linkAtual =
    `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}` +
    (w ? `&waypoints=${w}` : "");

  document.getElementById("resultado").innerHTML =
    `<a href="${linkAtual}" target="_blank">🚗 Abrir rota otimizada</a>`;
}

/* =========================
   SALVAR ROTA
========================= */
function salvarRota() {
  const rotas = getRotas();
  rotas.push({
    nome: `Rota ${rotas.length + 1}`,
    link: linkAtual
  });
  salvarRotasStorage(rotas);
  listarRotas();
}

/* =========================
   LISTAR / ABRIR / EXCLUIR ROTAS
========================= */
function listarRotas() {
  const sel = document.getElementById("rotasSelect");
  if (!sel) return;

  sel.innerHTML = `<option value="">Rotas salvas</option>`;
  getRotas().forEach((r, i) => {
    sel.innerHTML += `<option value="${i}">${r.nome}</option>`;
  });
}

function abrirRotaSalva() {
  const sel = document.getElementById("rotasSelect");
  if (!sel.value) return;
  window.open(getRotas()[sel.value].link, "_blank");
}

function excluirRota(index) {
  const rotas = getRotas();
  rotas.splice(index, 1);
  salvarRotasStorage(rotas);
  listarRotas();
}

/* =========================
   EXCLUIR CLIENTE
========================= */
function excluirCliente(index) {
  const clientes = getClientes();
  clientes.splice(index, 1);
  salvarClientesStorage(clientes);
}

/* =========================
   INIT
========================= */
listarRotas();
