const API = "http://localhost:3000";

let usuarioLogado = null;
let eventos = [];

const $ = (id) => document.getElementById(id);

function mostrarMensagem(id, texto, tipo = "") {
    const elemento = $(id);
    elemento.textContent = texto;
    elemento.className = `mensagem ${tipo}`;
}

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...(opcoes.headers || {})
        }
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(dados.erro || dados.mensagem || "Ocorreu um erro na requisição.");
    }

    return dados;
}

$("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();

    mostrarMensagem("erroLogin", "");

    const email = $("email").value.trim();
    const senha = $("senha").value;

    try {
        const usuario = await requisicao(`${API}/usuario/login`, {
            method: "POST",
            body: JSON.stringify({ email, senha })
        });

        usuarioLogado = usuario.usuario || usuario;

        if (!usuarioLogado.id) {
            throw new Error("O servidor não retornou o ID do usuário.");
        }

        localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));
        abrirHome();
    } catch (erro) {
        mostrarMensagem(
            "erroLogin",
            erro.message || "Não foi possível entrar. Confira seu e-mail e sua senha.",
            "erro"
        );
    }
});

function abrirHome() {
    $("telaLogin").classList.add("hidden");
    $("telaHome").classList.remove("hidden");

    $("nomeUsuario").textContent = usuarioLogado.nome || usuarioLogado.email;

    carregarEventos();
}

function sair() {
    usuarioLogado = null;
    eventos = [];

    localStorage.removeItem("usuarioLogado");

    $("formLogin").reset();
    $("telaHome").classList.add("hidden");
    $("telaLogin").classList.remove("hidden");
    $("painelFormulario").classList.add("hidden");
    $("listaEventos").innerHTML = "";

    mostrarMensagem("erroLogin", "");
}

$("btnSair").addEventListener("click", sair);

async function carregarEventos() {
    mostrarMensagem("mensagemLista", "Carregando eventos...");

    try {
        const dados = await requisicao(`${API}/evento/listar`);

        eventos = Array.isArray(dados)
            ? dados.filter(evento => evento.usuarioId === usuarioLogado.id)
            : [];

        renderizarEventos();
        atualizarResumo();
        mostrarMensagem("mensagemLista", "");
    } catch (erro) {
        eventos = [];
        renderizarEventos();
        atualizarResumo();

        mostrarMensagem(
            "mensagemLista",
            "Não foi possível carregar os eventos. Verifique se o back-end está funcionando.",
            "erro"
        );
    }
}

function renderizarEventos() {
    const busca = $("pesquisa").value.trim().toLowerCase();

    const filtrados = eventos.filter(evento =>
        String(evento.cidade || "").toLowerCase().includes(busca) ||
        String(evento.tipoEvento || "").toLowerCase().includes(busca) ||
        String(evento.nivelImpacto || "").toLowerCase().includes(busca)
    );

    const tbody = $("listaEventos");
    tbody.innerHTML = "";

    if (filtrados.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = 6;
        celula.textContent = busca
            ? "Nenhum evento encontrado para essa pesquisa."
            : "Nenhum evento cadastrado.";

        celula.style.textAlign = "center";
        celula.style.padding = "30px";

        linha.appendChild(celula);
        tbody.appendChild(linha);
        return;
    }

    filtrados.forEach(evento => {
        const linha = document.createElement("tr");

        const valores = [
            evento.cidade,
            evento.tipoEvento,
            evento.temperaturaMaxima == null
                ? "Não informada"
                : `${evento.temperaturaMaxima} °C`,
            formatarData(evento.data)
        ];

        valores.forEach(valor => {
            const celula = document.createElement("td");
            celula.textContent = valor ?? "";
            linha.appendChild(celula);
        });

        const celulaImpacto = document.createElement("td");
        const etiqueta = document.createElement("span");
        etiqueta.className = `impacto ${classeImpacto(evento.nivelImpacto)}`;
        etiqueta.textContent = evento.nivelImpacto || "Não informado";
        celulaImpacto.appendChild(etiqueta);
        linha.appendChild(celulaImpacto);

        const celulaAcoes = document.createElement("td");

        const btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.className = "btn-editar";
        btnEditar.textContent = "Editar";
        btnEditar.addEventListener("click", () => editarEvento(evento.id));

        const btnExcluir = document.createElement("button");
        btnExcluir.type = "button";
        btnExcluir.className = "btn-excluir";
        btnExcluir.textContent = "Excluir";
        btnExcluir.addEventListener("click", () => excluirEvento(evento.id));

        celulaAcoes.append(btnEditar, btnExcluir);
        linha.appendChild(celulaAcoes);

        tbody.appendChild(linha);
    });
}

function formatarData(data) {
    if (!data) return "Não informada";

    const dataFormatada = String(data).slice(0, 10);
    const partes = dataFormatada.split("-");

    if (partes.length !== 3) return dataFormatada;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function classeImpacto(impacto) {
    const nivel = String(impacto || "").toLowerCase();

    if (nivel === "baixo") return "impacto-baixo";
    if (nivel === "moderado") return "impacto-moderado";
    if (nivel === "alto") return "impacto-alto";
    if (nivel === "crítico" || nivel === "critico") return "impacto-critico";

    return "";
}

function atualizarResumo() {
    $("totalEventos").textContent = eventos.length;

    const cidades = new Set(
        eventos.map(evento => String(evento.cidade || "").trim().toLowerCase())
            .filter(Boolean)
    );

    $("totalCidades").textContent = cidades.size;

    const temperaturas = eventos
        .map(evento => evento.temperaturaMaxima)
        .filter(temp => temp !== null && temp !== undefined && temp !== "")
        .map(Number)
        .filter(Number.isFinite);

    $("temperaturaMedia").textContent = temperaturas.length
        ? `${(temperaturas.reduce((soma, temp) => soma + temp, 0) / temperaturas.length).toFixed(1)} °C`
        : "--";
}

function abrirFormulario() {
    $("formEvento").reset();
    $("eventoId").value = "";
    $("tituloFormulario").textContent = "Cadastrar evento";
    $("btnSalvar").textContent = "Salvar evento";
    $("painelFormulario").classList.remove("hidden");
    mostrarMensagem("mensagemFormulario", "");

    $("data").value = new Date().toLocaleDateString("en-CA");
    $("painelFormulario").scrollIntoView({ behavior: "smooth" });
}

$("btnNovoEvento").addEventListener("click", abrirFormulario);

$("btnCancelar").addEventListener("click", () => {
    $("painelFormulario").classList.add("hidden");
    $("formEvento").reset();
});

$("pesquisa").addEventListener("input", renderizarEventos);

$("formEvento").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = $("eventoId").value;
    const temperatura = $("temperaturaMaxima").value;

    const dados = {
        usuarioId: usuarioLogado.id,
        cidade: $("cidade").value.trim(),
        tipoEvento: $("tipoEvento").value,
        temperaturaMaxima: temperatura === "" ? null : Number(temperatura),
        data: new Date(`${$("data").value}T12:00:00.000Z`).toISOString(),
        nivelImpacto: $("nivelImpacto").value
    };

    try {
        if (id) {
            await requisicao(`${API}/evento/atualizar/${id}`, {
                method: "PUT",
                body: JSON.stringify({
                    cidade: dados.cidade,
                    tipoEvento: dados.tipoEvento,
                    temperaturaMaxima: dados.temperaturaMaxima,
                    data: dados.data,
                    nivelImpacto: dados.nivelImpacto
                })
            });

            mostrarMensagem("mensagemFormulario", "Evento atualizado com sucesso!", "sucesso");
        } else {
            await requisicao(`${API}/evento/cadastrar`, {
                method: "POST",
                body: JSON.stringify(dados)
            });

            mostrarMensagem("mensagemFormulario", "Evento cadastrado com sucesso!", "sucesso");
        }

        await carregarEventos();

        setTimeout(() => {
            $("painelFormulario").classList.add("hidden");
            $("formEvento").reset();
        }, 600);
    } catch (erro) {
        mostrarMensagem("mensagemFormulario", erro.message, "erro");
    }
});

function editarEvento(id) {
    const evento = eventos.find(item => item.id === id);
    if (!evento) return;

    $("eventoId").value = evento.id;
    $("cidade").value = evento.cidade || "";
    $("tipoEvento").value = evento.tipoEvento || "";
    $("temperaturaMaxima").value = evento.temperaturaMaxima ?? "";
    $("data").value = evento.data ? String(evento.data).slice(0, 10) : "";
    $("nivelImpacto").value = evento.nivelImpacto || "";

    $("tituloFormulario").textContent = "Editar evento";
    $("btnSalvar").textContent = "Salvar alterações";
    $("painelFormulario").classList.remove("hidden");

    mostrarMensagem("mensagemFormulario", "");
    $("painelFormulario").scrollIntoView({ behavior: "smooth" });
}

async function excluirEvento(id) {
    const evento = eventos.find(item => item.id === id);
    if (!evento) return;

    const confirmar = confirm(
        `Deseja realmente excluir o evento "${evento.tipoEvento}" em ${evento.cidade}?`
    );

    if (!confirmar) return;

    try {
        await requisicao(`${API}/evento/excluir/${id}`, {
            method: "DELETE"
        });

        await carregarEventos();
        mostrarMensagem("mensagemLista", "Evento excluído com sucesso!", "sucesso");
    } catch (erro) {
        mostrarMensagem("mensagemLista", erro.message, "erro");
    }
}

try {
    const salvo = localStorage.getItem("usuarioLogado");

    if (salvo) {
        usuarioLogado = JSON.parse(salvo);

        if (usuarioLogado && usuarioLogado.id) {
            abrirHome();
        } else {
            sair();
        }
    }
} catch {
    localStorage.removeItem("usuarioLogado");
}