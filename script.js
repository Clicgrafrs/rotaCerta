console.log("Rota Fácil PRO carregado");

let origemAtual = null;
let destinosGlobais = [];
let rotaOrdenada = [];
let linkAtual = null;


/* =========================
   MAPA DOS ESTADOS BR (BIAS)
========================= */
const estadosBR = {
  AC: { lat: -9.9747, lon: -67.8243 },   // Rio Branco
  AL: { lat: -9.6658, lon: -35.7353 },   // Maceió
  AP: { lat: 0.0349, lon: -51.0694 },    // Macapá
  AM: { lat: -3.1190, lon: -60.0217 },   // Manaus
  BA: { lat: -12.9777, lon: -38.5016 },  // Salvador
  CE: { lat: -3.7319, lon: -38.5267 },   // Fortaleza
  DF: { lat: -15.7939, lon: -47.8828 },  // Brasília
  ES: { lat: -20.3155, lon: -40.3128 },  // Vitória
  GO: { lat: -16.6869, lon: -49.2648 },  // Goiânia
  MA: { lat: -2.5307, lon: -44.3068 },   // São Luís
  MT: { lat: -15.6014, lon: -56.0979 },  // Cuiabá
  MS: { lat: -20.4697, lon: -54.6201 },  // Campo Grande
  MG: { lat: -19.9167, lon: -43.9345 },  // Belo Horizonte
  PA: { lat: -1.4558, lon: -48.4902 },   // Belém
  PB: { lat: -7.1195, lon: -34.8450 },   // João Pessoa
  PR: { lat: -25.4284, lon: -49.2733 },  // Curitiba
  PE: { lat: -8.0476, lon: -34.8770 },   // Recife
  PI: { lat: -5.0919, lon: -42.8034 },   // Teresina
  RJ: { lat: -22.9068, lon: -43.1729 },  // Rio de Janeiro
  RN: { lat: -5.7945, lon: -35.2110 },   // Natal
  RO: { lat: -8.7608, lon: -63.8999 },   // Porto Velho
  RR: { lat: 2.8235, lon: -60.6753 },    // Boa Vista
  RS: { lat: -30.0346, lon: -51.2177 },  // Porto Alegre
  SC: { lat: -27.5949, lon: -48.5482 },  // Florianópolis
  SE: { lat: -10.9472, lon: -37.0731 },  // Aracaju
  SP: { lat: -23.5505, lon: -46.6333 },  // São Paulo
  TO: { lat: -10.2491, lon: -48.3243 }   // Palmas
};



/* =========================
   DETECTAR UF NO TEXTO
========================= */
function extrairUF(texto) {
  const match = texto
    .toUpperCase()
    .match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RO|RR|RS|SC|SE|SP|TO)\b/);

  return match ? match[1] : null;
}



/* =========================
   GERAR BIAS GEOGRÁFICO
========================= */
function gerarBiasGeografico(texto) {
  const uf = extrairUF(texto);
  if (!uf || !estadosBR[uf]) return "";

  const { lat, lon } = estadosBR[uf];

  // radius em metros (300 km)
  return `&lat=${lat}&lon=${lon}&radius=300000`;
}


/* =========================
   CORDENADAS PARA MAPS
========================= */
function coordenadaParaMaps(lat, lon) {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}


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
   DETECTAR iOS
========================= */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/* =========================
   LOCALIZAÇÃO
========================= */
function usarLocalizacao() {
  navigator.geolocation.getCurrentPosition(
    async pos => {

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      // 🔥 reverse geocoding para obter endereço textual
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
      );
      const d = await r.json();

      origemAtual = {
        lat,
        lon,
        textoOriginal: coordenadaParaMaps(lat, lon)
      };

      document.getElementById("infoLocalizacao").innerText =
        "📍 Localização ativa";

    },
    () => alert("Erro ao obter localização"),
    { enableHighAccuracy: true }
  );
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
   NORMALIZAÇÃO DE ENDEREÇO
========================= */
function normalizarEndereco(txt) {
  return txt
    .replace(/CEP\s*\d{5}-?\d{3}/gi, "")
    .replace(/\bAV\.?\b/gi, "Avenida")
    .replace(/\bR\.?\b/gi, "Rua")
    .replace(/\//g, ", ")
    .replace(/([a-zà-ú])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}



/* =========================
   GEOLOCALIZAÇÃO (BIAS DINÂMICO)
========================= */
async function geocodificar(txt) {
  const original = txt.trim();
  const texto = normalizarEndereco(original);

  if (texto.length < 3) {
    throw new Error("Digite um endereço válido");
  }

  async function buscar(q) {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=json` +
      `&limit=5` +
      `&countrycodes=br` +
      `&accept-language=pt-BR` +
      `&addressdetails=1` +
      `&q=${encodeURIComponent(q)}`;

    const r = await fetch(url, {
      headers: { "User-Agent": "RotaFacilPRO/1.6.2" }
    });

    return await r.json();
  }

  // 1️⃣ tentativa: endereço completo
  let d = await buscar(texto);

  // 2️⃣ fallback: remove número e complemento
  if (!d.length) {
    const simplificado = texto
      .replace(/\d+/g, "")
      .replace(/,\s*(ap|apt|sala|bloco|centro).*$/i, "")
      .trim();

    d = await buscar(simplificado);
  }

  if (!d.length) {
    throw new Error("Endereço não encontrado. Verifique cidade ou UF.");
  }

  const melhor =
    d.find(i => i.type === "house") ||
    d.find(i => i.address?.road) ||
    d[0];

  return {
    textoOriginal: original,
    textoFormatado: melhor.display_name,
    lat: +melhor.lat,
    lon: +melhor.lon
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
    const enderecoTxt = d.querySelector(".endereco").value.trim();
    if (!enderecoTxt) continue;

    let geo;
    try {
      geo = await geocodificar(enderecoTxt);
    } catch {
      continue;
    }

    if (clientes.some(c => mesmoLocal(c, geo))) continue;

    clientes.push({
      nome,
      endereco: geo.texto,
      lat: geo.lat,
      lon: geo.lon
    });

    salvos++;
  }

  salvarClientesStorage(clientes);
  listarClientesSelect();
  alert(`✅ ${salvos} cliente(s) salvos com sucesso`);
}

/* =========================
   LISTAR CLIENTES (SELECT)
========================= */
function listarClientesSelect() {
  const sel = document.getElementById("clientesSelect");
  if (!sel) return;

  const clientes = getClientes();
  sel.innerHTML = `<option value="">Selecione um cliente</option>`;

  clientes.forEach((c, i) => {
    sel.innerHTML += `
      <option value="${i}">
        ${c.nome || c.endereco}
      </option>
    `;
  });
}

/* =========================
   EXCLUIR CLIENTE
========================= */
function excluirCliente(index) {
  const clientes = getClientes();
  if (!clientes[index]) return;

  if (!confirm("Deseja excluir este cliente?")) return;

  clientes.splice(index, 1);
  salvarClientesStorage(clientes);
  gerarCampos();
}

function excluirClienteSelecionado() {
  const sel = document.getElementById("clientesSelect");
  const index = sel.value;

  if (index === "") {
    alert("Selecione um cliente para excluir");
    return;
  }

  excluirCliente(Number(index));
  listarClientesSelect();
}


/* =========================
   CRIAR APENAS UM DESTINO POR VEZ
========================= */
function criarCampoDestino(prepend = true) {
  const div = document.getElementById("enderecos");
  const clientes = getClientes();

  const d = document.createElement("div");
  d.className = "destino";

  const sel = document.createElement("select");
  sel.innerHTML = `<option value="">Buscar endereço salvo</option>`;
  clientes.forEach((c, idx) => {
    sel.innerHTML += `
      <option value="${idx}">
        ${c.nome || c.endereco}
      </option>`;
  });

  const end = document.createElement("input");
  end.className = "endereco";
  end.placeholder = "Endereço *";

  const nome = document.createElement("input");
  nome.className = "nome";
  nome.placeholder = "Nome do cliente (opcional)";

  const btnExcluir = document.createElement("button");
  btnExcluir.innerHTML = "❌";
  btnExcluir.className = "btn danger";
  btnExcluir.style.marginTop = "6px";

  btnExcluir.onclick = () => d.remove();

  sel.onchange = () => {
    if (!sel.value) return;
    const c = clientes[sel.value];
    end.value = c.endereco;
    nome.value = c.nome || "";
  };

  d.append(sel, end, nome, btnExcluir);

  // 🔥 INSERE NO TOPO (visual melhor)
  if (prepend) {
    div.prepend(d);
  } else {
    div.appendChild(d);
  }
}



/* =========================
   GERAR CAMPOS DE DESTINO
========================= */
function gerarCampos() {
  const qtd = +document.getElementById("qtd").value;
  if (!qtd || qtd < 1) return;

  for (let i = 0; i < qtd; i++) {
    criarCampoDestino(true); // sempre acima
  }
}

/* =========================
   LIMPAR TODOS OS DESTINOS
========================= */
function limparDestinos() {
  if (!confirm("Deseja remover todos os destinos?")) return;
  document.getElementById("enderecos").innerHTML = "";
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
   CALCULAR ROTA
========================= */
async function calcularRota() {
  try {
    if (!origemAtual) {
      origemAtual = await geocodificar(
        document.getElementById("origem").value.trim()
      );
    }

    destinosGlobais = [];
    for (let i of document.querySelectorAll(".endereco")) {
      destinosGlobais.push(await geocodificar(i.value));
    }

    rotaOrdenada = [...destinosGlobais].sort((a, b) =>
      calcularDistancia(origemAtual.lat, origemAtual.lon, a.lat, a.lon) -
      calcularDistancia(origemAtual.lat, origemAtual.lon, b.lat, b.lon)
    );

    gerarLink();

    document.getElementById("resultado").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  } catch (e) {
    alert(e.message);
  }
}

/* =========================
   GERAR LINK
========================= */
function gerarLink() {
  if (!rotaOrdenada.length) return;

  if (isIOS()) {
    const pontos = [
      origemAtual.textoOriginal,
      ...rotaOrdenada.map(r => r.textoOriginal)
    ].join("+to:");

    linkAtual =
      `https://maps.apple.com/?daddr=${encodeURIComponent(pontos)}`;
  } else {
    const pontos = [
      origemAtual.textoOriginal,
      ...rotaOrdenada.map(r => r.textoOriginal)
    ].map(p => encodeURIComponent(p)).join("/");

    linkAtual =
      `https://www.google.com/maps/dir/${pontos}`;
  }

  localStorage.setItem("ultimaRota", linkAtual);

  document.getElementById("resultado").innerHTML =
    `<li><a href="${linkAtual}" target="_blank">🚗 CLIQUE PARA ABRIR A ROTA OTIMIZADA</a></li>`;
}

/* =========================
   ROTAS SALVAS
========================= */
function salvarRota() {
  if (!linkAtual || !rotaOrdenada.length) {
    alert("Calcule uma rota antes de salvar");
    return;
  }

  const nome = prompt("Nome da rota:");
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");

  rotas.push({
    nome,
    origem: origemAtual,
    rota: rotaOrdenada,
    link: linkAtual
  });

  localStorage.setItem("rotas", JSON.stringify(rotas));
  listarRotas();
  alert("⭐ Rota salva com sucesso");
}

function listarRotas() {
  const sel = document.getElementById("rotasSelect");
  if (!sel) return;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
  sel.innerHTML = `<option value="">Selecione uma rota salva</option>`;

  rotas.forEach((r, i) => {
    sel.innerHTML += `<option value="${i}">${r.nome}</option>`;
  });
}

function abrirRotaSelecionada() {
  const sel = document.getElementById("rotasSelect");
  const i = sel.value;

  if (i === "") {
    alert("Selecione uma rota");
    return;
  }

  const rotas = JSON.parse(localStorage.getItem("rotas"));
  const r = rotas[i];

  origemAtual = r.origem;
  rotaOrdenada = r.rota;
  linkAtual = r.link;

  window.open(linkAtual, "_blank");
}

function excluirRotaSelecionada() {
  const sel = document.getElementById("rotasSelect");
  const i = sel.value;

  if (i === "") return;
  if (!confirm("Deseja excluir esta rota?")) return;

  const rotas = JSON.parse(localStorage.getItem("rotas"));
  rotas.splice(i, 1);
  localStorage.setItem("rotas", JSON.stringify(rotas));

  listarRotas();
}

/* =========================
   INIT
========================= */
listarClientesSelect();
listarRotas();
