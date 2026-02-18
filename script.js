console.log("Rota Fácil PRO carregado");

let origemAtual = null;
let destinosGlobais = [];

/* =========================
   Localização atual (precisa)
   ========================= */
function usarLocalizacao() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      origemAtual = {
        texto: `${pos.coords.latitude},${pos.coords.longitude}`,
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      };

      document.getElementById("origem").value =
        `${pos.coords.latitude}, ${pos.coords.longitude}`;

      document.getElementById("precisao").innerText =
        `Precisão aproximada: ${Math.round(pos.coords.accuracy)} metros`;

      alert("Localização atual definida com sucesso");
    },
    err => {
      alert("Erro ao obter localização");
      console.error(err);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/* =========================
   Clientes
   ========================= */
function getClientes() {
  return JSON.parse(localStorage.getItem("clientes") || "[]");
}

function salvarClientes() {
  const clientes = getClientes();
  document.querySelectorAll(".destino").forEach(b => {
    const nome = b.querySelector(".nome").value.trim();
    const endereco = b.querySelector(".endereco").value.trim();
    if (!endereco) return;
    if (!clientes.some(c => c.endereco === endereco)) {
      clientes.push({ nome, endereco });
    }
  });
  localStorage.setItem("clientes", JSON.stringify(clientes));
  alert("Endereços salvos");
}

/* =========================
   Gerar campos
   ========================= */
function gerarCampos() {
  const qtd = parseInt(document.getElementById("qtd").value);
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  const clientes = getClientes();

  for (let i = 1; i <= qtd; i++) {
    const bloco = document.createElement("div");
    bloco.className = "destino";

    const select = document.createElement("select");
    select.innerHTML = `<option value="">Selecionar cliente salvo</option>`;
    clientes.forEach(c => {
      const o = document.createElement("option");
      o.value = c.endereco;
      o.textContent = c.nome || c.endereco;
      select.appendChild(o);
    });

    const endereco = document.createElement("input");
    endereco.placeholder = "Endereço";
    endereco.className = "endereco";

    select.onchange = () => endereco.value = select.value;

    const nome = document.createElement("input");
    nome.placeholder = "Nome (opcional)";
    nome.className = "nome";

    bloco.append(select, endereco, nome);
    div.appendChild(bloco);
  }
}

/* =========================
   Geocodificação
   ========================= */
async function geocodificar(txt) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(txt)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.length) throw new Error("Endereço não encontrado");
  return { texto: txt, lat: +data[0].lat, lon: +data[0].lon };
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

/* =========================
   Calcular rota
   ========================= */
async function calcularRota() {
  const lista = document.getElementById("resultado");
  lista.innerHTML = "";

  if (!origemAtual) {
    origemAtual = await geocodificar(document.getElementById("origem").value);
  }

  destinosGlobais = [];
  document.querySelectorAll(".endereco").forEach(async i => {
    if (i.value.trim()) {
      destinosGlobais.push(await geocodificar(i.value.trim()));
    }
  });

  setTimeout(() => {
    const rota = ordenar(origemAtual, destinosGlobais);
    const origin = `${origemAtual.lat},${origemAtual.lon}`;
    const destination = `${rota[rota.length - 1].lat},${rota[rota.length - 1].lon}`;
    const waypoints = rota.slice(0, -1)
      .map(d => `${d.lat},${d.lon}`).join("|");

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (waypoints) url += `&waypoints=${waypoints}`;

    lista.innerHTML = `<li><a href="${url}" target="_blank">🚗 Abrir rota no Google Maps</a></li>`;
  }, 800);
}

/* =========================
   Parada atual
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
   Rotas salvas
   ========================= */
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
  listarRotas();
}

function listarRotas() {
  const div = document.getElementById("listaRotas");
  div.innerHTML = "";
  const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");

  rotas.forEach((r, i) => {
    const btn = document.createElement("button");
    btn.className = "rota-salva";
    btn.textContent = "▶ " + r.nome;
    btn.onclick = () => {
      origemAtual = r.origem;
      destinosGlobais = r.destinos;
      calcularRota();
    };
    div.appendChild(btn);
  });
}

listarRotas();
