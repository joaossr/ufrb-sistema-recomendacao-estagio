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

function cacheAdminElements() {
  [
    "admin-summary", "admin-stats", "admin-search", "admin-table-body", "admin-empty",
    "admin-detail-modal", "admin-detail-title", "admin-detail-body",
    "admin-detail-close", "admin-detail-close-btn",
    "empresa-nome-input", "empresa-cnpj-input", "btn-criar-empresa",
    "empresas-table-body", "empresas-empty",
    "convenios-modal", "convenios-modal-title", "convenios-modal-close", "convenios-modal-close-btn",
    "convenio-processo-input", "convenio-data-inicio-input", "convenio-data-fim-input",
    "btn-criar-convenio", "convenios-lista",
    "vaga-empresa-select", "vaga-titulo-input", "vaga-cursos-input", "vaga-tecnologias-input",
    "vaga-modalidade-select", "vaga-bolsa-input", "vaga-descricao-input", "btn-criar-vaga",
    "vagas-filtros", "vagas-table-body", "vagas-empty",
    "caminho-inverso-modal", "caminho-inverso-title", "caminho-inverso-body",
    "caminho-inverso-close", "caminho-inverso-close-btn",
    "importacao-dropzone", "btn-select-importacao-file", "importacao-file-input",
    "importacao-upload-state", "importacao-loading-state",
    "importacao-resultado", "importacao-resultado-body",
    "importacoes-table-body", "importacoes-empty",
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
  adminEls["empresas-table-body"].innerHTML = "";
  adminEls["empresas-empty"].hidden = companies.length > 0;

  companies.forEach((empresa) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = empresa.nome;

    const cnpjCell = document.createElement("td");
    cnpjCell.textContent = empresa.cnpj || "—";

    const dateCell = document.createElement("td");
    dateCell.textContent = new Date(empresa.created_at).toLocaleDateString("pt-BR");

    const actionsCell = document.createElement("td");
    const convBtn = document.createElement("button");
    convBtn.type = "button";
    convBtn.className = "btn btn-secondary btn-sm";
    convBtn.textContent = "Convênios";
    convBtn.addEventListener("click", () => openConveniosModal(empresa));
    const prospBtn = document.createElement("button");
    prospBtn.type = "button";
    prospBtn.className = "btn btn-outline btn-sm";
    prospBtn.style.marginLeft = "8px";
    prospBtn.textContent = "Buscar estudantes compatíveis";
    prospBtn.addEventListener("click", () => gerarCaminhoInversoEmpresa(empresa));
    actionsCell.appendChild(convBtn);
    actionsCell.appendChild(prospBtn);

    row.appendChild(nameCell);
    row.appendChild(cnpjCell);
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

  adminEls["vagas-table-body"].innerHTML = "";
  adminEls["vagas-empty"].hidden = vagas.length > 0;

  const empresasPorId = new Map(companies.map((e) => [e.id, e.nome]));

  vagas.forEach((vaga) => {
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
      if (!window.confirm('Excluir a vaga "' + vaga.titulo + '"? Esta ação não pode ser desfeita.')) return;
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

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeDetailModal();
    closeConveniosModal();
    closeCaminhoInversoModal();
  });
}

document.addEventListener("DOMContentLoaded", init);
