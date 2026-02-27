console.log("Rota Fácil PRO carregado");

let origemAtual = null;
let destinosGlobais = [];
let rotaOrdenada = [];
let linkAtual = null;

/* =========================
   ERRO VISUAL
========================= */
function marcarErro(el) {
  el.classList.add("erro");
  el.focus();
}
function limparErro(el) {
  el.classList.remove("erro");
}

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
    err => {
      alert("Não foi possível obter a localização");
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
}

/* =========================
   STORAGE CLIENTES
========================= */
function getClientes() {
  return JSON.parse(localStorage.getItem("clientes") || "[]");
}
function salvarClientesStorage(clientes) {
  localStorage.setItem("clientes", JSON.stringify(clientes));
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
   AUTOCOMPLETE ENDEREÇOS
========================= */
async function sugerirEndereco(input, datalistId) {
  const q = input.value.trim();
  if (q.length < 3) return;

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br&q=${encodeURIComponent(q)}`
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
   GEOCODIFICAR
========================= */
async function geocodificar(txt) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(txt)}`
  );
  const d = await r.json();
  if (!d.length) throw new Error("Endereço não encontrado");

  return {
    texto: d[0].display_name,
    lat: +d[0].lat,
    lon: +d[0].lon
  };
}

/* =========================
   SALVAR CLIENTES
========================= */
async function salvarClientes() {
  const clientes = getClientes();
  let salvos = 0;

  for (let d of document.querySelectorAll(".destino")) {
    const nome = d.querySelector(".nome").value.trim();
    const endereco = d.querySelector(".endereco").value.trim();
    if (!endereco) continue;

    try {
      const geo = await geocodificar(endereco);
      if (clientes.some(c => mesmoLocal(c, geo))) continue;

      clientes.push({
        nome,
        endereco: geo.texto,
        lat: geo.lat,
        lon: geo.lon
      });
      salvos++;
    } catch {}
  }

  salvarClientesStorage(clientes);
  listarClientesSelect();
  alert(`✅ ${salvos} cliente(s) salvos`);
}

/* =========================
   LISTAR CLIENTES
========================= */
function listarClientesSelect() {
  const sel = document.getElementById("clientesSelect");
  if (!sel) return;

  sel.innerHTML = `<option value="">Selecione um cliente</option>`;
  getClientes().forEach((c, i) => {
    sel.innerHTML += `<option value="${i}">${c.nome || c.endereco}</option>`;
  });
}

/* =========================
   EXCLUIR CLIENTE
========================= */
function excluirClienteSelecionado() {
  const sel = document.getElementById("clientesSelect");
  if (sel.value === "") return;

  if (!confirm("Excluir cliente?")) return;

  const clientes = getClientes();
  clientes.splice(sel.value, 1);
  salvarClientesStorage(clientes);
  listarClientesSelect();
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
    Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*
    Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

/* =========================
   CALCULAR ROTA
========================= */
async function calcularRota() {
  if (!origemAtual) {
    const origemTxt = document.getElementById("origem").value.trim();
    if (!origemTxt) {
      alert("Informe a origem ou use localização");
      return;
    }
    origemAtual = await geocodificar(origemTxt);
  }

  destinosGlobais = [];

  for (let i of document.querySelectorAll(".endereco")) {
    if (!i.value.trim()) continue;
    try {
      const g = await geocodificar(i.value);
      if (!destinosGlobais.some(d => mesmoLocal(d, g)))
        destinosGlobais.push(g);
    } catch {}
  }

  if (!destinosGlobais.length) {
    alert("Nenhum destino válido");
    return;
  }

  otimizarEGerar();
}

/* =========================
   ADD PARADA
========================= */
async function adicionarDestino() {
  if (!origemAtual) {
    alert("Defina a origem primeiro");
    return;
  }

  const input = document.getElementById("novaParada");
  if (!input.value.trim()) return;

  const novo = await geocodificar(input.value);

  if (destinosGlobais.some(d => mesmoLocal(d, novo))) {
    alert("Destino já existe");
    return;
  }

  destinosGlobais.push(novo);
  otimizarEGerar();
  input.value = "";
}

/* =========================
   OTIMIZAR + LINK
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
    linkAtual = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}${w ? `&waypoints=${w}` : ""}`;
  }

  document.getElementById("resultado").innerHTML =
    `<a href="${linkAtual}" target="_blank">🚗 Abrir rota</a>`;
}

/* =========================
   ROTAS SALVAS
========================= */
function salvarRota() {
  if (!linkAtual) return;

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

  JSON.parse(localStorage.getItem("rotas") || []).forEach((r,i) => {
    sel.innerHTML += `<option value="${i}">${r.nome}</option>`;
