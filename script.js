/* =====================================
   Rota Certa - script.js (FINAL + OTIMIZAÇÃO)
   ===================================== */

console.log("script.js carregado com sucesso");

/* ================================
   Gerar campos de destinos
   ================================ */
function gerarCampos() {
  const qtd = parseInt(document.getElementById("qtd").value, 10);
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  if (isNaN(qtd) || qtd < 1 || qtd > 10) {
    alert("Informe um número entre 1 e 10");
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
   Geocodificação (OpenStreetMap – grátis)
   ================================ */
async function geocodificar(endereco) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&q=" +
              encodeURIComponent(endereco);

  const response = await fetch(url);
  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error("Endereço não encontrado: " + endereco);
  }

  return {
    texto: endereco,
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon)
  };
}

/* ================================
   Distância (Haversine)
   ================================ */
function distancia(p1, p2) {
  const R = 6371;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lon - p1.lon) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) *
    Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ================================
   Ordenar destinos (mais próximo)
   ================================ */
function ordenarPorProximidade(origem, destinos) {
  const rota = [];
  let atual = origem;
  let restantes = [...destinos];

  while (restantes.length > 0) {
    let maisProximoIndex = 0;
    let menorDistancia = distancia(atual, restantes[0]);

    for (let i = 1; i < restantes.length; i++) {
      const d = distancia(atual, restantes[i]);
      if (d < menorDistancia) {
        menorDistancia = d;
        maisProximoIndex = i;
      }
    }

    const proximo = restantes.splice(maisProximoIndex, 1)[0];
    rota.push(proximo);
    atual = proximo;
  }

  return rota;
}

/* ================================
   Calcular rota otimizada
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
    const origem = await geocodificar(origemTexto);
    const destinos = [];

    for (let input of inputs) {
      if (input.value.trim()) {
        destinos.push(await geocodificar(input.value.trim()));
      }
    }

    if (destinos.length === 0) {
      alert("Informe pelo menos um destino");
      return;
    }

    const rotaOrdenada = ordenarPorProximidade(origem, destinos);

    /* 🚨 Limite Google Maps */
    if (rotaOrdenada.length > 9) {
      alert("Google Maps aceita no máximo 9 paradas");
      return;
    }

    /* =========================
       Gerar link do Google Maps
       ========================= */
    const origin = encodeURIComponent(origem.texto);
    const destination = encodeURIComponent(
      rotaOrdenada[rotaOrdenada.length - 1].texto
    );

    let url =
      "https://www.google.com/maps/dir/?api=1" +
      "&origin=" + origin +
      "&destination=" + destination +
      "&travelmode=driving";

    if (rotaOrdenada.length > 1) {
      const waypoints = rotaOrdenada
        .slice(0, rotaOrdenada.length - 1)
        .map(d => encodeURIComponent(d.texto))
        .join("|");

      url += "&waypoints=" + waypoints;
    }

    /* =========================
       Exibir resultado
       ========================= */
    const li = document.createElement("li");
    li.innerHTML = `<a href="${url}" target="_blank">🚗 Abrir rota otimizada no Google Maps</a>`;
    lista.appendChild(li);

  } catch (erro) {
    console.error(erro);
    alert(erro.message);
  }
}
