let rotaAtual = null;
let origemAtual = null;

function gerarCampos() {
  const qtd = document.getElementById("qtd").value;
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  for (let i = 0; i < qtd; i++) {
    const input = document.createElement("input");
    input.placeholder = `Destino ${i + 1}`;
    input.className = "destino";
    div.appendChild(input);
  }
}

function usarLocalizacao() {
  if (!navigator.geolocation) {
    alert("Geolocalização não suportada.");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    origemAtual = `${pos.coords.latitude},${pos.coords.longitude}`;
    document.getElementById("origem").value = origemAtual;
    document.getElementById("infoLocalizacao").innerText = "Localização detectada com sucesso.";
  }, () => {
    alert("Erro ao obter localização.");
  });
}

function calcularRota() {
  const origem = document.getElementById("origem").value;
  const destinos = [...document.querySelectorAll(".destino")]
    .map(i => i.value)
    .filter(v => v !== "");

  if (!origem || destinos.length === 0) {
    alert("Informe origem e destinos.");
    return;
  }

  origemAtual = origem;
  rotaAtual = destinos;

  abrirMaps(origemAtual, rotaAtual);
}

function abrirMaps(origem, destinos) {
  const waypoints = destinos.slice(0, -1).join("|");
  const destinoFinal = destinos[destinos.length - 1];

  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destinoFinal)}`;

  if (waypoints) {
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }

  window.open(url, "_blank");
}

function salvarRota() {
  if (!rotaAtual || !origemAtual) {
    alert("Nenhuma rota ativa para salvar.");
    return;
  }

  const nome = prompt("Nome da rota:");
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas")) || {};
  rotas[nome] = { origem: origemAtual, destinos: rotaAtual };

  localStorage.setItem("rotas", JSON.stringify(rotas));
  atualizarDropdown();
}

function atualizarDropdown() {
  const select = document.getElementById("rotasSalvas");
  select.innerHTML = `<option value="">Selecione uma rota</option>`;

  const rotas = JSON.parse(localStorage.getItem("rotas")) || {};
  Object.keys(rotas).forEach(nome => {
    const opt = document.createElement("option");
    opt.value = nome;
    opt.textContent = nome;
    select.appendChild(opt);
  });
}

function abrirRotaSalva() {
  const nome = document.getElementById("rotasSalvas").value;
  if (!nome) return;

  const rotas = JSON.parse(localStorage.getItem("rotas"));
  const rota = rotas[nome];

  origemAtual = rota.origem;
  rotaAtual = rota.destinos;

  abrirMaps(origemAtual, rotaAtual);
}

function excluirRota() {
  const select = document.getElementById("rotasSalvas");
  const nome = select.value;
  if (!nome) return;

  if (!confirm("Excluir esta rota?")) return;

  const rotas = JSON.parse(localStorage.getItem("rotas"));
  delete rotas[nome];
  localStorage.setItem("rotas", JSON.stringify(rotas));

  atualizarDropdown();
}

function adicionarParada() {
  if (!rotaAtual) {
    alert("Nenhuma rota ativa.");
    return;
  }

  const nova = document.getElementById("novaParada").value;
  if (!nova) {
    alert("Digite o novo destino.");
    return;
  }

  if (!navigator.geolocation) {
    alert("Geolocalização não suportada.");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    origemAtual = `${pos.coords.latitude},${pos.coords.longitude}`;
    rotaAtual.push(nova);

    abrirMaps(origemAtual, rotaAtual);
    document.getElementById("novaParada").value = "";
  }, () => {
    alert("Erro ao obter localização atual.");
  });
}

atualizarDropdown();
