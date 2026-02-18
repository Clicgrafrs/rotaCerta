console.log("Rota Fácil PRO carregado");

let origemAtual = null;
let destinosGlobais = [];
let linkAtual = null;
let rotaSelecionadaIndex = null;

/* =========================
   LOCALIZAÇÃO GPS
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
    const nome = d.querySelector(".nome")?.value.trim();
    const endereco = d.querySelector(".endereco")?.value.trim();
    if (!endereco) return;
    if (!clientes.some(c => c.endereco === endereco))
      clientes.push({ nome, endereco });
  });
  localStorage.setItem("clientes", JSON.stringify(clientes));
  alert("Clientes salvos");
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
      sel.innerHTML += `<option value="${c.endereco}">${c.nome || c.endereco}</option>`
    );

    const end = document.createElement("input");
    end.className = "endereco";
    end.placeholder = "Endereço";

    sel.onchange = () => end.value = sel.value;

    const nome = document.createElement("input");
    nome.className = "nome";
    nome.placeholder = "Nome do cliente";

    d.append(sel, end, nome);
    div.appendChild(d);
  }
}

/* =========================
   GEO / DISTÂNCIA
   ========================= */
async function geocodificar(txt) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(txt)}`
  );
  const d = await r.json();
  return { texto: txt, lat: +d[0].lat, lon: +d[0].lon };
}

function distancia(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x =
    Math.sin(dLat/2)**2 +
    Math.cos(a.lat*Math.PI/180) *
    Math.cos(b.lat*Math.PI/180) *
    Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

function ordenar(origem, destinos) {
  let atual = origem, rota = [], rest = [...destinos];
  while (rest.length) {
    let i = 0;
    for (let j = 1; j < rest.length; j++)
      if (distancia(atual, rest[j]) < distancia(atual, rest[i])) i = j;
    atual = rest[i];
    rota.push(rest.splice(i,1)[0]);
  }
  return rota;
}

/* =========================
   CALCULAR / RECALCULAR ROTA
   ========================= */
async function calcularRota() {
  if (!origemAtual)
    origemAtual = await geocodificar(document.getElementById("origem").value);

  if (!destinosGlobais.length) {
    destinosGlobais = [];
    for (let i of document.querySelectorAll(".endereco"))
      if (i.value) destinosGlobais.push(await geocodificar(i.value));
  }

  const rota = ordenar(origemAtual, destinosGlobais);

  const o = encodeURIComponent(origemAtual.texto);
  const d = encodeURIComponent(rota.at(-1).texto);
  const w = rota.slice(0,-1).map(r => encodeURIComponent(r.texto)).join("|");

  linkAtual =
    `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving` +
    (w ? `&waypoints=${w}` : "");

  document.getElementById("resultado").innerHTML =
    `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota no Google Maps</a></li>`;
}

/* =========================
   ADICIONAR PARADA À ROTA ATUAL
   ========================= */
function adicionarParadaAtual() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      destinosGlobais.push({
        texto: `${pos.coords.latitude},${pos.coords.longitude}`,
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      });
      calcularRota();
    },
    () => alert("Erro ao obter localização"),
    { enableHighAccuracy: true }
  );
}

/* =========================
   ROTAS SALVAS (DROPDOWN)
   ========================= */
function salvarRota() {
  if (!linkAtual) {
    alert("Calcule a rota antes de salvar");
    return;
  }

  const nome = prompt("Nome da rota:");
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
  rotas.push({
    nome,
    origem: origemAtual,
    destinos: destinosGlobais,
    link: linkAtual
  });

  localStorage.setItem("rotas", JSON.stringify(rotas));
  listarRotas();
}

function listarRotas() {
  const select = document.getElementById("rotasSelect");
  select.innerHTML = `<option value="">Selecione uma rota salva</option>`;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
  rotas.forEach((r, i) => {
    select.innerHTML += `<option value="${i}">${r.nome}</option>`;
  });
}

function selecionarRota() {
  rotaSelecionadaIndex = document.getElementById("rotasSelect").value;
}

function abrirRotaSelecionada() {
  if (rotaSelecionadaIndex === null || rotaSelecionadaIndex === "")
    return alert("Selecione uma rota");

  const r = JSON.parse(localStorage.getItem("rotas"))[rotaSelecionadaIndex];
  window.open(r.link, "_blank");

  origemAtual = r.origem;
  destinosGlobais = r.destinos;
  linkAtual = r.link;
}

function excluirRotaSelecionada() {
  if (rotaSelecionadaIndex === null || rotaSelecionadaIndex === "")
    return alert("Selecione uma rota");

  const rotas = JSON.parse(localStorage.getItem("rotas"));
  rotas.splice(rotaSelecionadaIndex, 1);
  localStorage.setItem("rotas", JSON.stringify(rotas));
  rotaSelecionadaIndex = null;
  listarRotas();
}

listarRotas();
