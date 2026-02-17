/* =====================================
   Rota Certa - script.js (VERSÃO FINAL)
   ===================================== */

const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY2ZTQyNDAxM2IxNTQxMmRiYmQ3M2E5NGVkYzNhNzk2IiwiaCI6Im11cm11cjY0In0=";

console.log("script.js carregado com sucesso");

/* ================================
   Gerar campos de destinos
   ================================ */
function gerarCampos() {
  const qtd = parseInt(document.getElementById("qtd").value, 10);
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  if (isNaN(qtd) || qtd < 1 || qtd > 50) {
    alert("Informe um número válido entre 1 e 50");
    return;
  }

  for (let i = 1; i <= qtd; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Destino " + i;
    div.appendChild(input);
  }
}

/* ================================
   Geocodificação
   ================================ */
async function geocodificar(endereco) {
  const url =
    "https://api.openrouteservice.org/geocode/search" +
    "?api_key=" + API_KEY +
    "&text=" + encodeURIComponent(endereco);

  const response = await fetch(url);
  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error("Endereço não encontrado: " + endereco);
  }

  return data.features[0].geometry.coordinates; // [lon, lat]
}

/* ================================
   Calcular rota + gerar link Maps
   ================================ */
async function calcularRota() {
  const origemTexto = document.getElementById("origem").value.trim();
  const inputs = document.querySelectorAll("#enderecos input");
  const lista = document.getElementById("resultado");

  lista.innerHTML = "";

  if (!origemTexto) {
    alert("Informe o ponto de partida");
    return;
  }

  try {
    const destinosTexto = [];

    for (let input of inputs) {
      const v = input.value.trim();
      if (v) destinosTexto.push(v);
    }

    if (destinosTexto.length === 0) {
      alert("Informe pelo menos um destino");
      return;
    }

    /* 🚨 Limite real do Google Maps */
    if (destinosTexto.length > 9) {
      alert("O Google Maps aceita no máximo 9 paradas. Use até 9 destinos.");
      return;
    }

    /* =========================
       Gera link do Google Maps
       ========================= */
    const origin = encodeURIComponent(origemTexto);
    const destination = encodeURIComponent(destinosTexto[destinosTexto.length - 1]);

    let urlMaps =
      "https://www.google.com/maps/dir/?api=1" +
      "&origin=" + origin +
      "&destination=" + destination +
      "&travelmode=driving";

    if (destinosTexto.length > 1) {
      const waypoints = destinosTexto
        .slice(0, destinosTexto.length - 1)
        .map(d => encodeURIComponent(d))
        .join("|");

      urlMaps += "&waypoints=" + waypoints;
    }

    /* =========================
       Exibe resultado
       ========================= */
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="${urlMaps}" target="_blank">
        👉 Abrir rota no Google Maps
      </a>
    `;
    lista.appendChild(li);

  } catch (erro) {
    console.error(erro);
    alert(erro.message);
  }
}
