let map, directionsService, directionsRenderer;
let waypoints = [];
let destinos = [];

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14,
        center: { lat: -30.0346, lng: -51.2177 }
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ map });
}

window.onload = () => {
    initMap();
    carregarListaRotas();
};

function usarLocalizacao() {
    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const origem = `${lat},${lng}`;
            document.getElementById("origem").value = origem;
        },
        err => alert("Erro ao obter localização"),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function adicionarDestino(valor = "") {
    const div = document.createElement("div");
    div.className = "destino";

    const input = document.createElement("input");
    input.placeholder = "Endereço do destino";
    input.value = valor;

    div.appendChild(input);
    document.getElementById("destinos").appendChild(div);
}

function criarRota() {
    destinos = [...document.querySelectorAll(".destino input")]
        .map(i => i.value)
        .filter(v => v !== "");

    waypoints = destinos.slice(0, -1).map(d => ({
        location: d,
        stopover: true
    }));

    directionsService.route({
        origin: document.getElementById("origem").value,
        destination: destinos[destinos.length - 1],
        waypoints,
        travelMode: "DRIVING"
    }, (res, status) => {
        if (status === "OK") directionsRenderer.setDirections(res);
        else alert("Erro ao criar rota");
    });
}

function adicionarParada() {
    navigator.geolocation.getCurrentPosition(pos => {
        const parada = `${pos.coords.latitude},${pos.coords.longitude}`;
        waypoints.push({ location: parada, stopover: true });
        criarRota();
    }, err => alert("Erro ao obter localização"), {
        enableHighAccuracy: true
    });
}

function salvarRota() {
    const nome = document.getElementById("nomeRota").value;
    if (!nome) return alert("Informe nome da rota");

    const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");

    rotas.push({
        nome,
        origem: document.getElementById("origem").value,
        destinos,
        waypoints
    });

    localStorage.setItem("rotas", JSON.stringify(rotas));
    carregarListaRotas();
    alert("Rota salva!");
}

function carregarListaRotas() {
    const select = document.getElementById("rotasSalvas");
    select.innerHTML = "";

    const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
    rotas.forEach((r, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = r.nome;
        select.appendChild(opt);
    });
}

function carregarRota() {
    const idx = document.getElementById("rotasSalvas").value;
    const rotas = JSON.parse(localStorage.getItem("rotas") || "[]");
    const r = rotas[idx];

    document.getElementById("origem").value = r.origem;
    document.getElementById("destinos").innerHTML = "";

    r.destinos.forEach(d => adicionarDestino(d));
    waypoints = r.waypoints;
    criarRota();
}
