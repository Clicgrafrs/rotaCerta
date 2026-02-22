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
   GEO + DISTÂNCIA
========================= */
async function geocodificar(txt) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(txt)}`
  );
  const d = await r.json();

  if (!d.length) {
    throw new Error(`Endereço inválido ou não encontrado:\n${txt}`);
  }

  return { texto: txt, lat: +d[0].lat, lon: +d[0].lon };
}

function distancia(a, b) {
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

function ordenarPorProximidade(origem, destinos) {
  let atual = origem;
  let restantes = [...destinos];
  let rota = [];

  while (restantes.length) {
    let idx = 0;
    for (let i = 1; i < restantes.length; i++) {
      if (distancia(atual, restantes[i]) < distancia(atual, restantes[idx])) {
        idx = i;
      }
    }
    atual = restantes[idx];
    rota.push(restantes.splice(idx, 1)[0]);
  }

  return rota;
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

      try {
        destinosGlobais.push(await geocodificar(input.value));
      } catch {
        marcarErro(input);
        return alert(`Endereço inválido:\n${input.value}`);
      }
    }

    rotaOrdenada = ordenarPorProximidade(origemAtual, destinosGlobais);
    gerarLink();

  } catch (e) {
    alert(e.message);
  }
}

/* =========================
   GERAR LINK (ANDROID + iOS)
========================= */
function gerarLink() {
  if (!rotaOrdenada.length) return;

  if (isIOS()) {
    const pontos = [
      origemAtual.texto,
      ...rotaOrdenada.map(r => r.texto)
    ].join("+to:");

    linkAtual = `https://maps.apple.com/?daddr=${encodeURIComponent(pontos)}`;

    document.getElementById("resultado").innerHTML =
      `<li><a href="${linkAtual}" target="_blank">🍎 Abrir rota no Apple Maps</a></li>`;
  } else {
    const o = encodeURIComponent(origemAtual.texto);
    const d = encodeURIComponent(rotaOrdenada.at(-1).texto);
    const w = rotaOrdenada.slice(0, -1)
      .map(r => encodeURIComponent(r.texto))
      .join("|");

    linkAtual =
      `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving` +
      (w ? `&waypoints=${w}` : "");

    document.getElementById("resultado").innerHTML =
      `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota otimizada no Google Maps</a></li>`;
  }
}

/* =========================
   ADICIONAR PARADA
========================= */
async function adicionarParada() {
  try {
    if (!rotaOrdenada.length)
      return alert("Calcule ou abra uma rota antes");

    const input = document.getElementById("novaParada");
    const txt = input.value.trim();
    limparErro(input);

    if (!txt) {
      marcarErro(input);
      return alert("Digite o endereço da nova parada");
    }

    try {
      rotaOrdenada.push(await geocodificar(txt));
    } catch {
      marcarErro(input);
      return alert("Endereço da nova parada inválido");
    }

    input.value = "";
    gerarLink();

  } catch (e) {
    alert(e.message);
  }
}

/* =========================
   ROTAS SALVAS
========================= */
function salvarRota() {
  if (!linkAtual) return alert("Calcule a rota antes de salvar");

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
}

function listarRotas() {
  const sel = document.getElementById("rotasSelect");
  sel.innerHTML = `<option value="">Selecione uma rota salva</option>`;
  JSON.parse(localStorage.getItem("rotas") || "[]")
    .forEach((r, i) =>
      sel.innerHTML += `<option value="${i}">${r.nome}</option>`
    );
}

function abrirRotaSelecionada() {
  const i = document.getElementById("rotasSelect").value;
  if (i === "") return alert("Selecione uma rota");

  const r = JSON.parse(localStorage.getItem("rotas"))[i];
  origemAtual = r.origem;
  rotaOrdenada = r.rota;
  gerarLink();
  window.open(linkAtual, "_blank");
}

function excluirRotaSelecionada() {
  const i = document.getElementById("rotasSelect").value;
  if (i === "") return;

  const rotas = JSON.parse(localStorage.getItem("rotas"));
  rotas.splice(i, 1);
  localStorage.setItem("rotas", JSON.stringify(rotas));
  listarRotas();
}

listarRotas();
