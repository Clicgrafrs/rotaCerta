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
    pos => {
      origemAtual = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        texto: `${pos.coords.latitude},${pos.coords.longitude}`
      };
      document.getElementById("infoLocalizacao").innerText = "📍 Localização ativa";
    },
    () => alert("Erro ao obter localização"),
    { enableHighAccuracy: true }
  );
}

/* =========================
   CLIENTES
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
function normalizarTexto(txt) {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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
   GEO + AUTOCOMPLETE
========================= */
async function geocodificar(txt) {
  const texto = txt.trim();
  if (texto.length < 2) {
    throw new Error("Digite ao menos parte do endereço");
  }

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(texto)}`
  );

  const d = await r.json();
  if (!d.length) {
    throw new Error("Endereço não encontrado. Inclua cidade ou estado.");
  }

  const res = d.find(i => i.lat && i.lon);
  if (!res) {
    throw new Error("Endereço impreciso.");
  }

  return {
    texto,
    lat: +res.lat,
    lon: +res.lon
  };
}

async function buscarSugestoesEndereco(txt) {
  if (txt.length < 3) return [];
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br&q=${encodeURIComponent(txt)}`
  );
  return await r.json();
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
  alert(`✅ ${salvos} cliente(s) salvos com sucesso`);
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

/* =========================
   GERAR CAMPOS
========================= */
function gerarCampos() {
  const qtd = +document.getElementById("qtd").value;
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  const clientes = getClientes();

  for (let i = 0; i < qtd; i++) {
    const d = document.createElement("div");
    d.className = "destino";

    const sel = document.createElement("select");
    sel.innerHTML = `<option value="">Cliente salvo</option>`;
    clientes.forEach((c, idx) => {
      sel.innerHTML += `<option value="${idx}">
        ${c.nome || c.endereco}
      </option>`;
    });

    const end = document.createElement("input");
    end.className = "endereco";
    end.placeholder = "Endereço *";

    const nome = document.createElement("input");
    nome.className = "nome";
    nome.placeholder = "Nome do cliente (opcional)";

    sel.onchange = () => {
      if (!sel.value) return;
      const c = clientes[sel.value];
      end.value = c.endereco;
      nome.value = c.nome || "";
    };

    d.append(sel, end, nome);
    div.appendChild(d);
  }
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

    // 👉 FOCO AUTOMÁTICO NO RESULTADO
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
    const pontos = [origemAtual.texto, ...rotaOrdenada.map(r => r.texto)].join("+to:");
    linkAtual = `https://maps.apple.com/?daddr=${encodeURIComponent(pontos)}`;
  } else {
    const o = encodeURIComponent(origemAtual.texto);
    const d = encodeURIComponent(rotaOrdenada.at(-1).texto);
    const w = rotaOrdenada.slice(0, -1).map(r => encodeURIComponent(r.texto)).join("|");

    linkAtual =
      `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}` +
      (w ? `&waypoints=${w}` : "");
  }

  localStorage.setItem("ultimaRota", linkAtual);

  document.getElementById("resultado").innerHTML =
    `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota otimizada</a></li>`;
}

/* =========================
   ABRIR ÚLTIMA ROTA
========================= */
function abrirUltimaRota() {
  const link = localStorage.getItem("ultimaRota");
  if (!link) return alert("Nenhuma rota salva");
  window.open(link, "_blank");
}
