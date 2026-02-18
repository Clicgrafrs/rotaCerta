let rotasSalvas = JSON.parse(localStorage.getItem("rotas")) || [];
let rotaAtiva = null;
let localAtual = null;

function usarLocalizacao() {
  navigator.geolocation.getCurrentPosition(pos => {
    localAtual = `${pos.coords.latitude},${pos.coords.longitude}`;
    document.getElementById("origem").value = localAtual;
    document.getElementById("infoLocalizacao").innerText = "Localização capturada com sucesso.";
  });
}

function gerarCampos() {
  const qtd = document.getElementById("qtd").value;
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  for (let i = 0; i < qtd; i++) {
    div.innerHTML += `
      <div class="destino">
        <input type="text" placeholder="Destino ${i + 1}">
      </div>`;
  }
}

function calcularRota() {
  const origem = document.getElementById("origem").value;
  const destinos = [...document.querySelectorAll("#enderecos input")]
    .map(i => i.value)
    .filter(v => v !== "");

  if (!origem || destinos.length === 0) {
    alert("Preencha origem e destinos.");
    return;
  }

  rotaAtiva = { origem, destinos };

  abrirRota(rotaAtiva);
}

function abrirRota(rota) {
  const waypoints = rota.destinos.slice(0, -1).join("|");
  const destinoFinal = rota.destinos[rota.destinos.length - 1];

  const link = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    rota.origem
  )}&destination=${encodeURIComponent(destinoFinal)}&waypoints=${encodeURIComponent(waypoints)}`;

  rota.link = link;
  window.open(link, "_blank");
}

function salvarRota() {
  if (!rotaAtiva) {
    alert("Nenhuma rota ativa.");
    return;
  }

  const nome = prompt("Nome da rota:");
  if (!nome) return;

  rotasSalvas.push({ nome, ...rotaAtiva });
  localStorage.setItem("rotas", JSON.stringify(rotasSalvas));
  atualizarDropdown();
}

function atualizarDropdown() {
  const select = document.getElementById("rotasDropdown");
  select.innerHTML = `<option value="">Selecione uma rota</option>`;

  rotasSalvas.forEach((r, i) => {
    select.innerHTML += `<option value="${i}">${r.nome}</option>`;
  });
}

function abrirRotaSelecionada() {
  const index = document.getElementById("rotasDropdown").value;
  if (index === "") return;

  rotaAtiva = rotasSalvas[index];
  abrirRota(rotaAtiva);
}

function excluirRota() {
  const index = document.getElementById("rotasDropdown").value;
  if (index === "") return;

  if (confirm("Deseja excluir esta rota?")) {
    rotasSalvas.splice(index, 1);
    localStorage.setItem("rotas", JSON.stringify(rotasSalvas));
    atualizarDropdown();
  }
}

function adicionarParada() {
  if (!rotaAtiva) {
    alert("Abra ou gere uma rota primeiro.");
    return;
  }

  const nova = document.getElementById("novaParada").value;
  if (!nova) {
    alert("Digite o novo destino.");
    return;
  }

  if (localAtual) {
    rotaAtiva.origem = localAtual;
  }

  rotaAtiva.destinos.push(nova);
  document.getElementById("novaParada").value = "";

  abrirRota(rotaAtiva);
}

atualizarDropdown();
