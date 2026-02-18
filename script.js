console.log("Rota Fácil PRO carregado");

let origemAtual = null;
let destinosGlobais = [];

/* =====================
   Localização atual
   ===================== */
function usarLocalizacao() {
  navigator.geolocation.getCurrentPosition(pos => {
    origemAtual = {
      texto: `${pos.coords.latitude},${pos.coords.longitude}`,
      lat: pos.coords.latitude,
      lon: pos.coords.longitude
    };
    alert("Localização atual definida");
  });
}

/* =====================
   Clientes salvos
   ===================== */
function getClientes() {
  return JSON.parse(localStorage.getItem("clientes") || "[]");
}

function salvarClientes() {
  const clientes = getClientes();
  const blocos = document.querySelectorAll(".destino");

  blocos.forEach(b => {
    const nome = b.querySelector(".nome").value.trim();
    const endereco = b.querySelector(".endereco").value.trim();
    if (!endereco) return;

    const existe = clientes.some(c => c.endereco === endereco);
    if (!existe) {
      clientes.push({ nome, endereco });
    }
  });

  localStorage.setItem("clientes", JSON.stringify(clientes));
  alert("Endereços salvos com sucesso");
}

/* =====================
   Gerar campos
   ===================== */
function gerarCampos() {
  const qtd = parseInt(document.getElementById("qtd").value);
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  const clientes = getClientes();

  for (let i = 1; i <= qtd; i++) {
    const bloco = document.createElement("div");
    bloco.className = "destino";

    const select = document.createElement("select");
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Selecionar cliente salvo";
    select.appendChild(opt);

    clientes.forEach(c => {
      const o = document.createElement("option");
      o.value = c.endereco;
      o.textContent = c.nome || c.endereco;
      select.appendChild(o);
    });

    const inputEndereco = document.createElement("input");
    inputEndereco.placeholder = "Endereço do destino";
    inputEndereco.className = "endereco";

    select.onchange = () => inputEndereco.value = select.value;

    const inputNome = document.createElement("input");
    inputNome.placeholder = "Nome do cliente (opcional)";
    inputNome.className = "nome";

    bloco.appendChild(select);
    bloco.appendChild(inputEndereco);
    bloco.appendChild(inputNome);

    div.appendChild(bloco);
  }
}

/* =====================
   Geocodificação
   ===================== */
async function geocodificar(txt) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(txt)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.length) throw new Error("Endereço não encontrado");
  return { texto: txt, lat: +data[0].lat, lon: +data[0].lon };
}

/* =====================
   Distância
   ===================== */
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

/* =====================
   Ordenar
   ===================== */
function ordenar(origem, destinos) {
  let atual = origem;
  const rota = [];
  const restantes = [...destinos];

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

/* =====================
   Calcular rota
   ===================== */
async function calcularRota() {
  const lista = document.getElementById("resultado");
  lista.innerHTML = "";

  if (!origemAtual) {
    origemAtual = await geocodificar(document.getElementById("origem").value);
  }

  const inputs = document.querySelectorAll(".endereco");
  destinosGlobais = [];

  for (let i of inputs) {
    if (i.value.trim()) {
      destinosGlobais.push(await geocodificar(i.value.trim()));
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

/* =====================
   Parada atual
   ===================== */
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

/* =====================
   Salvar rota
   ===================== */
function salvarRota() {
  const nome = prompt("Nome da rota:");
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
  rotas.push({
    nome,
    origem: origemAtual,
    destinos: destinosGlobais
  });

  localStorage.setItem("rotas", JSON.stringify(rotas));
  alert("Rota salva com sucesso");
}
