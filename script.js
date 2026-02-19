console.log("Rota Fácil PRO carregado");

let origemAtual = null;
let rotaAtiva = [];   // rota na ordem real
let linkAtual = null;

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
   GEO
========================= */
async function geocodificar(txt) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(txt)}`
  );
  const d = await r.json();
  if (!d.length) throw new Error("Endereço não encontrado");
  return { texto: txt, lat: +d[0].lat, lon: +d[0].lon };
}

/* =========================
   CALCULAR ROTA
========================= */
async function calcularRota() {
  if (!origemAtual)
    origemAtual = await geocodificar(document.getElementById("origem").value);

  rotaAtiva = [];

  for (let i of document.querySelectorAll(".endereco"))
    if (i.value) rotaAtiva.push(await geocodificar(i.value));

  gerarLinkRota();
}

/* =========================
   GERAR LINK
========================= */
function gerarLinkRota() {
  if (!rotaAtiva.length) return;

  const o = encodeURIComponent(origemAtual.texto);
  const d = encodeURIComponent(rotaAtiva.at(-1).texto);
  const w = rotaAtiva.slice(0,-1).map(r => encodeURIComponent(r.texto)).join("|");

  linkAtual =
    `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving` +
    (w ? `&waypoints=${w}` : "");

  document.getElementById("resultado").innerHTML =
    `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota no Google Maps</a></li>`;
}

/* =========================
   ADICIONAR PARADA (CORRETO)
========================= */
async function adicionarParada() {
  if (!rotaAtiva.length) {
    alert("Nenhuma rota ativa");
    return;
  }

  const txt = document.getElementById("novaParada").value.trim();
  if (!txt) return alert("Digite o endereço");

  const nova = await geocodificar(txt);
  rotaAtiva.push(nova);

  document.getElementById("novaParada").value = "";
  gerarLinkRota();
}

/* =========================
   ROTAS SALVAS
========================= */
function salvarRota() {
  if (!linkAtual) return alert("Calcule a rota antes");

  const nome = prompt("Nome da rota:");
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
  rotas.push({ nome, origem: origemAtual, rota: rotaAtiva, link: linkAtual });
  localStorage.setItem("rotas", JSON.stringify(rotas));
  listarRotas();
}

function listarRotas() {
  const sel = document.getElementById("rotasSelect");
  sel.innerHTML = `<option value="">Selecione uma rota salva</option>`;
  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
  rotas.forEach((r,i) =>
    sel.innerHTML += `<option value="${i}">${r.nome}</option>`
  );
}

function abrirRotaSelecionada() {
  const i = document.getElementById("rotasSelect").value;
  if (i === "") return alert("Selecione uma rota");

  const r = JSON.parse(localStorage.getItem("rotas"))[i];
  origemAtual = r.origem;
  rotaAtiva = r.rota;
  linkAtual = r.link;

  gerarLinkRota();
  window.open(linkAtual, "_blank");
}

function excluirRotaSelecionada() {
  const i = document.getElementById("rotasSelect").value;
  if (i === "") return alert("Selecione uma rota");

  const rotas = JSON.parse(localStorage.getItem("rotas"));
  rotas.splice(i,1);
  localStorage.setItem("rotas", JSON.stringify(rotas));
  listarRotas();
}

listarRotas();
