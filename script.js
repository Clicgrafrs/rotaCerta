let rotas = JSON.parse(localStorage.getItem("rotas")) || [];

window.onload = () => {
  atualizarDropdown();
};

function gerarCampos() {
  const qtd = document.getElementById("qtd").value;
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  for (let i = 0; i < qtd; i++) {
    div.innerHTML += `
      <div class="destino">
        <input type="text" class="destinoInput" placeholder="Destino ${i + 1}">
      </div>
    `;
  }
}

function usarLocalizacao() {
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById("origem").value =
      `${pos.coords.latitude}, ${pos.coords.longitude}`;
  });
}

function calcularRota() {
  const origem = document.getElementById("origem").value.trim();
  if (!origem) return alert("Informe o ponto de partida.");

  const destinos = [...document.querySelectorAll(".destinoInput")]
    .map(d => d.value.trim())
    .filter(d => d);

  if (destinos.length === 0)
    return alert("Informe ao menos um destino.");

  mostrarRoteiro(origem, destinos);
}

function mostrarRoteiro(origem, destinos) {
  const ol = document.getElementById("resultado");
  ol.innerHTML = "";

  destinos.forEach(d => {
    ol.innerHTML += `<li>${d}</li>`;
  });

  const link = gerarLink(origem, destinos);
  ol.innerHTML += `<li><a href="${link}" target="_blank">🚗 Abrir no Google Maps</a></li>`;
}

function gerarLink(origem, destinos) {
  return `https://www.google.com/maps/dir/${[origem, ...destinos].join("/")}`;
}

function adicionarParada() {
  const nova = document.getElementById("novaParada").value.trim();
  if (!nova) return alert("Digite o endereço da nova parada.");

  const div = document.getElementById("enderecos");
  div.innerHTML += `
    <div class="destino">
      <input type="text" class="destinoInput" value="${nova}">
    </div>
  `;

  document.getElementById("novaParada").value = "";
  calcularRota();
}

function salvarRota() {
  const nome = prompt("Nome da rota:");
  if (!nome) return;

  const origem = document.getElementById("origem").value.trim();
  const destinos = [...document.querySelectorAll(".destinoInput")]
    .map(d => d.value.trim())
    .filter(d => d);

  if (!origem || destinos.length === 0)
    return alert("Rota incompleta.");

  rotas.push({ nome, origem, destinos });
  localStorage.setItem("rotas", JSON.stringify(rotas));
  atualizarDropdown();

  alert("Rota salva com sucesso!");
}

function atualizarDropdown() {
  const select = document.getElementById("rotasSelect");
  select.innerHTML = `<option value="">Selecione uma rota salva</option>`;

  rotas.forEach((r, i) => {
    select.innerHTML += `<option value="${i}">${r.nome}</option>`;
  });
}

function abrirRotaSelecionada() {
  const idx = document.getElementById("rotasSelect").value;
  if (idx === "") return alert("Selecione uma rota.");

  const rota = rotas[idx];

  document.getElementById("origem").value = rota.origem;
  document.getElementById("qtd").value = rota.destinos.length;
  gerarCampos();

  document.querySelectorAll(".destinoInput").forEach((el, i) => {
    el.value = rota.destinos[i];
  });

  calcularRota();
}

function excluirRotaSelecionada() {
  const idx = document.getElementById("rotasSelect").value;
  if (idx === "") return;

  if (!confirm("Excluir esta rota?")) return;

  rotas.splice(idx, 1);
  localStorage.setItem("rotas", JSON.stringify(rotas));
  atualizarDropdown();
}
