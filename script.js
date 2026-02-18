let map, directionsService, directionsRenderer;
let destinosCount = 0;

init();

function init() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14,
        center: { lat: -30.0346, lng: -51.2177 }
    });

    directionsRenderer.setMap(map);
    carregarListaRotas();
}

/* 📍 LOCALIZAÇÃO PRECISA */
function usarLocalizacao() {
    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            new google.maps.Geocoder().geocode(
                { location: { lat, lng } },
                (res, status) => {
                    if (status === "OK") {
                        document.getElementById("origem").value = res[0].formatted_address;
                    }
                }
            );
        },
        err => alert("Erro ao obter localização"),
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

/* ➕ ADICIONAR DESTINO */
function addDestino(valor = "", nome = "") {
    destinosCount++;

    const div = document.createElement("div");
    div.className = "destino";
    div.innerHTML = `
        <input placeholder="Endereço do cliente" value="${valor}">
        <input placeholder="Nome do cliente (opcional)" value="${nome}">
    `;
    document.getElementById("destinos").appendChild(div);
}

/* 🧭 CRIAR ROTA */
function criarRota() {
    const origem = document.getElementById("origem").value;
    if (!origem) return alert("Informe a origem");

    const inputs = document.querySelectorAll(".destino");
    const waypoints = [];

    inputs.forEach(d => {
        const endereco = d.children[0].value;
        if (endereco) {
            waypoints.push({ location: endereco, stopover: true });
        }
    });

    if (waypoints.length === 0) return alert("Adicione destinos");

    directionsService.route({
        origin: origem,
        destination: waypoints[waypoints.length - 1].location,
        waypoints: waypoints.slice(0, -1),
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true
    }, (result, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(result);
        } else {
            alert("Erro ao criar rota");
        }
    });
}

/* 💾 SALVAR ROTA */
function salvarRota() {
    const nome = document.getElementById("nomeRota").value;
    if (!nome) return alert("Dê um nome à rota");

    const origem = document.getElementById("origem").value;
    const destinos = [];

    document.querySelectorAll(".destino").forEach(d => {
        destinos.push({
            endereco: d.children[0].value,
            nome: d.children[1].value
        });
    });

    let rotas = JSON.parse(localStorage.getItem("rotas")) || [];
    rotas.push({ nome, origem, destinos });

    localStorage.setItem("rotas", JSON.stringify(rotas));
    carregarListaRotas();
    alert("Rota salva!");
}

/* 📂 LISTAR ROTAS */
function carregarListaRotas() {
    const select = document.getElementById("rotasSalvas");
    select.innerHTML = `<option value="">Selecione uma rota</option>`;

    const rotas = JSON.parse(localStorage.getItem("rotas")) || [];
    rotas.forEach((r, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = r.nome;
        select.appendChild(opt);
    });
}

/* 🔁 CARREGAR ROTA */
function carregarRota() {
    const idx = document.getElementById("rotasSalvas").value;
    if (idx === "") return;

    const rotas = JSON.parse(localStorage.getItem("rotas"));
    const rota = rotas[idx];

    document.getElementById("origem").value = rota.origem;
    document.getElementById("destinos").innerHTML = "";
    destinosCount = 0;

    rota.destinos.forEach(d => addDestino(d.endereco, d.nome));
}
