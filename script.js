/* =====================================
   Rota Certa - script.js
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
   Geocodificar endereço
   ================================ */
async function geocodificar(endereco) {
  const url =
    "https://api.openrouteservice.org/geocode/search" +
    "?api_key=" + API_KEY +
    "&text=" + encodeURIComponent(endereco);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar endereço: " + endereco);
  }

  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error("Endereço não encontrado: " + endereco);
  }

  return data.features[0].geometry.coordinates; // [lon, lat]
}

/* ================================
   Calcular rota
   ================================ */
async function calcularRota() {
  const origemTexto = document.getElementById("origem").value.trim();
  const inputs = document.querySelectorAll("#enderecos input");
  const lista = document.getElementById("resultado");

  lista.innerHTML = "";

  if (origemTexto === "") {
    alert("Informe o ponto de partida");
    return;
  }

  if (inputs.length === 0) {
    alert("Gere os campos de destinos primeiro");
    return;
  }

  try {
    const coords = [];

    // Origem
    const origemCoord = await geocodificar(origemTexto);
    coords.push(origemCoord);

    // Destinos
    for (let input of inputs) {
      const valor = input.value.trim();
      if (valor !== "") {
        const coord = await geocodificar(valor);
        coords.push(coord);
      }
    }

    if (coords.length < 2) {
      alert("Informe pelo menos um destino válido");
      return;
    }

    const rotaResponse = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        method: "POST",
        headers: {
          "Authorization": API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          coordinates: coords
        })
      }
    );

    if (!rotaResponse.ok) {
      throw new Error("Erro ao calcular a rota");
    }

    const rotaData = await rotaResponse.json();

    if (
      !rotaData.features ||
      rotaData.features.length === 0 ||
      !rotaData.features[0].properties.segments ||
      rotaData.features[0].properties.segments.length === 0
    ) {
      lista.innerHTML = "<li>Rota calculada, mas sem instruções detalhadas.</li>";
      return;
    }

    const passos = rotaData.features[0].properties.segments[0].steps || [];

    if (passos.length === 0) {
      lista.innerHTML = "<li>Rota calculada com sucesso.</li>";
      return;
    }

    passos.forEach(passo => {
      const li = document.createElement("li");
      li.textContent = passo.instruction;
      lista.appendChild(li);
    });

  } catch (erro) {
    console.error(erro);
    alert(erro.message);
  }
}
