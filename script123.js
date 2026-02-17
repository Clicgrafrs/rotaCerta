async function calcularRota() {
    const origem = document.getElementById("origem").value.trim();
    const destino = document.getElementById("destino").value.trim();
    const resultado = document.getElementById("resultado");

    resultado.innerHTML = "Calculando rota...";

    if (!origem || !destino) {
        resultado.innerHTML = "⚠️ Preencha origem e destino.";
        return;
    }

    const apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY2ZTQyNDAxM2IxNTQxMmRiYmQ3M2E5NGVkYzNhNzk2IiwiaCI6Im11cm11cjY0In0=";

    const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${encodeURIComponent(origem)}&end=${encodeURIComponent(destino)}`;

    try {
        const response = await fetch(url, {
            headers: {
                "Authorization": apiKey,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Erro na requisição da API");
        }

        const data = await response.json();

        console.log("Resposta da API:", data);

        // 🔒 VALIDAÇÃO TOTAL DA RESPOSTA
        if (
            !data ||
            !data.features ||
            data.features.length === 0 ||
            !data.features[0].properties ||
            !data.features[0].properties.summary
        ) {
            resultado.innerHTML = "❌ Não foi possível calcular a rota.";
            return;
        }

        const resumo = data.features[0].properties.summary;
        const distanciaKm = (resumo.distance / 1000).toFixed(2);
        const tempoMin = (resumo.duration / 60).toFixed(0);

        resultado.innerHTML = `
            <strong>Distância:</strong> ${distanciaKm} km<br>
            <strong>Tempo estimado:</strong> ${tempoMin} minutos
        `;

    } catch (error) {
        console.error(error);
        resultado.innerHTML = "❌ Erro ao calcular rota. Verifique os endereços.";
    }
}
