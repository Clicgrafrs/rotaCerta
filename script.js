console.log("Rota Fácil PRO carregado");

let origemAtual = null;
let destinosGlobais = [];

/* =========================
   Localização atual
   ========================= */
function usarLocalizacao() {
  navigator.geolocation.getCurrentPosition(pos => {
    origemAtual = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      texto: `${pos.coords.latitude},${pos.coords.longitude}`
    };
    alert("Localização atual definida como ponto de partida");
  }, () => {
    alert("Não foi possível obter a localização");
  });
}

/* =========================
   Gerar campos
   ========================= */
function gerarCampos() {
  const qtd = parseInt(document.getElementById("qtd").value);
  const div = document.getElementById("enderecos");
  div.innerHTML = "";
  destinosGlobais = [];

  for (let i = 1; i <= qtd; i++) {
    const input = document.createElement("input");
    input.placeholder = "Destino " + i;
    div.appendChild(input);
  }
}

/* =========================
   Geocodificação
   ========================= */
async function geocodificar(texto) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texto)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.length) throw new Error("Endereço não encontrado");

  return {
    texto,
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon)
  };
}

/* =========================
   Distância
   ========================= */
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

/* =========================
   Ordenar destinos
   ========================= */
function ordenar(origem, destinos) {
  const rota = [];
  let atual = origem;
  let restantes = [...destinos];

  while (restantes.length) {
    let idx = 0;
    let menor = distancia(atual, restantes[0]);

    for (let i = 1; i < restantes.length; i++) {
      const d = distancia(atual, restantes[i]);
      if (d < menor) {
        menor = d;
        idx = i;
      }
    }

    atual = restantes[idx];
    rota.push(restantes.splice(idx, 1)[0]);
  }

  return rota;
}

/* =========================
   Calcular rota
   ========================= */
async function calcularRota() {
  const lista = document.getElementById("resultado");
  lista.innerHTML = "";

  if (!origemAtual) {
    const texto = document.getElementById("origem").value.trim();
    origemAtual = await geocodificar(texto);
  }

  const inputs = document.querySelectorAll("#enderecos input");
  destinosGlobais = [];

  for (let input of inputs) {
    if (input.value.trim()) {
      destinosGlobais.push(await geocodificar(input.value.trim()));
    }
  }

  const rota = ordenar(origemAtual, destinosGlobais);

  const origin = encodeURIComponent(origemAtual.texto);
  const destination = encodeURIComponent(rota[rota.length - 1].texto);
  const waypoints = rota.slice(0, -1).map(d => encodeURIComponent(d.texto)).join("|");

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;

  lista.innerHTML = `<li><a href="${url}" target="_blank">🚗 Abrir rota no Google Maps</a></li>`;
}

/* =========================
   Adicionar parada atual
   ========================= */
function adicionarParadaAtual() {
  navigator.geolocation.getCurrentPosition(pos => {
    destinosGlobais.push({
      texto: `${pos.coords.latitude},${pos.coords.longitude}`,
      lat: pos.coords.latitude,
      lon: pos.coords.longitude
    });
    calcularRota();
  });
}

/* =========================
   Clientes (localStorage)
   ========================= */
function salvarCliente() {
  const nome = document.getElementById("nomeCliente").value;
  const endereco = document.getElementById("enderecoCliente").value;
  if (!nome || !endereco) return;

  const clientes = JSON.parse(localStorage.getItem("clientes") || "[]");
  clientes.push({ nome, endereco });
  localStorage.setItem("clientes", JSON.stringify(clientes));
  listarClientes();
}

function listarClientes() {
  const div = document.getElementById("listaClientes");
  const clientes = JSON.parse(localStorage.getItem("clientes") || "[]");
  div.innerHTML = "";

  clientes.forEach(c => {
    const p = document.createElement("div");
    p.className = "cliente";
    p.textContent = `${c.nome} – ${c.endereco}`;
    p.onclick = () => document.getElementById("origem").value = c.endereco;
    div.appendChild(p);
  });
}

listarClientes();
