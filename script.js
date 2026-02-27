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

// 🔹 Valida se o endereço retornado é diferente do digitado
function precisaConfirmacao(entrada, retorno) {
  const e = entrada.toLowerCase();
  const r = retorno.toLowerCase();

  // compara apenas o primeiro trecho (rua / local)
  return !r.includes(e.split(",")[0]);
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
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&limit=8&countrycodes=br&addressdetails=1` +
    `&q=${encodeURIComponent(q)}`,
    { headers: { "User-Agent": "RotaFacilPRO/1.6" } }
  );

  const d = await r.json();
  const dl = document.getElementById(datalistId);
  if (!dl) return;

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
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&limit=5&addressdetails=1&namedetails=1&countrycodes=br` +
    `&q=${encodeURIComponent(txt)}`,
    { headers: { "User-Agent": "RotaFacilPRO/1.6" } }
  );

  const d = await r.json();
  if (!d.length) throw new Error(`Endereço não encontrado: ${txt}`);

  // 🔹 tenta achar o melhor match (rua + número)
  const melhor =
    d.find(i => i.address?.house_number) ||
    d.find(i => i.type === "house") ||
    d.find(i => i.class === "highway") ||
    d[0];

  const geo = {
    texto: melhor.display_name,
    lat: +melhor.lat,
    lon: +melhor.lon
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
function gerarCampos() {
  const qtd = +document.getElementById("qtd").value;
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  const clientes = getClientes();

  for (let i = 0; i < qtd; i++) {
    const d = document.createElement("div");
    d.className = "destino";

    const sel = document.createElement("select");
    sel.innerHTML = `<option value="">Selecionar endereço salvo</option>`;

    clientes.forEach((c, idx) => {
      sel.innerHTML += `<option value="${idx}">${c.nome || c.endereco}</option>`;
    });

    const end = document.createElement("input");
    end.className = "endereco";
    end.placeholder = "Endereço *";

    const nome = document.createElement("input");
    nome.className = "nome";
    nome.placeholder = "Nome do cliente (opcional)";

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

  renderRoteiro();
  gerarLink();
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
  const pontos = [
    state.origem,
    ...state.rotaOrdenada
  ];

  const coords = pontos.map(p => `${p.lat},${p.lon}`);

  const geoLink = `geo:${coords[0]}?q=${coords.join("|")}`;
  const webLink = `https://www.google.com/maps/dir/${coords.join("/")}`;

  state.linkAtual = {
    geo: geoLink,
    web: webLink
  };

  const ol = document.getElementById("resultado");

  // 🔹 Remove link antigo, se existir
  const antigo = document.getElementById("linkRota");
  if (antigo) antigo.remove();

  // 🔹 Cria item do link
  const li = document.createElement("li");
  li.id = "linkRota";
  li.innerHTML = `
    <a href="${geoLink}">📱 Abrir no app de navegação</a>
    &nbsp;|&nbsp;
    <a href="${webLink}" target="_blank">🌍 Abrir no navegador</a>
  `;

  ol.appendChild(li);
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
