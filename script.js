/* =====================================
   Rota Certa - script.js (versão limpa)
   ===================================== */

const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY2ZTQyNDAxM2IxNTQxMmRiYmQ3M2E5NGVkYzNhNzk2IiwiaCI6Im11cm11cjY0In0=";

console.log("script.js carregado com sucesso");

/* ================================
   Gera campos de endereços
   ================================ */
function gerarCampos() {
  var qtd = document.getElementById("qtd").value;
  var div = document.getElementById("enderecos");

  div.innerHTML = "";
  qtd = parseInt(qtd, 10);

  if (isNaN(qtd) || qtd < 1 || qtd > 50) {
    alert("Informe um número entre 1 e 50");
    return;
  }

  for (var i = 1; i <= qtd; i++) {
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Endereço " + i;
    input.style.display = "block";
    input.style.marginBottom = "6px";
    div.appendChild(input);
  }
}

/* ================================
   Geocodificação
   ================================ */
async function geocodificar(endereco) {
  var url =
    "https://api.openrouteservice.org/geocode/search" +
    "?api_key=" + API_KEY +
    "&text=" + encodeURIComponent(endereco);

  var response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao geocodificar: " + endereco);
  }

  var data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error("Endereço não encontrado: " + endereco);
  }

  return data.features[0].geometry.coordinates;
}

/* ================================
   Calcula rota
   ================================ */
async function calcularRota() {
  var inputs = document.querySelectorAll("#enderecos input");
  var coords = [];

  if (inputs.length === 0) {
    alert("Crie os campos antes de calcular a rota");
    return;
  }

  try {
    for (var i = 0; i < inputs.length; i++) {
      var valor = inputs[i].value.trim();
      if (valor !== "") {
        var coord = await geocodificar(valor);
        coords.push(coord);
      }
    }

    if (coords.length < 2) {
      alert("Informe pelo menos dois endereços válidos");
      return;
    }

    var rotaResponse = await fetch(
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

    var rotaData = await rotaResponse.json();

    var lista = document.getElementById("resultado");
    lista.innerHTML = "";

    var passos = rotaData.features[0].properties.segments[0].steps;

    for (var j = 0; j < passos.length; j++) {
      var li = document.createElement("li");
      li.textContent = passos[j].instruction;
      lista.appendChild(li);
    }

  } catch (erro) {
    console.error(erro);
    alert(erro.message);
  }
}
