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
   LOCALIZAÇÃO
========================= */
function usarLocalizacao() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      origemAtual = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        texto: `${pos.coords.latitude},${pos.coords.longitude}`
      };
      document.getElementById("infoLocalizacao").innerText = "📍 Localização ativa";
    },
    () => alert("Erro ao obter localização"),
    { enableHighAccuracy: true }
  );
}

/* =========================
   CLIENTES
========================= */
function getClientes() {
  return JSON.parse(localStorage.getItem("clientes") || "[]");
}

/* =========================
   NORMALIZAÇÃO
========================= */
function normalizarTexto(txt) {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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
   GEO + AUTOCOMPLETE (AJUSTADO)
========================= */
async function geocodificar(txt) {
  const texto = txt.trim();

  // ✅ validação mínima (UX amigável)
  if (texto.length < 2) {
    throw new Error("Digite ao menos parte do endereço");
  }

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(texto)}`
  );

  const d = await r.json();

  if (!d.length) {
    throw new Error(
      "Endereço não encontrado.\n" +
      "Dica: inclua cidade ou estado."
    );
  }

  const res = d.find(i =>
    i.lat &&
    i.lon &&
    (
      i.address?.city ||
      i.address?.town ||
      i.address?.village ||
      i.address?.municipality
    )
  );

  if (!res) {
    throw new Error(
      "Endereço impreciso.\n" +
      "Exemplo: Centro Osório RS"
    );
  }

  return {
    texto,
    lat: +res.lat,
    lon: +res.lon
  };
}

async function buscarSugestoesEndereco(txt) {
  if (txt.length < 3) return [];

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&limit=5&countrycodes=br&q=${encodeURIComponent(txt)}`
  );

  return await r.json();
}

/* =========================
   SALVAR CLIENTES
========================= */
async function salvarClientes() {
  const clientes = getClientes();
  let salvos = 0;
  let ignorados = 0;

  for (let d of document.querySelectorAll(".destino")) {
    const nomeInput = d.querySelector(".nome");
    const enderecoInput = d.querySelector(".endereco");

    const nome = nomeInput.value.trim();
    const enderecoTxt = enderecoInput.value.trim();
    if (!enderecoTxt) continue;

    let geo;
    try {
      geo = await geocodificar(enderecoTxt);
    } catch {
      ignorados++;
      continue;
    }

    const nomeNorm = normalizarTexto(nome);

    if (
      nomeNorm &&
      clientes.some(c => normalizarTexto(c.nome || "") === nomeNorm)
    ) {
      ignorados++;
      continue;
    }

    if (clientes.some(c => mesmoLocal(c, geo))) {
      ignorados++;
      continue;
    }

    clientes.push({
      nome,
      endereco: geo.texto,
      lat: geo.lat,
      lon: geo.lon
    });

    salvos++;
  }

  localStorage.setItem("clientes", JSON.stringify(clientes));

  alert(
    `Salvamento concluído:\n` +
    `✅ Novos: ${salvos}\n` +
    `⚠️ Ignorados: ${ignorados}`
  );
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
    sel.innerHTML = `<option value="">Cliente salvo</option>`;
    clientes.forEach(c =>
      sel.innerHTML += `<option value="${c.endereco}|${c.nome || ""}">
        ${c.nome || c.endereco}
      </option>`
    );

    const end = document.createElement("input");
    end.className = "endereco";
    end.placeholder = "Endereço *";

    const lista = document.createElement("datalist");
    lista.id = `lista-${i}`;
    end.setAttribute("list", lista.id);

    end.addEventListener("input", async () => {
      lista.innerHTML = "";
      const s = await buscarSugestoesEndereco(end.value);
      s.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o.display_name;
        lista.appendChild(opt);
      });
    });

    const nome = document.createElement("input");
    nome.className = "nome";
    nome.placeholder = "Nome do cliente (opcional)";

    sel.onchange = () => {
      if (!sel.value) return;
      const [e, n] = sel.value.split("|");
      end.value = e;
      nome.value = n;
    };

    d.append(sel, end, lista, nome);
    div.appendChild(d);
  }
}

/* =========================
   ROTA
========================= */
function ordenarPorProximidade(origem, destinos) {
  return [...destinos].sort((a, b) =>
    calcularDistancia(origem.lat, origem.lon, a.lat, a.lon) -
    calcularDistancia(origem.lat, origem.lon, b.lat, b.lon)
  );
}

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
   CALCULAR ROTA
========================= */
async function calcularRota() {
  try {
    if (!origemAtual) {
      const txt = document.getElementById("origem").value.trim();
      origemAtual = await geocodificar(txt);
    }

    destinosGlobais = [];
    for (let i of document.querySelectorAll(".endereco")) {
      destinosGlobais.push(await geocodificar(i.value));
    }

    rotaOrdenada = ordenarPorProximidade(origemAtual, destinosGlobais);
    gerarLink();
  } catch (e) {
    alert(e.message);
  }
}

/* =========================
   GERAR LINK
========================= */
function gerarLink() {
  if (!rotaOrdenada.length) return;

  if (isIOS()) {
    const pontos = [origemAtual.texto, ...rotaOrdenada.map(r => r.texto)].join("+to:");
    linkAtual = `https://maps.apple.com/?daddr=${encodeURIComponent(pontos)}`;
  } else {
    const o = encodeURIComponent(origemAtual.texto);
    const d = encodeURIComponent(rotaOrdenada.at(-1).texto);
    const w = rotaOrdenada.slice(0, -1).map(r => encodeURIComponent(r.texto)).join("|");
    linkAtual =
      `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}` +
      (w ? `&waypoints=${w}` : "");
  }

  document.getElementById("resultado").innerHTML =
    `<li><a href="${linkAtual}" target="_blank">🚗 Abrir rota otimizada</a></li>`;
}
