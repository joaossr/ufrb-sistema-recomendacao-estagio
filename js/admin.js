/**
 * admin.js
 * Controlador do Painel Administrativo. O controle de acesso (só a
 * conta de administrador definida em authService.js chega aqui) roda
 * no <head> de admin.html, antes deste script.
 *
 * Fase 10: todas as abas falam com o backend real (nenhum dado
 * fictício) — ver dataService.js para os métodos consumidos aqui.
 */

const adminEls = {};
let students = [];
let companies = [];
let vagasAtuaisFiltro = "";
let relatorioNivelFiltro = "";

function cacheAdminElements() {
  [
    "admin-summary", "admin-stats", "admin-search", "admin-table-body", "admin-empty",
    "admin-detail-modal", "admin-detail-title", "admin-detail-body",
    "admin-detail-close", "admin-detail-close-btn",
    "empresa-nome-input", "empresa-cnpj-input", "btn-criar-empresa",
    "empresas-search", "empresas-table-body", "empresas-empty",
    "empresa-detail-modal", "empresa-detail-title", "empresa-detail-body",
    "empresa-detail-close", "empresa-detail-close-btn",
    "convenios-modal", "convenios-modal-title", "convenios-modal-close", "convenios-modal-close-btn",
    "convenio-processo-input", "convenio-data-inicio-input", "convenio-data-fim-input",
    "btn-criar-convenio", "convenios-lista",
    "vaga-empresa-select", "vaga-titulo-input", "vaga-cursos-input", "vaga-tecnologias-input",
    "vaga-modalidade-select", "vaga-bolsa-input", "vaga-descricao-input", "btn-criar-vaga",
    "vagas-filtros", "vagas-search", "vagas-table-body", "vagas-empty",
    "caminho-inverso-modal", "caminho-inverso-title", "caminho-inverso-body",
    "caminho-inverso-close", "caminho-inverso-close-btn",
    "importacao-dropzone", "btn-select-importacao-file", "importacao-file-input",
    "importacao-upload-state", "importacao-loading-state",
    "importacao-resultado", "importacao-resultado-body",
    "importacao-planilha-dropzone", "btn-select-importacao-planilha-file", "importacao-planilha-file-input",
    "importacao-planilha-upload-state", "importacao-planilha-loading-state",
    "importacao-planilha-resultado", "importacao-planilha-resultado-body",
    "importacoes-table-body", "importacoes-empty",
    "btn-gerar-recomendacoes-todos",
    "geracao-lote-modal", "geracao-lote-body", "geracao-lote-close", "geracao-lote-close-btn",
    "relatorio-rec-filtros", "relatorio-rec-table-body", "relatorio-rec-empty",
    "recomendacao-detalhe-modal", "recomendacao-detalhe-title", "recomendacao-detalhe-body",
    "recomendacao-detalhe-close", "recomendacao-detalhe-close-btn", "btn-baixar-pdf-recomendacao",
    "toast", "btn-logout",
  ].forEach((id) => {
    adminEls[id] = document.getElementById(id);
  });
}

async function init() {
  cacheAdminElements();
  wireAdminEvents();
  wireTabs();
  await loadEstudantes();
}

function handleLogout() {
  AuthService.logout();
  window.location.href = "login.html";
}

function showToast(message) {
  adminEls["toast"].textContent = message;
  adminEls["toast"].classList.add("is-visible");
  setTimeout(() => adminEls["toast"].classList.remove("is-visible"), 3200);
}

/* ---------------------------------------------------------------------
 * Abas
 * ------------------------------------------------------------------- */
const tabLoaders = {
  estudantes: () => Promise.resolve(),
  empresas: loadEmpresas,
  vagas: loadVagas,
  recomendacoes: loadRelatorioRecomendacoes,
  importacoes: loadImportacoes,
};
const tabsLoaded = new Set(["estudantes"]);

function wireTabs() {
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".admin-tab").forEach((b) => b.classList.toggle("is-active", b === btn));
      document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== "tab-" + tab;
      });
      if (!tabsLoaded.has(tab)) {
        tabsLoaded.add(tab);
        await tabLoaders[tab]();
      }
    });
  });
}

/* ---------------------------------------------------------------------
 * Aba: Estudantes
 * ------------------------------------------------------------------- */
function completionPercentFromSummary(entry) {
  let percent = 0;
  if (entry.curso) percent += 30;
  if (entry.num_tecnologias > 0) percent += 30;
  if (entry.num_projetos > 0) percent += 30;
  if (entry.num_areas_interesse > 0) percent += 10;
  return percent;
}

async function loadEstudantes() {
  try {
    students = await DataService.listStudents();
  } catch (err) {
    showToast("Não foi possível carregar os estudantes.");
    students = [];
  }
  renderStats(students);
  renderTable(students);
}

function renderStats(entries) {
  const total = entries.length;
  const percentages = entries.map(completionPercentFromSummary);
  const complete = percentages.filter((p) => p === 100).length;
  const average = total ? Math.round(percentages.reduce((a, b) => a + b, 0) / total) : 0;
  const comEmbedding = entries.filter((e) => e.tem_embedding).length;

  const stats = [
    { label: "Estudantes cadastrados", value: total },
    { label: "Perfis 100% completos", value: complete },
    { label: "Preenchimento médio", value: average + "%" },
    { label: "Com embedding gerado", value: comEmbedding },
  ];

  adminEls["admin-summary"].textContent =
    total + (total === 1 ? " estudante encontrado." : " estudantes encontrados.");

  adminEls["admin-stats"].innerHTML = "";
  stats.forEach((stat) => {
    const card = document.createElement("div");
    card.className = "admin-stat-card";
    const value = document.createElement("div");
    value.className = "admin-stat-card__value";
    value.textContent = stat.value;
    const label = document.createElement("div");
    label.className = "admin-stat-card__label";
    label.textContent = stat.label;
    card.appendChild(value);
    card.appendChild(label);
    adminEls["admin-stats"].appendChild(card);
  });
}

function renderTable(entries) {
  const query = adminEls["admin-search"].value.trim().toLowerCase();
  const filtered = query
    ? entries.filter((entry) => {
        const haystack = [entry.nome_completo, entry.curso, entry.matricula, entry.email]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
    : entries;

  adminEls["admin-table-body"].innerHTML = "";
  adminEls["admin-empty"].hidden = filtered.length > 0;

  filtered.forEach((entry) => {
    const percent = completionPercentFromSummary(entry);
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = entry.nome_completo || "(nome não informado)";

    const courseCell = document.createElement("td");
    courseCell.textContent = entry.curso || "—";

    const regCell = document.createElement("td");
    regCell.textContent = entry.matricula || "—";

    const emailCell = document.createElement("td");
    emailCell.textContent = entry.email || "—";

    const progressCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "admin-progress-badge" + (percent === 100 ? " is-complete" : "");
    badge.textContent = percent + "%";
    progressCell.appendChild(badge);

    const embeddingCell = document.createElement("td");
    const embeddingBadge = document.createElement("span");
    embeddingBadge.className = "tag-pill" + (entry.tem_embedding ? "" : " tag-pill--muted");
    embeddingBadge.textContent = entry.tem_embedding ? "Gerado" : "Pendente";
    embeddingCell.appendChild(embeddingBadge);

    const actionsCell = document.createElement("td");
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "btn btn-secondary btn-sm";
    viewBtn.textContent = "Ver detalhes";
    viewBtn.addEventListener("click", () => openDetailModal(entry.id));
    actionsCell.appendChild(viewBtn);

    row.appendChild(nameCell);
    row.appendChild(courseCell);
    row.appendChild(regCell);
    row.appendChild(emailCell);
    row.appendChild(progressCell);
    row.appendChild(embeddingCell);
    row.appendChild(actionsCell);

    adminEls["admin-table-body"].appendChild(row);
  });
}

/* ---------------------------------------------------------------------
 * Modal de detalhes do estudante
 * ------------------------------------------------------------------- */
function detailRow(label, value) {
  return (
    '<div class="admin-detail-row">' +
    '<span class="admin-detail-row__label">' + UI.escapeHtml(label) + "</span>" +
    '<span class="admin-detail-row__value">' + UI.escapeHtml(value || "—") + "</span>" +
    "</div>"
  );
}

async function openDetailModal(alunoId) {
  adminEls["admin-detail-title"].textContent = "Carregando...";
  adminEls["admin-detail-body"].innerHTML = '<p class="field-hint">Carregando dados do estudante...</p>';
  adminEls["admin-detail-modal"].hidden = false;

  let entry;
  try {
    entry = await DataService.getStudentDetail(alunoId);
  } catch (err) {
    adminEls["admin-detail-body"].innerHTML = '<p class="field-hint">Não foi possível carregar os dados deste estudante.</p>';
    return;
  }

  const p = entry.perfil;
  adminEls["admin-detail-title"].textContent = p.full_name || "Perfil do estudante";

  let html = "";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Identificação</h3>';
  html += detailRow("Nome completo", p.full_name);
  html += detailRow("ID Lattes", p.lattes_id);
  html += detailRow("E-mail institucional", p.email);
  html += detailRow("Telefone", p.phone);
  html += detailRow("Matrícula", p.registration_number);
  html += detailRow("LinkedIn", p.linkedin_url);
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Formação acadêmica</h3>';
  html += detailRow("Curso", p.course);
  html += detailRow("Instituição", p.institution);
  html += detailRow("Nível", p.education_level);
  html += detailRow("Status", p.education_status);
  html += detailRow("Semestre atual", p.semester);
  html += detailRow("Previsão de conclusão", p.expected_graduation);
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Trabalho de Conclusão de Curso (TCC)</h3>';
  const tccStatusLabel =
    (typeof TCC_STATUS_OPTIONS !== "undefined" ? TCC_STATUS_OPTIONS.find((o) => o.value === p.tcc_status) : null)?.label ||
    "Não iniciou TCC";
  html += detailRow("Situação", tccStatusLabel);
  if (p.tcc_status && p.tcc_status !== "nao_iniciou") {
    html += detailRow("Título", p.tcc_title);
    html += detailRow("Orientador", p.tcc_advisor);
    if (p.tcc_summary) {
      html +=
        '<div class="admin-detail-row"><span class="admin-detail-row__label">Resumo</span></div>' +
        '<p class="field-hint" style="margin-top:-4px;">' + UI.escapeHtml(p.tcc_summary) + "</p>";
    }
    if (p.tcc_keywords && p.tcc_keywords.length) {
      html += '<div class="chip-list-preview" style="margin-top:8px;">';
      p.tcc_keywords.forEach((k) => {
        html += '<span class="tag-pill">' + UI.escapeHtml(k) + "</span>";
      });
      html += "</div>";
    }
  }
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Tecnologias e conhecimentos</h3>';
  if (entry.tecnologias.length) {
    html += '<div class="chip-list-preview">';
    entry.tecnologias.forEach((t) => {
      html += '<span class="tag-pill">' + UI.escapeHtml(t.name) + " · " + UI.escapeHtml(t.level) + "</span>";
    });
    html += "</div>";
  } else {
    html += '<p class="field-hint">Nenhuma tecnologia cadastrada.</p>';
  }
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Projetos desenvolvidos</h3>';
  if (entry.projetos.length) {
    entry.projetos.forEach((proj) => {
      html += '<div class="lattes-preview-project">';
      html += '<div class="lattes-preview-project__name">' + UI.escapeHtml(proj.name) + "</div>";
      const vinculo = [proj.academic_center, proj.course, proj.area, proj.type].filter(Boolean).join(" · ");
      if (vinculo) html += '<p class="field-hint" style="margin:2px 0 6px;">' + UI.escapeHtml(vinculo) + "</p>";
      html += '<p class="lattes-preview-project__desc">' + UI.escapeHtml(proj.description) + "</p>";
      if (proj.technologies && proj.technologies.length) {
        html += '<div class="chip-list-preview" style="margin-top:8px;">';
        proj.technologies.forEach((t) => {
          html += '<span class="tag-pill">' + UI.escapeHtml(t) + "</span>";
        });
        html += "</div>";
      }
      if (proj.link) {
        html += '<p class="field-hint" style="margin-top:8px;">' + UI.escapeHtml(proj.link) + "</p>";
      }
      html += "</div>";
    });
  } else {
    html += '<p class="field-hint">Nenhum projeto cadastrado.</p>';
  }
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Experiências</h3>';
  if (entry.experiencias.length) {
    entry.experiencias.forEach((exp) => {
      html += '<div class="experience-item">';
      html += "<h4>" + UI.escapeHtml(exp.role) + " · " + UI.escapeHtml(exp.company) + "</h4>";
      const metaParts = [UI.formatExperiencePeriod(exp)];
      if (exp.work_area) metaParts.push(exp.work_area);
      html += '<div class="experience-item__meta">' + UI.escapeHtml(metaParts.join(" · ")) + "</div>";
      if (exp.description) html += "<p>" + UI.escapeHtml(exp.description) + "</p>";
      html += "</div>";
    });
  } else {
    html += '<p class="field-hint">Nenhuma experiência informada.</p>';
  }
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Áreas de interesse</h3>';
  if (entry.areas_interesse.length) {
    html += '<div class="chip-list-preview">';
    entry.areas_interesse.forEach((area) => {
      html += '<span class="tag-pill">' + UI.escapeHtml(area) + "</span>";
    });
    html += "</div>";
  } else {
    html += '<p class="field-hint">Nenhuma área de interesse selecionada.</p>';
  }
  html += "</div>";

  adminEls["admin-detail-body"].innerHTML = html;
}

function closeDetailModal() {
  adminEls["admin-detail-modal"].hidden = true;
}

/* ---------------------------------------------------------------------
 * Aba: Empresas & Convênios
 * ------------------------------------------------------------------- */
async function loadEmpresas() {
  try {
    companies = await DataService.listCompanies();
  } catch (err) {
    showToast("Não foi possível carregar as empresas.");
    companies = [];
  }
  renderEmpresas();
  populateVagaEmpresaSelect();
}

function renderEmpresas() {
  const termo = adminEls["empresas-search"].value.trim().toLowerCase();
  const filtradas = termo
    ? companies.filter((e) => {
        const cnpjDigits = (e.cnpj || "").replace(/\D/g, "");
        const termoDigits = termo.replace(/\D/g, "");
        return (
          e.nome.toLowerCase().includes(termo) ||
          (termoDigits && cnpjDigits.includes(termoDigits))
        );
      })
    : companies;

  adminEls["empresas-table-body"].innerHTML = "";
  adminEls["empresas-empty"].hidden = filtradas.length > 0;

  filtradas.forEach((empresa) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = empresa.nome;

    const cnpjCell = document.createElement("td");
    cnpjCell.textContent = empresa.cnpj || "—";

    const areaCell = document.createElement("td");
    areaCell.textContent = empresa.area || "—";

    const cidadeCell = document.createElement("td");
    cidadeCell.textContent = [empresa.cidade, empresa.uf].filter(Boolean).join(" - ") || "—";

    const dateCell = document.createElement("td");
    dateCell.textContent = new Date(empresa.created_at).toLocaleDateString("pt-BR");

    const actionsCell = document.createElement("td");
    const detailBtn = document.createElement("button");
    detailBtn.type = "button";
    detailBtn.className = "btn btn-secondary btn-sm";
    detailBtn.textContent = "Ver detalhes";
    detailBtn.addEventListener("click", () => openEmpresaDetailModal(empresa));
    const convBtn = document.createElement("button");
    convBtn.type = "button";
    convBtn.className = "btn btn-secondary btn-sm";
    convBtn.style.marginLeft = "8px";
    convBtn.textContent = "Convênios";
    convBtn.addEventListener("click", () => openConveniosModal(empresa));
    const prospBtn = document.createElement("button");
    prospBtn.type = "button";
    prospBtn.className = "btn btn-outline btn-sm";
    prospBtn.style.marginLeft = "8px";
    prospBtn.textContent = "Buscar estudantes compatíveis";
    prospBtn.addEventListener("click", () => gerarCaminhoInversoEmpresa(empresa));
    actionsCell.appendChild(detailBtn);
    actionsCell.appendChild(convBtn);
    actionsCell.appendChild(prospBtn);

    row.appendChild(nameCell);
    row.appendChild(cnpjCell);
    row.appendChild(areaCell);
    row.appendChild(cidadeCell);
    row.appendChild(dateCell);
    row.appendChild(actionsCell);
    adminEls["empresas-table-body"].appendChild(row);
  });
}

async function handleCriarEmpresa() {
  const nome = adminEls["empresa-nome-input"].value.trim();
  if (!nome) {
    showToast("Informe o nome da empresa.");
    return;
  }
  const cnpj = adminEls["empresa-cnpj-input"].value.trim();
  try {
    await DataService.createCompany({ nome, cnpj: cnpj || null });
    adminEls["empresa-nome-input"].value = "";
    adminEls["empresa-cnpj-input"].value = "";
    showToast("Empresa cadastrada.");
    await loadEmpresas();
  } catch (err) {
    showToast(err.message || "Não foi possível cadastrar a empresa.");
  }
}

async function openEmpresaDetailModal(empresa) {
  adminEls["empresa-detail-title"].textContent = empresa.nome;
  adminEls["empresa-detail-body"].innerHTML = '<p class="field-hint">Carregando...</p>';
  adminEls["empresa-detail-modal"].hidden = false;

  let convenios = [];
  let vagas = [];
  try {
    [convenios, vagas] = await Promise.all([
      DataService.listConvenios(empresa.id),
      DataService.listVagasDaEmpresa(empresa.id),
    ]);
  } catch (err) {
    adminEls["empresa-detail-body"].innerHTML = '<p class="field-hint">Não foi possível carregar os detalhes desta empresa.</p>';
    return;
  }

  let html = "";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Identificação</h3>';
  html += detailRow("Nome", empresa.nome);
  html += detailRow("CNPJ", empresa.cnpj);
  html += detailRow("Área", empresa.area);
  html += detailRow("Segmento", empresa.segmento);
  html += detailRow("Cidade", empresa.cidade);
  html += detailRow("UF", empresa.uf);
  html += detailRow("Cadastrada em", new Date(empresa.created_at).toLocaleDateString("pt-BR"));
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Convênios (' + convenios.length + ')</h3>';
  if (convenios.length) {
    convenios.forEach((c) => {
      const badgeClass = "rec-convenio-badge--" + (c.status || "indeterminado");
      html += '<div class="admin-detail-row">';
      html += '<span class="admin-detail-row__label">' + UI.escapeHtml(c.processo || "(sem nº de processo)") + "</span>";
      html +=
        '<span class="admin-detail-row__value"><span class="rec-convenio-badge ' + badgeClass + '">' +
        UI.escapeHtml(c.status) + "</span> · " + UI.escapeHtml(c.data_fim_original || "sem data") + "</span>";
      html += "</div>";
    });
  } else {
    html += '<p class="field-hint">Nenhum convênio registrado.</p>';
  }
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Vagas (' + vagas.length + ')</h3>';
  if (vagas.length) {
    vagas.forEach((v) => {
      html += '<div class="lattes-preview-project">';
      html += '<div class="lattes-preview-project__name">' + UI.escapeHtml(v.titulo) + "</div>";
      const meta = [v.modalidade, v.localizacao, v.bolsa, v.carga_horaria].filter(Boolean).join(" · ");
      if (meta) html += '<p class="field-hint" style="margin:2px 0 6px;">' + UI.escapeHtml(meta) + "</p>";
      const statusBadge = '<span class="tag-pill' + (v.status === "ativa" ? "" : " tag-pill--muted") + '">' + (v.status === "ativa" ? "Ativa" : "Encerrada") + "</span>";
      html += statusBadge;
      if (v.descricao) html += '<p class="lattes-preview-project__desc" style="margin-top:6px;">' + UI.escapeHtml(v.descricao) + "</p>";
      if (v.tecnologias && v.tecnologias.length) {
        html += '<div class="chip-list-preview" style="margin-top:8px;">';
        v.tecnologias.forEach((t) => {
          html += '<span class="tag-pill">' + UI.escapeHtml(t) + "</span>";
        });
        html += "</div>";
      }
      html += "</div>";
    });
  } else {
    html += '<p class="field-hint">Nenhuma vaga cadastrada para esta empresa.</p>';
  }
  html += "</div>";

  adminEls["empresa-detail-body"].innerHTML = html;
}

function closeEmpresaDetailModal() {
  adminEls["empresa-detail-modal"].hidden = true;
}

let conveniosModalEmpresa = null;

async function openConveniosModal(empresa) {
  conveniosModalEmpresa = empresa;
  adminEls["convenios-modal-title"].textContent = "Convênios · " + empresa.nome;
  adminEls["convenios-lista"].innerHTML = '<p class="field-hint">Carregando...</p>';
  adminEls["convenios-modal"].hidden = false;
  await renderConveniosLista();
}

async function renderConveniosLista() {
  let convenios = [];
  try {
    convenios = await DataService.listConvenios(conveniosModalEmpresa.id);
  } catch (err) {
    adminEls["convenios-lista"].innerHTML = '<p class="field-hint">Não foi possível carregar os convênios.</p>';
    return;
  }

  if (!convenios.length) {
    adminEls["convenios-lista"].innerHTML = '<p class="field-hint">Nenhum convênio registrado para esta empresa.</p>';
    return;
  }

  let html = "";
  convenios.forEach((c) => {
    const badgeClass = "rec-convenio-badge--" + (c.status || "indeterminado");
    html += '<div class="admin-detail-row">';
    html += '<span class="admin-detail-row__label">' + UI.escapeHtml(c.processo || "(sem nº de processo)") + "</span>";
    html +=
      '<span class="admin-detail-row__value"><span class="rec-convenio-badge ' + badgeClass + '">' +
      UI.escapeHtml(c.status) + "</span> · " + UI.escapeHtml(c.data_fim_original || "sem data") + "</span>";
    html += "</div>";
  });
  adminEls["convenios-lista"].innerHTML = html;
}

async function handleCriarConvenio() {
  const processo = adminEls["convenio-processo-input"].value.trim();
  const dataInicio = adminEls["convenio-data-inicio-input"].value;
  const dataFimOriginal = adminEls["convenio-data-fim-input"].value.trim();
  try {
    await DataService.createConvenio(conveniosModalEmpresa.id, {
      processo: processo || null,
      data_inicio: dataInicio || null,
      data_fim_original: dataFimOriginal || null,
      fonte: "cadastro manual (admin)",
    });
    adminEls["convenio-processo-input"].value = "";
    adminEls["convenio-data-inicio-input"].value = "";
    adminEls["convenio-data-fim-input"].value = "";
    showToast("Convênio registrado.");
    await renderConveniosLista();
  } catch (err) {
    showToast(err.message || "Não foi possível registrar o convênio.");
  }
}

function closeConveniosModal() {
  adminEls["convenios-modal"].hidden = true;
  conveniosModalEmpresa = null;
}

async function gerarCaminhoInversoEmpresa(empresa) {
  adminEls["caminho-inverso-title"].textContent = "Estudantes compatíveis · " + empresa.nome;
  adminEls["caminho-inverso-body"].innerHTML = '<div class="rec-loading"><div class="spinner"></div>Analisando candidatos com o Qwen3 (pode levar até um minuto)...</div>';
  adminEls["caminho-inverso-modal"].hidden = false;
  try {
    const resultados = await DataService.gerarRecomendacoesParaEmpresa(empresa.id);
    renderCaminhoInverso(resultados);
  } catch (err) {
    adminEls["caminho-inverso-body"].innerHTML = '<p class="field-hint">' + UI.escapeHtml(err.message || "Não foi possível gerar as recomendações.") + "</p>";
  }
}

function renderCaminhoInverso(resultados) {
  if (!resultados.length) {
    adminEls["caminho-inverso-body"].innerHTML = '<p class="field-hint">Nenhum estudante compatível encontrado (após aplicar as regras de curso e convênio vigente).</p>';
    return;
  }
  let html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Estudante</th><th>Curso</th><th>Nível</th><th>Índice</th></tr></thead><tbody>';
  resultados.forEach((r) => {
    const levelClass = "rec-level--" + (r.nivel || "media");
    html += "<tr><td>" + UI.escapeHtml(r.aluno.nome_completo || r.aluno.matricula) + "</td>";
    html += "<td>" + UI.escapeHtml(r.aluno.curso) + "</td>";
    html += '<td><span class="rec-level ' + levelClass + '">' + UI.escapeHtml(r.nivel) + "</span></td>";
    html += "<td>" + (r.indice_compatibilidade != null ? Math.round(r.indice_compatibilidade) + "/100" : "—") + "</td></tr>";
  });
  html += "</tbody></table></div>";
  adminEls["caminho-inverso-body"].innerHTML = html;
}

function closeCaminhoInversoModal() {
  adminEls["caminho-inverso-modal"].hidden = true;
}

/* ---------------------------------------------------------------------
 * Aba: Vagas
 * ------------------------------------------------------------------- */
function populateVagaEmpresaSelect() {
  const select = adminEls["vaga-empresa-select"];
  select.innerHTML = '<option value="" disabled selected>Selecione a empresa</option>';
  companies.forEach((empresa) => {
    const opt = document.createElement("option");
    opt.value = empresa.id;
    opt.textContent = empresa.nome;
    select.appendChild(opt);
  });
}

async function loadVagas() {
  if (!companies.length) await loadEmpresas();
  await renderVagas();
}

async function renderVagas() {
  let vagas = [];
  try {
    vagas = await DataService.listVagas(vagasAtuaisFiltro || undefined);
  } catch (err) {
    showToast("Não foi possível carregar as vagas.");
  }

  const empresasPorId = new Map(companies.map((e) => [e.id, e.nome]));

  const termo = adminEls["vagas-search"].value.trim().toLowerCase();
  const filtradas = termo
    ? vagas.filter((v) => {
        const nomeEmpresa = (empresasPorId.get(v.empresa_id) || "").toLowerCase();
        return v.titulo.toLowerCase().includes(termo) || nomeEmpresa.includes(termo);
      })
    : vagas;

  adminEls["vagas-table-body"].innerHTML = "";
  adminEls["vagas-empty"].hidden = filtradas.length > 0;

  filtradas.forEach((vaga) => {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.textContent = vaga.titulo;

    const empresaCell = document.createElement("td");
    empresaCell.textContent = empresasPorId.get(vaga.empresa_id) || "—";

    const modalidadeCell = document.createElement("td");
    modalidadeCell.textContent = vaga.modalidade || "—";

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = "tag-pill" + (vaga.status === "ativa" ? "" : " tag-pill--muted");
    statusBadge.textContent = vaga.status === "ativa" ? "Ativa" : "Encerrada";
    statusCell.appendChild(statusBadge);

    const actionsCell = document.createElement("td");

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "btn btn-secondary btn-sm";
    toggleBtn.textContent = vaga.status === "ativa" ? "Encerrar" : "Reativar";
    toggleBtn.addEventListener("click", async () => {
      try {
        await DataService.updateVagaStatus(vaga.id, vaga.status === "ativa" ? "encerrada" : "ativa");
        await renderVagas();
      } catch (err) {
        showToast(err.message || "Não foi possível atualizar o status.");
      }
    });

    const recBtn = document.createElement("button");
    recBtn.type = "button";
    recBtn.className = "btn btn-outline btn-sm";
    recBtn.style.margin = "0 8px";
    recBtn.textContent = "Gerar recomendações";
    recBtn.addEventListener("click", () => gerarCaminhoInversoVaga(vaga));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-danger-text";
    delBtn.textContent = "Excluir";
    delBtn.addEventListener("click", async () => {
      const ok = await UI.confirmAction('Excluir a vaga "' + vaga.titulo + '"? Esta ação não pode ser desfeita.');
      if (!ok) return;
      try {
        await DataService.deleteVaga(vaga.id);
        showToast("Vaga excluída.");
        await renderVagas();
      } catch (err) {
        showToast(err.message || "Não foi possível excluir a vaga.");
      }
    });

    actionsCell.appendChild(toggleBtn);
    actionsCell.appendChild(recBtn);
    actionsCell.appendChild(delBtn);

    row.appendChild(titleCell);
    row.appendChild(empresaCell);
    row.appendChild(modalidadeCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);
    adminEls["vagas-table-body"].appendChild(row);
  });
}

async function gerarCaminhoInversoVaga(vaga) {
  adminEls["caminho-inverso-title"].textContent = "Estudantes compatíveis · " + vaga.titulo;
  adminEls["caminho-inverso-body"].innerHTML = '<div class="rec-loading"><div class="spinner"></div>Analisando candidatos com o Qwen3 (pode levar até um minuto)...</div>';
  adminEls["caminho-inverso-modal"].hidden = false;
  try {
    const resultados = await DataService.gerarRecomendacoesParaVaga(vaga.id);
    renderCaminhoInverso(resultados);
  } catch (err) {
    adminEls["caminho-inverso-body"].innerHTML = '<p class="field-hint">' + UI.escapeHtml(err.message || "Não foi possível gerar as recomendações.") + "</p>";
  }
}

function splitCsv(value) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function handleCriarVaga() {
  const empresaId = adminEls["vaga-empresa-select"].value;
  const titulo = adminEls["vaga-titulo-input"].value.trim();
  if (!empresaId) {
    showToast("Selecione a empresa.");
    return;
  }
  if (!titulo) {
    showToast("Informe o título da vaga.");
    return;
  }

  const payload = {
    titulo,
    cursos: splitCsv(adminEls["vaga-cursos-input"].value),
    tecnologias: splitCsv(adminEls["vaga-tecnologias-input"].value),
    modalidade: adminEls["vaga-modalidade-select"].value || null,
    bolsa: adminEls["vaga-bolsa-input"].value.trim() || null,
    descricao: adminEls["vaga-descricao-input"].value.trim() || null,
  };

  try {
    await DataService.createVaga(empresaId, payload);
    adminEls["vaga-titulo-input"].value = "";
    adminEls["vaga-cursos-input"].value = "";
    adminEls["vaga-tecnologias-input"].value = "";
    adminEls["vaga-bolsa-input"].value = "";
    adminEls["vaga-descricao-input"].value = "";
    showToast("Vaga cadastrada.");
    await renderVagas();
  } catch (err) {
    showToast(err.message || "Não foi possível cadastrar a vaga.");
  }
}

/* ---------------------------------------------------------------------
 * Aba: Importações
 * ------------------------------------------------------------------- */
async function loadImportacoes() {
  await renderImportacoesHistorico();
}

async function renderImportacoesHistorico() {
  let importacoes = [];
  try {
    importacoes = await DataService.listImportacoes();
  } catch (err) {
    showToast("Não foi possível carregar o histórico de importações.");
  }

  adminEls["importacoes-table-body"].innerHTML = "";
  adminEls["importacoes-empty"].hidden = importacoes.length > 0;

  importacoes.forEach((imp) => {
    const row = document.createElement("tr");
    const cells = [
      imp.fonte,
      imp.tipo_arquivo,
      new Date(imp.iniciado_em).toLocaleString("pt-BR"),
      imp.total_linhas != null ? imp.total_linhas : "—",
      imp.sucesso != null ? imp.sucesso : "—",
      imp.erros ? imp.erros.length : 0,
    ];
    cells.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      row.appendChild(td);
    });
    adminEls["importacoes-table-body"].appendChild(row);
  });
}

async function handleImportacaoFile(file) {
  if (!file) return;
  adminEls["importacao-upload-state"].hidden = true;
  adminEls["importacao-loading-state"].hidden = false;
  adminEls["importacao-resultado"].hidden = true;

  try {
    const resultado = await DataService.importarConveniosPdf(file);
    renderImportacaoResultado(resultado);
    await renderImportacoesHistorico();
    showToast("Importação concluída.");
  } catch (err) {
    showToast(err.message || "Não foi possível processar o arquivo.");
  } finally {
    adminEls["importacao-loading-state"].hidden = true;
    adminEls["importacao-upload-state"].hidden = false;
    adminEls["importacao-file-input"].value = "";
  }
}

function renderImportacaoResultado(imp) {
  let html = "";
  html += detailRow("Arquivo", imp.fonte);
  html += detailRow("Total de linhas", String(imp.total_linhas ?? "—"));
  html += detailRow("Importadas com sucesso", String(imp.sucesso ?? "—"));
  html += detailRow("Erros", String(imp.erros ? imp.erros.length : 0));
  if (imp.erros && imp.erros.length) {
    html += '<div class="chip-list-preview" style="margin-top:8px;">';
    imp.erros.slice(0, 20).forEach((e) => {
      const texto = typeof e === "string" ? e : JSON.stringify(e);
      html += '<span class="tag-pill tag-pill--muted">' + UI.escapeHtml(texto) + "</span>";
    });
    html += "</div>";
  }
  adminEls["importacao-resultado-body"].innerHTML = html;
  adminEls["importacao-resultado"].hidden = false;
}

async function handleImportacaoPlanilhaFile(file) {
  if (!file) return;
  adminEls["importacao-planilha-upload-state"].hidden = true;
  adminEls["importacao-planilha-loading-state"].hidden = false;
  adminEls["importacao-planilha-resultado"].hidden = true;

  try {
    const resultado = await DataService.importarEmpresasVagasPlanilha(file);
    renderImportacaoPlanilhaResultado(resultado);
    await renderImportacoesHistorico();
    showToast("Importação concluída.");
  } catch (err) {
    showToast(err.message || "Não foi possível processar o arquivo.");
  } finally {
    adminEls["importacao-planilha-loading-state"].hidden = true;
    adminEls["importacao-planilha-upload-state"].hidden = false;
    adminEls["importacao-planilha-file-input"].value = "";
  }
}

function renderImportacaoPlanilhaResultado(imp) {
  let html = "";
  html += detailRow("Arquivo", imp.fonte);
  html += detailRow("Total de linhas", String(imp.total_linhas ?? "—"));
  html += detailRow("Importadas com sucesso", String(imp.sucesso ?? "—"));
  html += detailRow("Erros", String(imp.erros ? imp.erros.length : 0));
  if (imp.relatorio) {
    html += detailRow("Empresas criadas", String(imp.relatorio.empresas_criadas ?? 0));
    html += detailRow("Convênios criados", String(imp.relatorio.convenios_criados ?? 0));
    html += detailRow("Vagas criadas", String(imp.relatorio.vagas_criadas ?? 0));
    html += detailRow("Vagas atualizadas", String(imp.relatorio.vagas_atualizadas ?? 0));
  }
  if (imp.erros && imp.erros.length) {
    html += '<div class="chip-list-preview" style="margin-top:8px;">';
    imp.erros.slice(0, 20).forEach((e) => {
      const texto = typeof e === "string" ? e : JSON.stringify(e);
      html += '<span class="tag-pill tag-pill--muted">' + UI.escapeHtml(texto) + "</span>";
    });
    html += "</div>";
  }
  adminEls["importacao-planilha-resultado-body"].innerHTML = html;
  adminEls["importacao-planilha-resultado"].hidden = false;
}

/* ---------------------------------------------------------------------
 * Recomendações — geração em lote para todos os estudantes (Fase 12)
 * ------------------------------------------------------------------- */
async function handleGerarRecomendacoesTodos() {
  adminEls["btn-gerar-recomendacoes-todos"].disabled = true;
  adminEls["geracao-lote-modal"].hidden = false;
  adminEls["geracao-lote-body"].innerHTML =
    '<div class="rec-loading"><div class="spinner"></div>Processando todos os estudantes cadastrados — cada um pode levar até um minuto (busca vetorial + regras + Qwen3)...</div>';

  try {
    const resumo = await DataService.gerarRecomendacoesParaTodos();
    renderGeracaoLoteResultado(resumo);
    showToast("Geração de recomendações concluída.");
    await renderRelatorioRecomendacoes();
  } catch (err) {
    adminEls["geracao-lote-body"].innerHTML =
      '<p class="field-hint">' + UI.escapeHtml(err.message || "Não foi possível gerar as recomendações.") + "</p>";
  } finally {
    adminEls["btn-gerar-recomendacoes-todos"].disabled = false;
  }
}

function renderGeracaoLoteResultado(resumo) {
  let html = "";
  html += detailRow("Estudantes processados", String(resumo.alunos_processados));
  html += detailRow("Estudantes com erro", String(resumo.alunos_com_erro));
  html += detailRow("Recomendações de vaga geradas", String(resumo.total_recomendacoes_geradas));
  html += detailRow("Prospecções geradas", String(resumo.total_prospeccoes_geradas));

  if (resumo.detalhes && resumo.detalhes.length) {
    html += '<div class="admin-table-wrap" style="margin-top:16px;"><table class="admin-table"><thead><tr>';
    html += "<th>Estudante</th><th>Recomendações</th><th>Prospecções</th><th>Erro</th></tr></thead><tbody>";
    resumo.detalhes.forEach((d) => {
      html += "<tr><td>" + UI.escapeHtml(d.nome_completo || d.matricula) + "</td>";
      html += "<td>" + d.recomendacoes_geradas + "</td>";
      html += "<td>" + d.prospeccoes_geradas + "</td>";
      html += "<td>" + (d.erro ? UI.escapeHtml(d.erro) : "—") + "</td></tr>";
    });
    html += "</tbody></table></div>";
  }
  adminEls["geracao-lote-body"].innerHTML = html;
}

function closeGeracaoLoteModal() {
  adminEls["geracao-lote-modal"].hidden = true;
}

/* ---------------------------------------------------------------------
 * Relatório: todas as recomendações de todos os estudantes (Fase 13)
 * — para o admin ver quem foi compatível com o quê sem abrir o perfil
 * de cada estudante.
 * ------------------------------------------------------------------- */
async function loadRelatorioRecomendacoes() {
  await renderRelatorioRecomendacoes();
}

async function renderRelatorioRecomendacoes() {
  let recomendacoes = [];
  try {
    const resultado = await DataService.listarTodasRecomendacoes(
      relatorioNivelFiltro ? { nivel: relatorioNivelFiltro } : {}
    );
    recomendacoes = Array.isArray(resultado) ? resultado : [];
  } catch (err) {
    showToast("Não foi possível carregar o relatório de recomendações.");
  }

  adminEls["relatorio-rec-table-body"].innerHTML = "";
  adminEls["relatorio-rec-empty"].hidden = recomendacoes.length > 0;

  const tipoLabels = {
    aluno_para_vaga: "Vaga",
    aluno_para_empresa: "Prospecção",
    vaga_para_aluno: "Caminho inverso (vaga)",
    empresa_para_aluno: "Caminho inverso (empresa)",
  };

  recomendacoes.forEach((rec) => {
    const row = document.createElement("tr");

    const alunoCell = document.createElement("td");
    alunoCell.textContent = (rec.aluno && (rec.aluno.nome_completo || rec.aluno.matricula)) || "—";

    const cursoCell = document.createElement("td");
    cursoCell.textContent = (rec.aluno && rec.aluno.curso) || "—";

    const empresaCell = document.createElement("td");
    empresaCell.textContent = rec.empresa.nome;

    const vagaCell = document.createElement("td");
    vagaCell.textContent = rec.vaga ? rec.vaga.titulo : "(prospecção, sem vaga)";

    const tipoCell = document.createElement("td");
    tipoCell.textContent = tipoLabels[rec.tipo] || rec.tipo;

    const nivelCell = document.createElement("td");
    const nivelBadge = document.createElement("span");
    nivelBadge.className = "rec-level rec-level--" + (rec.nivel || "baixa");
    nivelBadge.textContent = rec.nivel || "—";
    nivelCell.appendChild(nivelBadge);

    const indiceCell = document.createElement("td");
    indiceCell.textContent = rec.indice_compatibilidade != null ? Math.round(rec.indice_compatibilidade) + "/100" : "—";

    const actionsCell = document.createElement("td");
    const detailBtn = document.createElement("button");
    detailBtn.type = "button";
    detailBtn.className = "btn btn-secondary btn-sm";
    detailBtn.textContent = "Ver detalhes";
    detailBtn.addEventListener("click", () => openRecomendacaoDetalheModal(rec));
    actionsCell.appendChild(detailBtn);

    row.appendChild(alunoCell);
    row.appendChild(cursoCell);
    row.appendChild(empresaCell);
    row.appendChild(vagaCell);
    row.appendChild(tipoCell);
    row.appendChild(nivelCell);
    row.appendChild(indiceCell);
    row.appendChild(actionsCell);
    adminEls["relatorio-rec-table-body"].appendChild(row);
  });
}

/* ---------------------------------------------------------------------
 * Modal estruturado: aluno + empresa + compatibilidade, com botão de
 * baixar o PDF para enviar à empresa (Fase 14).
 * ------------------------------------------------------------------- */
let recomendacaoDetalheAtual = null;

async function openRecomendacaoDetalheModal(rec) {
  recomendacaoDetalheAtual = rec;
  adminEls["recomendacao-detalhe-title"].textContent = "Recomendação — " + (rec.aluno ? rec.aluno.nome_completo || rec.aluno.matricula : "");
  adminEls["recomendacao-detalhe-body"].innerHTML = '<p class="field-hint">Carregando...</p>';
  adminEls["recomendacao-detalhe-modal"].hidden = false;

  let alunoDetalhe = null;
  let empresaDetalhe = null;
  try {
    [alunoDetalhe, empresaDetalhe] = await Promise.all([
      rec.aluno ? DataService.getStudentDetail(rec.aluno.id) : Promise.resolve(null),
      DataService.getCompanyDetail(rec.empresa.id),
    ]);
  } catch (err) {
    adminEls["recomendacao-detalhe-body"].innerHTML = '<p class="field-hint">Não foi possível carregar os detalhes.</p>';
    return;
  }

  const nivelLabels = { alta: "Alta compatibilidade", media: "Compatibilidade média", baixa: "Baixa compatibilidade" };
  let html = "";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Estudante — dados de contato</h3>';
  if (alunoDetalhe) {
    const p = alunoDetalhe.perfil;
    html += detailRow("Nome completo", p.full_name);
    html += detailRow("Matrícula", p.registration_number);
    html += detailRow("Curso", p.course);
    html += detailRow("Semestre atual", p.semester);
    html += detailRow("E-mail", p.email);
    html += detailRow("Telefone", p.phone);
    html += detailRow("LinkedIn", p.linkedin_url);
    if (alunoDetalhe.tecnologias.length) {
      html += '<div class="chip-list-preview" style="margin-top:8px;">';
      alunoDetalhe.tecnologias.forEach((t) => {
        html += '<span class="tag-pill">' + UI.escapeHtml(t.name) + " · " + UI.escapeHtml(t.level) + "</span>";
      });
      html += "</div>";
    }
  } else {
    html += '<p class="field-hint">Não foi possível carregar os dados do estudante.</p>';
  }
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Empresa / vaga</h3>';
  if (empresaDetalhe) {
    html += detailRow("Empresa", empresaDetalhe.nome);
    html += detailRow("CNPJ", empresaDetalhe.cnpj);
    html += detailRow("Área", empresaDetalhe.area);
    html += detailRow("Cidade/UF", [empresaDetalhe.cidade, empresaDetalhe.uf].filter(Boolean).join(" - "));
  }
  if (rec.vaga) {
    html += detailRow("Vaga", rec.vaga.titulo);
    html += detailRow("Modalidade", rec.vaga.modalidade);
    html += detailRow("Localização", rec.vaga.localizacao);
    html += detailRow("Bolsa", rec.vaga.bolsa);
    html += detailRow("Carga horária", rec.vaga.carga_horaria);
  } else {
    html += '<p class="field-hint">Prospecção — empresa compatível sem vaga ativa no momento.</p>';
  }
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Análise de compatibilidade</h3>';
  html +=
    '<span class="rec-level rec-level--' + (rec.nivel || "baixa") + '">' +
    UI.escapeHtml(nivelLabels[rec.nivel] || rec.nivel || "—") + "</span>";
  html += '<p class="field-hint" style="margin-top:8px;">Índice: ' + (rec.indice_compatibilidade != null ? Math.round(rec.indice_compatibilidade) + "/100" : "—") + "</p>";

  if (rec.pontos_compativeis && rec.pontos_compativeis.length) {
    html += '<p style="margin-bottom:4px;"><b>Pontos compatíveis</b></p>';
    html += '<div class="chip-list-preview">';
    rec.pontos_compativeis.forEach((p) => (html += '<span class="tag-pill">' + UI.escapeHtml(p) + "</span>"));
    html += "</div>";
  }
  if (rec.pontos_parciais && rec.pontos_parciais.length) {
    html += '<p style="margin:8px 0 4px;"><b>Compatibilidade parcial</b></p>';
    html += '<div class="chip-list-preview">';
    rec.pontos_parciais.forEach((p) => (html += '<span class="tag-pill">' + UI.escapeHtml(p) + "</span>"));
    html += "</div>";
  }
  if (rec.lacunas && rec.lacunas.length) {
    html += '<p style="margin:8px 0 4px;"><b>Lacunas</b></p>';
    html += '<div class="chip-list-preview">';
    rec.lacunas.forEach((p) => (html += '<span class="tag-pill tag-pill--muted">' + UI.escapeHtml(p) + "</span>"));
    html += "</div>";
  }
  if (rec.justificativa) {
    html += '<p style="margin-top:10px;">' + UI.escapeHtml(rec.justificativa) + "</p>";
  }
  html += "</div>";

  adminEls["recomendacao-detalhe-body"].innerHTML = html;
}

function closeRecomendacaoDetalheModal() {
  adminEls["recomendacao-detalhe-modal"].hidden = true;
  recomendacaoDetalheAtual = null;
}

async function handleBaixarPdfRecomendacao() {
  if (!recomendacaoDetalheAtual) return;
  adminEls["btn-baixar-pdf-recomendacao"].disabled = true;
  try {
    await DataService.baixarPdfRecomendacao(recomendacaoDetalheAtual.id);
  } catch (err) {
    showToast(err.message || "Não foi possível gerar o PDF.");
  } finally {
    adminEls["btn-baixar-pdf-recomendacao"].disabled = false;
  }
}

/* ---------------------------------------------------------------------
 * Eventos
 * ------------------------------------------------------------------- */
function wireAdminEvents() {
  adminEls["btn-logout"].addEventListener("click", handleLogout);
  adminEls["admin-search"].addEventListener("input", () => renderTable(students));

  adminEls["admin-detail-close"].addEventListener("click", closeDetailModal);
  adminEls["admin-detail-close-btn"].addEventListener("click", closeDetailModal);
  adminEls["admin-detail-modal"].addEventListener("click", (e) => {
    if (e.target === adminEls["admin-detail-modal"]) closeDetailModal();
  });

  adminEls["btn-criar-empresa"].addEventListener("click", handleCriarEmpresa);
  adminEls["empresas-search"].addEventListener("input", () => renderEmpresas());

  adminEls["empresa-detail-close"].addEventListener("click", closeEmpresaDetailModal);
  adminEls["empresa-detail-close-btn"].addEventListener("click", closeEmpresaDetailModal);
  adminEls["empresa-detail-modal"].addEventListener("click", (e) => {
    if (e.target === adminEls["empresa-detail-modal"]) closeEmpresaDetailModal();
  });

  adminEls["convenios-modal-close"].addEventListener("click", closeConveniosModal);
  adminEls["convenios-modal-close-btn"].addEventListener("click", closeConveniosModal);
  adminEls["convenios-modal"].addEventListener("click", (e) => {
    if (e.target === adminEls["convenios-modal"]) closeConveniosModal();
  });
  adminEls["btn-criar-convenio"].addEventListener("click", handleCriarConvenio);

  adminEls["btn-criar-vaga"].addEventListener("click", handleCriarVaga);
  adminEls["vagas-filtros"].addEventListener("click", (e) => {
    const btn = e.target.closest(".rec-filter");
    if (!btn) return;
    vagasAtuaisFiltro = btn.dataset.status;
    document.querySelectorAll("#vagas-filtros .rec-filter").forEach((b) => b.classList.toggle("is-active", b === btn));
    renderVagas();
  });
  adminEls["vagas-search"].addEventListener("input", () => renderVagas());

  adminEls["caminho-inverso-close"].addEventListener("click", closeCaminhoInversoModal);
  adminEls["caminho-inverso-close-btn"].addEventListener("click", closeCaminhoInversoModal);
  adminEls["caminho-inverso-modal"].addEventListener("click", (e) => {
    if (e.target === adminEls["caminho-inverso-modal"]) closeCaminhoInversoModal();
  });

  adminEls["btn-select-importacao-file"].addEventListener("click", () => adminEls["importacao-file-input"].click());
  adminEls["importacao-file-input"].addEventListener("change", (e) => handleImportacaoFile(e.target.files[0]));
  adminEls["importacao-dropzone"].addEventListener("dragover", (e) => e.preventDefault());
  adminEls["importacao-dropzone"].addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleImportacaoFile(file);
  });

  adminEls["btn-select-importacao-planilha-file"].addEventListener("click", () =>
    adminEls["importacao-planilha-file-input"].click()
  );
  adminEls["importacao-planilha-file-input"].addEventListener("change", (e) =>
    handleImportacaoPlanilhaFile(e.target.files[0])
  );
  adminEls["importacao-planilha-dropzone"].addEventListener("dragover", (e) => e.preventDefault());
  adminEls["importacao-planilha-dropzone"].addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleImportacaoPlanilhaFile(file);
  });

  adminEls["btn-gerar-recomendacoes-todos"].addEventListener("click", handleGerarRecomendacoesTodos);
  adminEls["geracao-lote-close"].addEventListener("click", closeGeracaoLoteModal);
  adminEls["geracao-lote-close-btn"].addEventListener("click", closeGeracaoLoteModal);
  adminEls["geracao-lote-modal"].addEventListener("click", (e) => {
    if (e.target === adminEls["geracao-lote-modal"]) closeGeracaoLoteModal();
  });

  adminEls["relatorio-rec-filtros"].addEventListener("click", (e) => {
    const btn = e.target.closest(".rec-filter");
    if (!btn) return;
    relatorioNivelFiltro = btn.dataset.nivel;
    document.querySelectorAll("#relatorio-rec-filtros .rec-filter").forEach((b) => b.classList.toggle("is-active", b === btn));
    renderRelatorioRecomendacoes();
  });

  adminEls["recomendacao-detalhe-close"].addEventListener("click", closeRecomendacaoDetalheModal);
  adminEls["recomendacao-detalhe-close-btn"].addEventListener("click", closeRecomendacaoDetalheModal);
  adminEls["recomendacao-detalhe-modal"].addEventListener("click", (e) => {
    if (e.target === adminEls["recomendacao-detalhe-modal"]) closeRecomendacaoDetalheModal();
  });
  adminEls["btn-baixar-pdf-recomendacao"].addEventListener("click", handleBaixarPdfRecomendacao);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeDetailModal();
    closeEmpresaDetailModal();
    closeConveniosModal();
    closeCaminhoInversoModal();
    closeGeracaoLoteModal();
    closeRecomendacaoDetalheModal();
  });
}

document.addEventListener("DOMContentLoaded", init);
