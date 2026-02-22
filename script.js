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

function salvarClientes() {
  const clientes = getClientes();

  document.querySelectorAll(".destino").forEach(d => {
    const nomeInput = d.querySelector(".nome");
    const enderecoInput = d.querySelector(".endereco");

    const nome = nomeInput.value.trim();
    const endereco = enderecoInput.value.trim();

    if (!endereco) return;

    if (!clientes.some(c => c.endereco === endereco)) {
      clientes.push({ nome, endereco });
    }
  });

  localStorage.setItem("clientes", JSON.stringify(clientes));
  alert("Endereços salvos");
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
    clientes.forEach(c =>
      sel.innerHTML += `<option value="${c.endereco}|${c.nome || ""}">
        ${c.nome || c.endereco}
      </option>`
    );

    const end = document.createElement("input");
    end.className = "endereco";
    end.placeholder = "Endereço *";
    end.oninput = () => limparErro(end);

    const nome = document.createElement("input");
    nome.className = "nome";
    nome.placeholder = "Nome do cliente (opcional)";

    sel.onchange = () => {
      if (!sel.value) return;
      const [e, n] = sel.value.split("|");
      end.value = e;
      nome.value = n;
      limparErro(end);
    };

    d.append(sel, end, nome);
    div.appendChild(d);
  }
}

/* =========================
   GEO + DISTÂNCIA (CORRIGIDO)
========================= */
async function geocodificar(txt) {
  const texto = txt.trim();
  const palavras = texto.split(/\s+/).filter(p => p.length > 2);

  if (palavras.length < 2) {
    throw new Error(
      "Endereço muito genérico.\n" +
      "Exemplo válido:\nSupermercado Dalpiaz Osório RS"
    );
  }

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(texto)}`
  );

  const d = await r.json();
  if (!d.length) {
    throw new Error(`Endereço não encontrado:\n${texto}`);
  }

  const resultado = d.find(item => {
    const a = item.address || {};
    return (
      item.lat &&
      item.lon &&
      a.state &&
      (
        a.city ||
        a.town ||
        a.village ||
        a.municipality ||
        a.suburb ||
        a.road
      )
    );
  });

  if (!resultado) {
    throw new Error(
      "Endereço impreciso.\nInclua cidade e estado."
    );
  }

  return {
    texto,
    lat: +resultado.lat,
    lon: +resultado.lon
  };
}

/* =========================
   ORDENAR POR PROXIMIDADE
========================= */
function ordenarPorProximidade(origem, destinos) {
  return [...destinos].sort((a, b) =>
    calcularDistancia(origem.lat, origem.lon, a.lat, a.lon) -
    calcularDistancia(origem.lat, origem.lon, b.lat, b.lon)
  );
}

/* =========================
   DISTÂNCIA HAVERSINE (km)
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
    const origemInput = document.getElementById("origem");
    const origemTxt = origemInput.value.trim();
    limparErro(origemInput);

    if (!origemAtual && !origemTxt) {
      marcarErro(origemInput);
      return alert("Informe o ponto de partida");
    }

    if (!origemAtual) {
      origemAtual = await geocodificar(origemTxt);
    }

    destinosGlobais = [];

    for (let input of document.querySelectorAll(".endereco")) {
      limparErro(input);
      if (!input.value.trim()) {
        marcarErro(input);
        return alert("Preencha todos os endereços de destino");
      }
      destinosGlobais.push(await geocodificar(input.value));
    }

    rotaOrdenada = ordenarPorProximidade(origemAtual, destinosGlobais);
    gerarLink();

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
      `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving` +
      (w ? `&waypoints=${w}` : "");
  }

  document.getElementById("resultado").innerHTML =
    `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota otimizada</a></li>`;
}

/* =========================
   ADICIONAR PARADA
========================= */
async function adicionarParada() {
  if (!rotaOrdenada.length)
    return alert("Calcule ou abra uma rota antes");

  const input = document.getElementById("novaParada");
  const txt = input.value.trim();
  limparErro(input);

  if (!txt) {
    marcarErro(input);
    return alert("Digite o endereço da nova parada");
  }

  const novaParada = await geocodificar(txt);
  destinosGlobais.push(novaParada);
  rotaOrdenada = ordenarPorProximidade(origemAtual, destinosGlobais);

  input.value = "";
  gerarLink();
}

/* =========================
   ROTAS SALVAS
========================= */
function salvarRota() {
  if (!linkAtual) return alert("Calcule a rota antes de salvar");

  const nome = prompt("Nome da rota:");
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
  rotas.push({ nome, origem: origemAtual, rota: rotaOrdenada, link: linkAtual });
  localStorage.setItem("rotas", JSON.stringify(rotas));
  listarRotas();
}

function listarRotas() {
  const sel = document.getElementById("rotasSelect");
  sel.innerHTML = `<option value="">Selecione uma rota salva</option>`;
  JSON.parse(localStorage.getItem("rotas") || "[]")
    .forEach((r, i) => sel.innerHTML += `<option value="${i}">${r.nome}</option>`);
}

listarRotas();




/* =========================
   ABRIR ROTAS SALVAS
========================= */

function abrirRotaSelecionada() {
  const sel = document.getElementById("rotasSelect");
  const i = sel.value;

  if (i === "") {
    alert("Selecione uma rota salva");
    return;
  }

  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
  const r = rotas[i];

  if (!r) {
    alert("Rota não encontrada");
    return;
  }

  // Restaurar estado
  origemAtual = r.origem;
  rotaOrdenada = r.rota;
  linkAtual = r.link;

  // Mostrar novamente no painel
  document.getElementById("resultado").innerHTML =
    `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota salva</a></li>`;

  // Abrir automaticamente
  window.open(linkAtual, "_blank");
}
