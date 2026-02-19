let rotaAtiva = null;
let origemAtual = "";

function gerarCampos() {
  const qtd = document.getElementById("qtd").value;
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  for (let i = 1; i <= qtd; i++) {
    const input = document.createElement("input");
    input.placeholder = `Destino ${i}`;
    input.className = "destino";
    div.appendChild(input);
  }
}

function usarLocalizacao() {
  if (!navigator.geolocation) {
    alert("Geolocalização não suportada");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    origemAtual = `${pos.coords.latitude},${pos.coords.longitude}`;
    document.getElementById("origem").value = "Minha localização atual";
    document.getElementById("infoLocalizacao").innerText =
      `Lat: ${pos.coords.latitude.toFixed(5)} | Lng: ${pos.coords.longitude.toFixed(5)}`;
  });
}

function calcularRota() {
  const origemInput = document.getElementById("origem").value;
  const destinosInputs = document.querySelectorAll(".destino");

  const destinos = [];
  destinosInputs.forEach(d => {
    if (d.value.trim()) destinos.push(d.value.trim());
  });

  if (!origemInput || destinos.length === 0) {
    alert("Informe origem e ao menos um destino");
    return;
  }

  const origemFinal = origemAtual || origemInput;

  rotaAtiva = {
    origem: origemFinal,
    destinos: [...destinos]
  };

  abrirNoMaps(rotaAtiva.origem, rotaAtiva.destinos);
}

function abrirNoMaps(origem, destinos) {
  const base = "https://www.google.com/maps/dir/?api=1";
  const waypoints = destinos.slice(0, -1).join("|");
  const destinoFinal = destinos[destinos.length - 1];

  let url = `${base}&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destinoFinal)}`;

  if (waypoints) {
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }

  window.open(url, "_blank");
}

function adicionarParada() {
  if (!rotaAtiva) {
    alert("Nenhuma rota ativa. Gere ou abra uma rota primeiro.");
    return;
  }

  const nova = document.getElementById("novaParada").value.trim();
  if (!nova) {
    alert("Digite o endereço da nova parada");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    origemAtual = `${pos.coords.latitude},${pos.coords.longitude}`;

    rotaAtiva.origem = origemAtual;
    rotaAtiva.destinos.push(nova);

    abrirNoMaps(rotaAtiva.origem, rotaAtiva.destinos);
    document.getElementById("novaParada").value = "";
  });
}

function salvarRota() {
  if (!rotaAtiva) {
    alert("Nenhuma rota para salvar");
    return;
  }

  const nome = prompt("Nome da rota:");
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "{}");
  rotas[nome] = rotaAtiva;

  localStorage.setItem("rotas", JSON.stringify(rotas));
  carregarRotas();
}

function carregarRotas() {
  const select = document.getElementById("rotasSalvas");
  select.innerHTML = '<option value="">Selecione uma rota</option>';

  const rotas = JSON.parse(localStorage.getItem("rotas") || "{}");

  Object.keys(rotas).forEach(nome => {
    const opt = document.createElement("option");
    opt.value = nome;
    opt.textContent = nome;
    select.appendChild(opt);
  });
}

function abrirRotaSelecionada() {
  const nome = document.getElementById("rotasSalvas").value;
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas") || "{}");
  rotaAtiva = rotas[nome];

  abrirNoMaps(rotaAtiva.origem, rotaAtiva.destinos);
}

function excluirRota() {
  const select = document.getElementById("rotasSalvas");
  const nome = select.value;

  if (!nome) {
    alert("Selecione uma rota");
    return;
  }

  const rotas = JSON.parse(localStorage.getItem("rotas") || "{}");
  delete rotas[nome];

  localStorage.setItem("rotas", JSON.stringify(rotas));
  carregarRotas();
}

carregarRotas();
