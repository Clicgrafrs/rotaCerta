const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY2ZTQyNDAxM2IxNTQxMmRiYmQ3M2E5NGVkYzNhNzk2IiwiaCI6Im11cm11cjY0In0=;

function gerarCampos() {
  const qtd = document.getElementById("qtd").value;
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  for (let i = 0; i < qtd; i++) {
    const input = document.createElement("input");
    input.placeholder = `Endereço ${i + 1}`;
    div.appendChild(input);
  }
}

async function geocodificar(endereco) {
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${API_KEY}&text=${encodeURIComponent(endereco)}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.features[0].geometry.coordinates;
}

async function calcularRota() {
  const inputs = document.querySelectorAll("#enderecos input");
  const coords = [];

  for (let input of inputs) {
    if (input.value.trim() === "") continue;
    const c = await geocodificar(input.value);
    coords.push(c);
  }

  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
    method: "POST",
    headers: {
      "Authorization": API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ coordinates: coords })
  });

  const data = await res.json();
  const lista = document.getElementById("resultado");
  lista.innerHTML = "";

  data.features[0].properties.segments[0].steps.forEach(step => {
    const li = document.createElement("li");
    li.textContent = step.instruction;
    lista.appendChild(li);
  });
}
