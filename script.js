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
   GEOLOCALIZAÇÃO
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
   GERAR CAMPOS DE DESTINO
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
   OTIMIZAR ROTA (VIZINHO MAIS PRÓXIMO)
========================= */
function otimizarRota(origem, destinos) {
  const rotaFinal = [];
  let pontoAtual = origem;

  // copia para não alterar o array original
  const destinosRestantes = [...destinos];

  while (destinosRestantes.length > 0) {
    let indiceMaisProximo = 0;
    let menorDistancia = Infinity;

    for (let i = 0; i < destinosRestantes.length; i++) {
      const d = destinosRestantes[i];
      const distancia = calcularDistancia(
        pontoAtual.lat,
        pontoAtual.lon,
        d.lat,
        d.lon
      );

      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        indiceMaisProximo = i;
      }
    }

    const proximoDestino = destinosRestantes.splice(indiceMaisProximo, 1)[0];
    rotaFinal.push(proximoDestino);
    pontoAtual = proximoDestino;
  }

  return rotaFinal;
}


/* =========================
   CALCULAR ROTA
========================= */
async function calcularRota() {
  try {
    // limpa somente a rota ordenada (não os destinos globais ainda)
    rotaOrdenada = [];

    const origemInput = document.getElementById("origem").value.trim();

    // define a origem apenas se ainda não existir
    if (!origemAtual) {
      if (!origemInput) {
        alert("Informe o endereço de origem ou use a localização");
        return;
      }
      origemAtual = await geocodificar(origemInput);
    }

    // sempre recria os destinos SOMENTE no primeiro cálculo
    destinosGlobais = [];

    for (let input of document.querySelectorAll(".endereco")) {
      const valor = input.value.trim();
      if (!valor) continue;

      const geo = await geocodificar(valor);
      destinosGlobais.push(geo);
    }

    if (!destinosGlobais.length) {
      alert("Adicione ao menos um destino");
      return;
    }

    // remove destinos duplicados
    destinosGlobais = destinosGlobais.filter(
      (d, i, arr) =>
        i === arr.findIndex(o => mesmoLocal(o, d))
    );

    // otimiza a rota
    rotaOrdenada = otimizarRota(origemAtual, destinosGlobais);

    // gera link atualizado
    gerarLink();

    // rola até o resultado
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
      origemAtual.texto,
      ...rotaOrdenada.map(r => r.texto)
    ].join("+to:");

    linkAtual = `https://maps.apple.com/?daddr=${encodeURIComponent(pontos)}`;
  } else {
    const o = encodeURIComponent(origemAtual.texto);
    const d = encodeURIComponent(rotaOrdenada.at(-1).texto);
    const w = rotaOrdenada
      .slice(0, -1)
      .map(r => encodeURIComponent(r.texto))
      .join("|");

    linkAtual =
      `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}` +
      (w ? `&waypoints=${w}` : "");
  }

  localStorage.setItem("ultimaRota", linkAtual);

  document.getElementById("resultado").innerHTML =
    `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota otimizada</a></li>`;
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
   ADICIONAR PARADA
========================= */
async function adicionarParada() {
  try {
    const input = document.getElementById("novaParada");
    const enderecoTxt = input.value.trim();

    if (!enderecoTxt) {
      alert("Digite o endereço da nova parada");
      return;
    }

    if (!origemAtual || !rotaOrdenada.length) {
      alert("Calcule uma rota antes de adicionar uma parada");
      return;
    }

    const novoDestino = await geocodificar(enderecoTxt);

    // evita duplicação
    if (destinosGlobais.some(d => mesmoLocal(d, novoDestino))) {
      alert("Esse endereço já está na rota");
      return;
    }

    // adiciona ao conjunto global
    destinosGlobais.push(novoDestino);

    // recalcula rota completa
    rotaOrdenada = otimizarRota(origemAtual, destinosGlobais);

    gerarLink();

    input.value = "";

    document.getElementById("resultado").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  } catch (e) {
    alert(e.message);
  }
}



/* =========================
   INIT
========================= */
listarClientesSelect();
listarRotas();
