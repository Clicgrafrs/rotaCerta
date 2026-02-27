console.log("Rota Fácil PRO v1.6 carregado");

/* ======================================================
   ESTADO CENTRAL DO APP
====================================================== */
const state = {
  origem: null,
  destinos: [],
  rotaOrdenada: [],
  linkAtual: null,
  cacheGeo: {}
};

/* ======================================================
   UTILIDADES
====================================================== */
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

/* ======================================================
   GEOLOCALIZAÇÃO
====================================================== */
function usarLocalizacao() {
  if (!navigator.geolocation) {
    alert("Geolocalização não suportada");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      state.origem = {
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

/* ======================================================
   AUTOCOMPLETE (NOMINATIM)
====================================================== */
async function sugerirEndereco(input, datalistId) {
  const q = input.value.trim();
  if (q.length < 3) return;

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br&q=${encodeURIComponent(q)}`,
    { headers: { "User-Agent": "RotaFacilPRO/1.6" } }
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

/* ======================================================
   GEOCODIFICAÇÃO (ROBUSTA + CACHE)
====================================================== */
async function geocodificar(txt) {
  if (state.cacheGeo[txt]) return state.cacheGeo[txt];

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(txt)}`,
    { headers: { "User-Agent": "RotaFacilPRO/1.6" } }
  );

  const d = await r.json();
  if (!d.length) throw new Error(`Endereço não encontrado: ${txt}`);

  const geo = {
    texto: d[0].display_name,
    lat: +d[0].lat,
    lon: +d[0].lon
  };

  state.cacheGeo[txt] = geo;
  return geo;
}

/* ======================================================
   CLIENTES (STORAGE)
====================================================== */
function getClientes() {
  return JSON.parse(localStorage.getItem("clientes") || "[]");
}

function salvarClientesStorage(c) {
  localStorage.setItem("clientes", JSON.stringify(c));
}

async function salvarClientes() {
  const clientes = getClientes();
  let salvos = 0;

  for (let d of document.querySelectorAll(".destino")) {
    const nome = d.querySelector(".nome").value.trim();
    const end = d.querySelector(".endereco").value.trim();
    if (!end) continue;

    try {
      const geo = await geocodificar(end);
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
  alert(`✅ ${salvos} endereço(s) salvo(s)`);
}

function listarClientesSelect() {
  const sel = document.getElementById("clientesSelect");
  if (!sel) return;

  sel.innerHTML = `<option value="">Selecione um Endereço/Local para excluir</option>`;
  getClientes().forEach((c, i) => {
    sel.innerHTML += `<option value="${i}">${c.nome || c.endereco}</option>`;
  });
}

function excluirClienteSelecionado() {
  const sel = document.getElementById("clientesSelect");
  if (sel.value === "") return;

  if (!confirm("Deseja excluir este endereço?")) return;

  const clientes = getClientes();
  clientes.splice(sel.value, 1);
  salvarClientesStorage(clientes);
  listarClientesSelect();
}


/* ======================================================
   GERAR CAMPOS DE DESTINO
====================================================== */
 gerarCampos() {
 function gerarCampos() {
  const qtd = +document.getElementById("qtd").value;
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  const clientes = getClientes();

  for (let i = 0; i < qtd; i++) {
    const d = document.createElement("div");
    d.className = "destino";

    /* SELECT CLIENTES SALVOS */
    const sel = document.createElement("select");
    sel.innerHTML = `<option value="">Selecionar endereço salvo</option>`;

    clientes.forEach((c, idx) => {
      sel.innerHTML += `
        <option value="${idx}">
          ${c.nome || c.endereco}
        </option>
      `;
    });

    /* INPUT ENDEREÇO */
    const end = document.createElement("input");
    end.className = "endereco";
    end.placeholder = "Endereço *";

    /* INPUT NOME */
    const nome = document.createElement("input");
    nome.className = "nome";
    nome.placeholder = "Nome do cliente (opcional)";

    /* AO SELECIONAR CLIENTE */
    sel.onchange = () => {
      if (sel.value === "") return;
      const c = clientes[sel.value];
      end.value = c.endereco;
      nome.value = c.nome || "";
    };

    d.append(sel, end, nome);
    div.appendChild(d);
  }
}


    

/* ======================================================
   DISTÂNCIA
====================================================== */
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

/* ======================================================
   CALCULAR ROTA
====================================================== */
async function calcularRota() {
  if (!state.origem) {
    const o = document.getElementById("origem").value.trim();
    if (!o) {
      alert("Informe a origem");
      return;
    }
    state.origem = await geocodificar(o);
  }

  for (let i of document.querySelectorAll(".endereco")) {
    if (!i.value.trim()) continue;

    try {
      const g = await geocodificar(i.value);
      if (!state.destinos.some(d => mesmoLocal(d, g))) {
        state.destinos.push(g);
      }
    } catch {}
  }

  if (!state.destinos.length) {
    alert("Nenhum destino válido");
    return;
  }

  otimizarEGerar();
}

/* ======================================================
   ADICIONAR PARADA
====================================================== */
async function adicionarParada() {
  const input = document.getElementById("novaParada");
  if (!input.value.trim()) return;

  try {
    const novo = await geocodificar(input.value);
    if (state.destinos.some(d => mesmoLocal(d, novo))) {
      alert("Destino já existe na rota");
      return;
    }

    state.destinos.push(novo);
    otimizarEGerar();
    input.value = "";
  } catch (e) {
    alert(e.message);
  }
}

/* ======================================================
   OTIMIZAÇÃO
====================================================== */
function otimizarEGerar() {
  let atual = state.origem;
  let rest = [...state.destinos];
  state.rotaOrdenada = [];

  while (rest.length) {
    rest.sort((a, b) => dist(atual, a) - dist(atual, b));
    atual = rest.shift();
    state.rotaOrdenada.push(atual);
  }

  gerarLink();
  renderRoteiro();
}

/* ======================================================
   RENDER ROTEIRO
====================================================== */
function renderRoteiro() {
  const ol = document.getElementById("resultado");
  ol.innerHTML = "";

  state.rotaOrdenada.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r.texto;
    ol.appendChild(li);
  });
}

/* ======================================================
   GERAR LINK
====================================================== */
function gerarLink() {
  if (isIOS()) {
    const p = [state.origem.texto, ...state.rotaOrdenada.map(r => r.texto)].join("+to:");
    state.linkAtual = `https://maps.apple.com/?daddr=${encodeURIComponent(p)}`;
  } else {
    const o = encodeURIComponent(state.origem.texto);
    const d = encodeURIComponent(state.rotaOrdenada.at(-1).texto);
    const w = state.rotaOrdenada.slice(0, -1).map(r => encodeURIComponent(r.texto)).join("|");

    state.linkAtual =
      `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}` +
      (w ? `&waypoints=${w}` : "");
  }

  document.getElementById("resultado").innerHTML =
  `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota</a></li>`;
}

/* ======================================================
   ROTAS SALVAS
====================================================== */
function salvarRota() {
  if (!state.linkAtual) return;

  const nome = prompt("Nome da rota:");
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
  rotas.push({
    nome,
    origem: state.origem,
    destinos: state.destinos,
    link: state.linkAtual
  });

  localStorage.setItem("rotas", JSON.stringify(rotas));
  listarRotas();
}

function listarRotas() {
  const sel = document.getElementById("rotasSelect");
  sel.innerHTML = `<option value="">Selecione uma rota salva</option>`;

  JSON.parse(localStorage.getItem("rotas") || []).forEach((r, i) => {
    sel.innerHTML += `<option value="${i}">${r.nome}</option>`;
  });
}

function abrirRotaSelecionada() {
  const sel = document.getElementById("rotasSelect");
  if (sel.value === "") return;

  const r = JSON.parse(localStorage.getItem("rotas"))[sel.value];
  window.open(r.link, "_blank");
}

function excluirRotaSelecionada() {
  const sel = document.getElementById("rotasSelect");
  if (sel.value === "") return;

  if (!confirm("Excluir esta rota?")) return;

  const rotas = JSON.parse(localStorage.getItem("rotas"));
  rotas.splice(sel.value, 1);
  localStorage.setItem("rotas", JSON.stringify(rotas));
  listarRotas();
}

/* ======================================================
   INIT
====================================================== */
listarClientesSelect();
listarRotas();
