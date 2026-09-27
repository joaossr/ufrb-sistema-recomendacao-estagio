/**
 * recomendacoes.js
 * Controlador da página "Recomendações" (Fase 8/9, ajustada na Fase
 * 12): consome só DataService.listarRecomendacoes() — o aluno nunca
 * dispara a geração, apenas visualiza o que o admin já gerou para
 * todos os estudantes (ver painel administrativo). O índice de
 * compatibilidade NUNCA é exibido como probabilidade de contratação —
 * só como um indicador interno de o quanto o perfil e a vaga/empresa
 * têm em comum, decidido pelo backend.
 */

const els = {};
let todasRecomendacoes = [];
let filtroAtivo = "todas";

function cacheElements() {
  ["rec-filters", "rec-grid", "rec-empty", "toast", "btn-logout"].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function wireLogout() {
  els["btn-logout"].addEventListener("click", () => {
    AuthService.logout();
    window.location.href = "login.html";
  });
}

function wireFiltros() {
  els["rec-filters"].querySelectorAll(".rec-filter").forEach((botao) => {
    botao.addEventListener("click", () => {
      filtroAtivo = botao.dataset.filtro;
      els["rec-filters"].querySelectorAll(".rec-filter").forEach((b) => b.classList.toggle("is-active", b === botao));
      renderizarLista();
    });
  });
}

async function carregarExistentes() {
  try {
    todasRecomendacoes = await DataService.listarRecomendacoes();
    renderizarLista();
  } catch (err) {
    // Sem recomendações ainda é um estado normal, não um erro para o usuário.
    console.warn("Não foi possível carregar recomendações existentes.", err);
  }
}

function itemPassaNoFiltro(item) {
  if (filtroAtivo === "todas") return true;
  if (filtroAtivo === "prospeccao") return item.tipo === "aluno_para_empresa";
  return item.nivel === filtroAtivo;
}

function renderizarLista() {
  const lista = todasRecomendacoes.filter(itemPassaNoFiltro);

  els["rec-filters"].hidden = todasRecomendacoes.length === 0;
  els["rec-grid"].innerHTML = "";

  if (todasRecomendacoes.length === 0) {
    els["rec-empty"].hidden = false;
    els["rec-empty"].querySelector("p").textContent =
      "Ainda não há recomendações geradas para o seu perfil. Elas aparecem aqui assim que a administração processar os estudantes cadastrados.";
    return;
  }

  if (lista.length === 0) {
    els["rec-empty"].hidden = false;
    els["rec-empty"].querySelector("p").textContent = "Nenhum resultado para este filtro.";
    return;
  }

  els["rec-empty"].hidden = true;
  lista.forEach((item) => els["rec-grid"].appendChild(criarCard(item)));
}

function criarListaSecao(titulo, itens, classeExtra) {
  if (!itens || itens.length === 0) return null;
  const wrap = document.createElement("div");
  wrap.className = "rec-card__section";
  const heading = document.createElement("p");
  heading.className = "rec-card__section-title";
  heading.textContent = titulo;
  const lista = document.createElement("ul");
  lista.className = "rec-card__list" + (classeExtra ? " " + classeExtra : "");
  itens.forEach((texto) => {
    const li = document.createElement("li");
    li.textContent = texto;
    lista.appendChild(li);
  });
  wrap.appendChild(heading);
  wrap.appendChild(lista);
  return wrap;
}

function criarConvenioBadge(convenio) {
  if (!convenio) return null;
  const badge = document.createElement("span");
  badge.className = "rec-convenio-badge rec-convenio-badge--" + convenio.status;
  const rotulos = { vigente: "Convênio vigente", vencido: "Convênio vencido", indeterminado: "Convênio: data indefinida" };
  badge.textContent = rotulos[convenio.status] || convenio.status;
  return badge;
}

function criarCard(item) {
  const ehProspeccao = item.tipo === "aluno_para_empresa";

  const card = document.createElement("article");
  card.className = "rec-card" + (ehProspeccao ? " rec-card--prospeccao" : "");

  const header = document.createElement("div");
  header.className = "rec-card__header";

  const info = document.createElement("div");
  const empresaEl = document.createElement("div");
  empresaEl.className = "rec-card__company";
  empresaEl.textContent = item.empresa.nome;
  info.appendChild(empresaEl);

  const tituloEl = document.createElement("h3");
  tituloEl.className = "rec-card__title";
  tituloEl.textContent = item.vaga ? item.vaga.titulo : "Empresa compatível com o seu perfil";
  info.appendChild(tituloEl);

  header.appendChild(info);

  const nivelBadge = document.createElement("span");
  nivelBadge.className = "rec-level rec-level--" + (item.nivel || "baixa");
  const nivelLabels = { alta: "Alta compatibilidade", media: "Compatibilidade média", baixa: "Baixa compatibilidade" };
  nivelBadge.textContent = nivelLabels[item.nivel] || item.nivel;
  header.appendChild(nivelBadge);

  card.appendChild(header);

  if (ehProspeccao) {
    const badgeProspeccao = document.createElement("span");
    badgeProspeccao.className = "rec-card__prospeccao-badge";
    badgeProspeccao.textContent = "Empresa potencial para prospecção — sem vaga aberta no momento";
    card.appendChild(badgeProspeccao);
  }

  if (item.vaga) {
    const meta = document.createElement("div");
    meta.className = "rec-card__meta";
    [item.vaga.modalidade, item.vaga.localizacao, item.vaga.bolsa, item.vaga.carga_horaria].filter(Boolean).forEach((texto) => {
      const span = document.createElement("span");
      span.textContent = texto;
      meta.appendChild(span);
    });
    const convenioBadge = criarConvenioBadge(item.vaga.convenio);
    if (convenioBadge) meta.appendChild(convenioBadge);
    if (meta.children.length) card.appendChild(meta);
  }

  const compativeis = criarListaSecao("Pontos compatíveis", item.pontos_compativeis);
  if (compativeis) card.appendChild(compativeis);

  const parciais = criarListaSecao("Compatibilidade parcial", item.pontos_parciais);
  if (parciais) card.appendChild(parciais);

  const lacunas = criarListaSecao("Lacunas", item.lacunas, "rec-card__list--lacunas");
  if (lacunas) card.appendChild(lacunas);

  if (item.justificativa) {
    const justificativa = document.createElement("p");
    justificativa.className = "rec-card__justificativa";
    justificativa.textContent = item.justificativa;
    card.appendChild(justificativa);
  }

  const footer = document.createElement("div");
  footer.className = "rec-card__footer";

  const indice = document.createElement("span");
  indice.className = "field-hint";
  indice.textContent = "Índice de compatibilidade: " + Math.round(item.indice_compatibilidade || 0) + "/100";
  footer.appendChild(indice);

  if (item.vaga && item.vaga.link) {
    const link = document.createElement("a");
    link.href = item.vaga.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "btn btn-outline btn-sm";
    link.textContent = "Ver vaga";
    footer.appendChild(link);
  }

  card.appendChild(footer);

  return card;
}

async function init() {
  if (!AuthService.getCurrentUser()) {
    window.location.href = "login.html";
    return;
  }

  cacheElements();
  wireLogout();
  wireFiltros();
  await carregarExistentes();
}

document.addEventListener("DOMContentLoaded", init);
