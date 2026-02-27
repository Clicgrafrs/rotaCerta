console.log("Rota Fácil PRO carregado");

let origemAtual = null;
let destinosGlobais = [];
let rotaOrdenada = [];
let linkAtual = null;

/* =========================
   ERRO VISUAL
========================= */
function marcarErro(el) {
  el.classList.add("erro");
  el.focus();
}

function limparErro(el) {
  el.classList.remove("erro");
}

/* =========================
   DETECTAR iOS
========================= */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/* =========================
   LOCALIZAÇÃO (PRECISA)
========================= */
function usarLocalizacao() {
  if (!navigator.geolocation) {
    alert("Geolocalização não suportada");
    return;
  }

  const info = document.getElementById("infoLocalizacao");
  info.innerText = "📡 Obtendo localização...";

  let melhor = null;
  let finalizado = false;

  function finalizar(pos) {
    if (finalizado) return;
    finalizado = true;

    origemAtual = {
      lat: pos.latitude,
      lon: pos.longitude,
      texto: `${pos.latitude},${pos.longitude}`
    };

    info.innerText =
      `📍 Localização definida (${Math.round(pos.accuracy)}m)`;
  }

  // 1️⃣ Tentativa rápida
  navigator.geolocation.getCurrentPosition(
    pos => {
      melhor = pos.coords;
      finalizar(pos.coords);
    },
    () => {},
    {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 60000
    }
  );

  // 2️⃣ Refinamento por GPS
  const watchId = navigator.geolocation.watchPosition(
    pos => {
      if (!melhor || pos.coords.accuracy < melhor.accuracy) {
        melhor = pos.coords;
      }

      if (pos.coords.accuracy <= 40) {
        finalizar(pos.coords);
        navigator.geolocation.clearWatch(watchId);
      }
    },
    () => {
      if (melhor) finalizar(melhor);
      navigator.geolocation.clearWatch(watchId);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );

  // 3️⃣ Fallback final (não trava o usuário)
  setTimeout(() => {
    if (!finalizado && melhor) {
      finalizar(melhor);
      navigator.geolocation.clearWatch(watchId);
    }
  }, 6000);
}

/* =========================
   CLIENTES (STORAGE)
========================= */
function getClientes() {
  return JSON.parse(localStorage.getItem("clientes") || "[]");
}

function salvarClientesStorage(clientes) {
  localStorage.setItem("clientes", JSON.stringify(clientes));
}

/* =========================
   NORMALIZAÇÃO
========================= */
function normalizarCoordenada(v, casas = 5) {
  return Number(v).toFixed(casas);
}

function mesmoLocal(a, b) {
  return (
    normalizarCoordenada(a.lat) === normalizarCoordenada(b.lat) &&
    normalizarCoordenada(a.lon) === normalizarCoordenada(b.lon)
  );
}

/* =========================
   GEOCODIFICAÇÃO
========================= */
async function geocodificar(txt) {
  const texto = txt.trim();
  if (texto.length < 2) {
    throw new Error("Digite ao menos parte do endereço");
  }

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&addressdetails=1&limit=8&countrycodes=br&q=${encodeURIComponent(texto)}`
  );

  const d = await r.json();
  if (!d.length) {
    throw new Error(
      "Endereço não encontrado.\nInclua cidade ou estado."
    );
  }

  const res =
    // 1️⃣ Endereço bem definido
    d.find(i =>
      (i.address?.road || i.address?.neighbourhood || i.address?.suburb) &&
      (i.address?.city || i.address?.town || i.address?.village) &&
      i.address?.state
    ) ||

    // 2️⃣ Local conhecido
    d.find(i =>
      i.type === "amenity" &&
      i.address?.state
    ) ||

    // 3️⃣ Cidade + estado
    d.find(i =>
      (i.address?.city || i.address?.town || i.address?.village) &&
      i.address?.state
    ) ||

    // 4️⃣ Melhor resultado disponível
    d[0];

  if (!res?.lat || !res?.lon) {
    throw new Error("Endereço impreciso");
  }

  return {
    texto: res.display_name,
    lat: +res.lat,
    lon: +res.lon
  };
}
/* =========================
   SALVAR CLIENTES
========================= */
async function salvarClientes() {
  const clientes = getClientes();
  let salvos = 0;

  for (let d of document.querySelectorAll(".destino")) {
    const nome = d.querySelector(".nome").value.trim();
    const enderecoTxt = d.querySelector(".endereco").value.trim();
    if (!enderecoTxt) continue;

    let geo;
    try {
      geo = await geocodificar(enderecoTxt);
    } catch {
      continue;
    }

    if (clientes.some(c => mesmoLocal(c, geo))) continue;

    clientes.push({
      nome,
      endereco: geo.texto,
      lat: geo.lat,
      lon: geo.lon
    });

    salvos++;
  }

  salvarClientesStorage(clientes);
  listarClientesSelect();
  alert(`✅ ${salvos} cliente(s) salvos com sucesso`);
}

/* =========================
   LISTAR CLIENTES
========================= */
function listarClientesSelect() {
  const sel = document.getElementById("clientesSelect");
  if (!sel) return;

  const clientes = getClientes();
  sel.innerHTML = `<option value="">Selecione um cliente</option>`;

  clientes.forEach((c, i) => {
    sel.innerHTML += `
      <option value="${i}">
        ${c.nome || c.endereco}
      </option>`;
  });
}

/* =========================
   GERAR CAMPOS
========================= */
function gerarCampos() {
  const qtd = +document.getElementById("qtd").value;
  const div = document.getElementById("enderecos");
  div.innerHTML = "";

  const clientes = getClientes();

  for (let i = 0; i < qtd; i++) {
    const d = document.createElement("div");
    d.className = "destino";

    const sel = document.createElement("select");
    sel.innerHTML = `<option value="">Buscar endereço salvo</option>`;

    clientes.forEach((c, idx) => {
      sel.innerHTML += `<option value="${idx}">
        ${c.nome || c.endereco}
      </option>`;
    });

    const end = document.createElement("input");
    end.className = "endereco";
    end.placeholder = "Endereço *";

    const nome = document.createElement("input");
    nome.className = "nome";
    nome.placeholder = "Nome do cliente (opcional)";

    sel.onchange = () => {
      if (!sel.value) return;
      const c = clientes[sel.value];
      end.value = c.endereco;
      nome.value = c.nome || "";
    };

    d.append(sel, end, nome);
    div.appendChild(d);
  }
}

/* =========================
   DISTÂNCIA (HAVERSINE)
========================= */
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =========================
   OTIMIZAR ROTA
========================= */
function otimizarRota(origem, destinos) {
  const restantes = [...destinos];
  const rota = [];
  let atual = origem;

  while (restantes.length) {
    let menor = Infinity;
    let idx = 0;

    restantes.forEach((d, i) => {
      const dist = calcularDistancia(
        atual.lat, atual.lon,
        d.lat, d.lon
      );
      if (dist < menor) {
        menor = dist;
        idx = i;
      }
    });

    atual = restantes.splice(idx, 1)[0];
    rota.push(atual);
  }

  return rota;
}

/* =========================
   CALCULAR ROTA
========================= */
async function calcularRota() {
  try {
    if (!origemAtual) {
      origemAtual = await geocodificar(
        document.getElementById("origem").value.trim()
      );
    }

    destinosGlobais = [];
    for (let i of document.querySelectorAll(".endereco")) {
      destinosGlobais.push(await geocodificar(i.value));
    }

    rotaOrdenada = otimizarRota(origemAtual, destinosGlobais);
    gerarLink();

    document.getElementById("resultado").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  } catch (e) {
    alert(e.message);
  }
}

/* =========================
   ADICIONAR DESTINO
========================= */
async function adicionarDestino() {
  if (!origemAtual || !destinosGlobais.length) {
    alert("Calcule uma rota antes");
    return;
  }

  const input = document.getElementById("novaParada");
  const txt = input.value.trim();
  if (!txt) return;

  let novo;
  try {
    novo = await geocodificar(txt);
  } catch (e) {
    alert(e.message);
    return;
  }

  // Evita duplicados
  if (destinosGlobais.some(d => mesmoLocal(d, novo))) {
    alert("Este destino já está na rota");
    return;
  }

  destinosGlobais.push(novo);

  // 🔁 Recalcula tudo corretamente
  rotaOrdenada = otimizarRota(origemAtual, destinosGlobais);
  gerarLink();

  input.value = "";
}

/* =========================
   GERAR LINK
========================= */
function gerarLink() {
  if (!rotaOrdenada.length) return;

  if (isIOS()) {
    const pontos = [
      origemAtual.texto,
      ...rotaOrdenada.map(r => r.texto)
    ].join("+to:");

    linkAtual = `https://maps.apple.com/?daddr=${encodeURIComponent(pontos)}`;
  } else {
    const o = encodeURIComponent(origemAtual.texto);
    const d = encodeURIComponent(rotaOrdenada.at(-1).texto);
    const w = rotaOrdenada
      .slice(0, -1)
      .map(r => encodeURIComponent(r.texto))
      .join("|");

    linkAtual =
      `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}` +
      (w ? `&waypoints=${w}` : "");
  }

  document.getElementById("resultado").innerHTML =
    `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota otimizada</a></li>`;
}

/* =========================
   INIT
========================= */
listarClientesSelect();
listarRotas();
