/**
 * perfil.js
 * Controlador da página "Meu Perfil": conecta os elementos do DOM à
 * camada de dados (DataService) e às funções de renderização (UI).
 * Todo acesso a dados passa por DataService, então trocar a persistência
 * local por Supabase no futuro não exige mudanças aqui.
 */

const els = {};
let editingProjectId = null;
let modalProjectTechs = [];
let expTechs = [];
let tccKeywords = [];
let selectedInterests = [];
let interestCatalogCache = [];
let lattesParsedData = null;
let courseCombobox = null;

function cacheElements() {
  [
    "course-input", "semester-select", "graduation-select",
    "registration-input", "btn-logout",
    "linkedin-input", "linkedin-error",
    "tcc-status-select", "tcc-details", "tcc-title-input", "tcc-summary-input",
    "tcc-keywords-input", "tcc-keywords-tags", "tcc-advisor-input",
    "tech-input", "tech-level-select", "btn-add-tech", "tech-chip-list",
    "projects-empty", "projects-grid", "btn-add-project",
    "exp-toggle-yes", "exp-toggle-no", "experience-form", "experience-list",
    "exp-company", "exp-role", "exp-work-area", "exp-start-date", "exp-end-date",
    "exp-current-checkbox", "exp-description",
    "exp-tech-input", "exp-tech-tags", "btn-add-experience",
    "interest-input", "interest-tags",
    "btn-import-lattes", "btn-fill-manually",
    "project-modal", "project-modal-title", "project-modal-close",
    "project-name", "project-description",
    "project-center", "project-course-input", "project-area-input", "project-type-input",
    "project-tech-input", "project-tech-tags", "project-link",
    "project-cancel-btn", "project-save-btn",
    "lattes-modal", "lattes-modal-close", "lattes-cancel-btn",
    "lattes-dropzone", "btn-select-lattes-file", "lattes-file-input",
    "lattes-upload-state", "lattes-loading-state", "lattes-preview-state",
    "lattes-preview-filename", "lattes-preview-name", "lattes-preview-id",
    "lattes-preview-formations", "lattes-preview-languages-block", "lattes-preview-languages",
    "lattes-preview-complementary-block", "lattes-preview-complementary",
    "lattes-apply-btn",
    "lattes-identity-block", "lattes-identity-name", "lattes-identity-meta",
    "btn-save-profile", "btn-cancel", "save-hint",
    "progress-fill", "progress-value", "toast",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

/* ---------------------------------------------------------------------
 * Inicialização
 * ------------------------------------------------------------------- */
async function init() {
  if (!AuthService.getCurrentUser()) {
    window.location.href = "login.html";
    return;
  }

  cacheElements();
  populateStaticOptions();
  setupComboboxes();
  wireEvents();
  wireInterestAutocomplete();
  wireLogout();
  wireApiErrorSafetyNet();

  interestCatalogCache = await DataService.listInterestAreaCatalog();
  await renderAll();
}

/** Rede de segurança para chamadas à API que falharem sem um try/catch
 * dedicado (ex.: token expirado no meio da sessão) — sem isso, o erro
 * vira uma unhandled promise rejection silenciosa e o usuário não
 * entende por que a ação não salvou. */
function wireApiErrorSafetyNet() {
  window.addEventListener("unhandledrejection", (event) => {
    console.error(event.reason);
    if (!AuthService.getCurrentUser()) {
      window.location.href = "login.html";
      return;
    }
    const message = (event.reason && event.reason.message) || "Ocorreu um erro ao salvar. Tente novamente.";
    UI.showToast(els["toast"], message, true);
  });
}

function wireLogout() {
  els["btn-logout"].addEventListener("click", () => {
    AuthService.logout();
    window.location.href = "login.html";
  });
}

function populateSelectFromPairs(selectEl, pairs, placeholder) {
  selectEl.innerHTML = "";
  if (placeholder) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    opt.disabled = true;
    opt.selected = true;
    selectEl.appendChild(opt);
  }
  pairs.forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  });
}

function populateStaticOptions() {
  UI.populateSelect(els["semester-select"], SEMESTER_OPTIONS, "Selecione o semestre");
  UI.populateSelect(els["graduation-select"], GRADUATION_YEARS, "Selecione o ano");
  UI.populateSelect(els["tech-level-select"], TECH_LEVELS);
  UI.populateSelect(els["exp-work-area"], PROJECT_AREAS, "Selecione a área");

  populateSelectFromPairs(
    els["tcc-status-select"],
    TCC_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
  );

  populateSelectFromPairs(
    els["project-center"],
    ACADEMIC_CENTERS.map((c) => ({ value: c.id, label: c.name })),
    "Selecione o centro acadêmico"
  );
}

function setupComboboxes() {
  courseCombobox = GroupedCombobox.attach(els["course-input"], {
    getGroups: () => buildCourseGroups(),
    emptyMessage: "Nenhum curso encontrado.",
    onSelect: async (option) => {
      await DataService.saveProfile({
        course: option ? option.name : "",
        course_id: option ? option.id : null,
      });
      await atualizarProgresso();
    },
  });

  // Área/Tipo de projeto são sugeridos conforme o Centro + Curso
  // escolhidos (ver ui.js: getProjectOptionsForCourse), mas continuam
  // aceitando texto livre — não viram uma seleção fechada.
  Combobox.attach(els["project-area-input"], {
    getOptions: () =>
      getProjectOptionsForCourse(els["project-center"].value, els["project-course-input"].value).areas,
  });
  Combobox.attach(els["project-type-input"], {
    getOptions: () =>
      getProjectOptionsForCourse(els["project-center"].value, els["project-course-input"].value).types,
  });
  Combobox.attach(els["project-course-input"], {
    getOptions: () => COURSES_BY_CENTER[els["project-center"].value] || [],
  });
  Combobox.attach(els["tcc-advisor-input"], { getOptions: () => ORIENTADORES_SUGESTOES });
}

async function renderAll() {
  const [profile, technologies, projects, experiences, interests] = await Promise.all([
    DataService.getProfile(),
    DataService.listTechnologies(),
    DataService.listProjects(),
    DataService.listExperiences(),
    DataService.listInterests(),
  ]);

  courseCombobox.setValue(profile.course_id ? { id: profile.course_id, name: profile.course } : null);
  els["semester-select"].value = profile.semester || "";
  els["graduation-select"].value = profile.expected_graduation || "";
  els["registration-input"].value = profile.registration_number || "";
  els["linkedin-input"].value = profile.linkedin_url || "";

  els["tcc-status-select"].value = profile.tcc_status || "nao_iniciou";
  els["tcc-details"].hidden = (profile.tcc_status || "nao_iniciou") === "nao_iniciou";
  els["tcc-title-input"].value = profile.tcc_title || "";
  els["tcc-summary-input"].value = profile.tcc_summary || "";
  els["tcc-advisor-input"].value = profile.tcc_advisor || "";
  tccKeywords = [...(profile.tcc_keywords || [])];
  UI.renderProjectTagInputList(els["tcc-keywords-tags"], tccKeywords, removeTccKeyword);

  const hasIdentity = profile.full_name || profile.email || profile.phone || profile.registration_number;
  if (hasIdentity) {
    els["lattes-identity-block"].hidden = false;
    els["lattes-identity-name"].textContent = profile.full_name || "Nome não identificado";
    const metaParts = [];
    if (profile.email) metaParts.push(profile.email);
    if (profile.phone) metaParts.push(profile.phone);
    if (profile.registration_number) metaParts.push("Matrícula " + profile.registration_number);
    els["lattes-identity-meta"].textContent = metaParts.length
      ? " · " + metaParts.join(" · ")
      : "";
  } else {
    els["lattes-identity-block"].hidden = true;
  }

  UI.renderTechChips(els["tech-chip-list"], technologies, {
    onLevelChange: editarTecnologia,
    onRemove: removerTecnologia,
  });

  UI.renderProjects(els["projects-grid"], els["projects-empty"], projects, {
    onEdit: editarProjeto,
    onDelete: excluirProjeto,
  });

  UI.renderExperiences(els["experience-list"], experiences, excluirExperiencia);
  setExperienceToggle(experiences.length > 0 || profile.has_experience);

  selectedInterests = [...interests];
  UI.renderProjectTagInputList(els["interest-tags"], selectedInterests, removeInterestTag);

  await atualizarProgresso();
}

/* ---------------------------------------------------------------------
 * Curso
 * ------------------------------------------------------------------- */
function wireCourseFields() {
  const persist = async () => {
    await DataService.saveProfile({
      semester: els["semester-select"].value,
      expected_graduation: els["graduation-select"].value,
    });
    await atualizarProgresso();
  };
  els["semester-select"].addEventListener("change", persist);
  els["graduation-select"].addEventListener("change", persist);
}

/* ---------------------------------------------------------------------
 * LinkedIn
 * ------------------------------------------------------------------- */
function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (err) {
    return false;
  }
}

async function wireLinkedinField() {
  els["linkedin-input"].addEventListener("blur", async () => {
    const value = els["linkedin-input"].value.trim();
    const isValid = !value || isValidUrl(value);
    els["linkedin-error"].hidden = isValid;
    if (isValid) {
      await DataService.saveProfile({ linkedin_url: value });
    }
  });
}

/* ---------------------------------------------------------------------
 * TCC
 * ------------------------------------------------------------------- */
function updateTccDetailsVisibility() {
  els["tcc-details"].hidden = els["tcc-status-select"].value === "nao_iniciou";
}

function removeTccKeyword(index) {
  tccKeywords.splice(index, 1);
  UI.renderProjectTagInputList(els["tcc-keywords-tags"], tccKeywords, removeTccKeyword);
  DataService.saveProfile({ tcc_keywords: [...tccKeywords] });
}

function addTccKeywordFromInput() {
  const value = els["tcc-keywords-input"].value.trim();
  if (!value) return;
  if (!tccKeywords.includes(value)) {
    tccKeywords.push(value);
    UI.renderProjectTagInputList(els["tcc-keywords-tags"], tccKeywords, removeTccKeyword);
    DataService.saveProfile({ tcc_keywords: [...tccKeywords] });
  }
  els["tcc-keywords-input"].value = "";
}

function wireTccFields() {
  els["tcc-status-select"].addEventListener("change", async () => {
    updateTccDetailsVisibility();
    await DataService.saveProfile({ tcc_status: els["tcc-status-select"].value });
  });

  els["tcc-title-input"].addEventListener("blur", () => {
    DataService.saveProfile({ tcc_title: els["tcc-title-input"].value.trim() });
  });
  els["tcc-summary-input"].addEventListener("blur", () => {
    DataService.saveProfile({ tcc_summary: els["tcc-summary-input"].value.trim() });
  });
  els["tcc-advisor-input"].addEventListener("blur", () => {
    DataService.saveProfile({ tcc_advisor: els["tcc-advisor-input"].value.trim() });
  });
  els["tcc-keywords-input"].addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTccKeywordFromInput();
    }
  });
}

/* ---------------------------------------------------------------------
 * Tecnologias
 * ------------------------------------------------------------------- */
async function adicionarTecnologia() {
  const name = els["tech-input"].value.trim();
  if (!name) {
    els["tech-input"].focus();
    return;
  }
  const level = els["tech-level-select"].value || "Básico";
  await DataService.addTechnology({ name, level });
  els["tech-input"].value = "";
  els["tech-input"].focus();
  await renderAll();
}

async function editarTecnologia(id, newLevel) {
  await DataService.updateTechnology(id, { level: newLevel });
}

async function removerTecnologia(id) {
  const ok = await UI.confirmAction("Remover esta tecnologia do seu perfil?", { confirmLabel: "Remover" });
  if (!ok) return;
  await DataService.removeTechnology(id);
  await renderAll();
}

/* ---------------------------------------------------------------------
 * Projetos
 * ------------------------------------------------------------------- */
function abrirModal(modalEl) {
  modalEl.hidden = false;
}

function fecharModal(modalEl) {
  modalEl.hidden = true;
}

function setProjectCourseEnabled(enabled) {
  els["project-course-input"].disabled = !enabled;
  els["project-course-input"].placeholder = enabled
    ? "Digite para buscar o curso"
    : "Selecione o Centro Acadêmico primeiro";
}

function abrirModalProjeto() {
  editingProjectId = null;
  modalProjectTechs = [];
  els["project-modal-title"].textContent = "Adicionar projeto";
  els["project-name"].value = "";
  els["project-description"].value = "";
  els["project-center"].value = "";
  els["project-course-input"].value = "";
  setProjectCourseEnabled(false);
  els["project-area-input"].value = "";
  els["project-type-input"].value = "";
  els["project-link"].value = "";
  els["project-tech-input"].value = "";
  UI.renderProjectTagInputList(els["project-tech-tags"], modalProjectTechs, removeModalProjectTech);
  abrirModal(els["project-modal"]);
  els["project-name"].focus();
}

async function editarProjeto(id) {
  const projects = await DataService.listProjects();
  const project = projects.find((p) => p.id === id);
  if (!project) return;

  editingProjectId = id;
  modalProjectTechs = [...(project.technologies || [])];
  els["project-modal-title"].textContent = "Editar projeto";
  els["project-name"].value = project.name;
  els["project-description"].value = project.description;
  els["project-center"].value = project.academic_center || "";
  setProjectCourseEnabled(Boolean(project.academic_center));
  els["project-course-input"].value = project.course || "";
  els["project-area-input"].value = project.area || "";
  els["project-type-input"].value = project.type || "";
  els["project-link"].value = project.link || "";
  els["project-tech-input"].value = "";
  UI.renderProjectTagInputList(els["project-tech-tags"], modalProjectTechs, removeModalProjectTech);
  abrirModal(els["project-modal"]);
}

function removeModalProjectTech(index) {
  modalProjectTechs.splice(index, 1);
  UI.renderProjectTagInputList(els["project-tech-tags"], modalProjectTechs, removeModalProjectTech);
}

function addModalProjectTechFromInput() {
  const value = els["project-tech-input"].value.trim();
  if (!value) return;
  if (!modalProjectTechs.includes(value)) {
    modalProjectTechs.push(value);
    UI.renderProjectTagInputList(els["project-tech-tags"], modalProjectTechs, removeModalProjectTech);
  }
  els["project-tech-input"].value = "";
}

async function adicionarProjeto() {
  const name = els["project-name"].value.trim();
  const description = els["project-description"].value.trim();
  const link = els["project-link"].value.trim();

  if (!name || !description) {
    UI.showToast(els["toast"], "Preencha o nome e a descrição do projeto.", true);
    return;
  }

  if (link && !isValidUrl(link)) {
    UI.showToast(els["toast"], "Informe uma URL válida para o link do projeto.", true);
    return;
  }

  const payload = {
    name,
    description,
    academic_center: els["project-center"].value,
    course: els["project-course-input"].value.trim(),
    area: els["project-area-input"].value.trim(),
    type: els["project-type-input"].value.trim(),
    technologies: [...modalProjectTechs],
    link,
  };

  if (editingProjectId) {
    await DataService.updateProject(editingProjectId, payload);
  } else {
    await DataService.addProject(payload);
  }

  fecharModal(els["project-modal"]);
  await renderAll();
}

async function excluirProjeto(id) {
  const ok = await UI.confirmAction("Excluir este projeto? Esta ação não pode ser desfeita.");
  if (!ok) return;
  await DataService.deleteProject(id);
  await renderAll();
}

/* ---------------------------------------------------------------------
 * Experiências
 * ------------------------------------------------------------------- */
function setExperienceToggle(hasExperience) {
  els["exp-toggle-yes"].classList.toggle("is-selected", hasExperience);
  els["exp-toggle-no"].classList.toggle("is-selected", !hasExperience);
  els["experience-form"].hidden = !hasExperience;
}

async function onExperienceToggle(hasExperience) {
  setExperienceToggle(hasExperience);
  await DataService.saveProfile({ has_experience: hasExperience });
}

function addExpTechFromInput() {
  const value = els["exp-tech-input"].value.trim();
  if (!value) return;
  if (!expTechs.includes(value)) {
    expTechs.push(value);
    UI.renderProjectTagInputList(els["exp-tech-tags"], expTechs, removeExpTech);
  }
  els["exp-tech-input"].value = "";
}

function removeExpTech(index) {
  expTechs.splice(index, 1);
  UI.renderProjectTagInputList(els["exp-tech-tags"], expTechs, removeExpTech);
}

function toggleExpCurrentJob() {
  const isCurrent = els["exp-current-checkbox"].checked;
  els["exp-end-date"].disabled = isCurrent;
  if (isCurrent) els["exp-end-date"].value = "";
}

async function adicionarExperiencia() {
  const company = els["exp-company"].value.trim();
  const role = els["exp-role"].value.trim();

  if (!company || !role) {
    UI.showToast(els["toast"], "Informe empresa e cargo/função.", true);
    return;
  }

  const isCurrent = els["exp-current-checkbox"].checked;

  await DataService.addExperience({
    company,
    role,
    work_area: els["exp-work-area"].value,
    start_date: els["exp-start-date"].value,
    end_date: isCurrent ? "" : els["exp-end-date"].value,
    is_current: isCurrent,
    description: els["exp-description"].value.trim(),
    technologies: [...expTechs],
  });

  els["exp-company"].value = "";
  els["exp-role"].value = "";
  els["exp-work-area"].value = "";
  els["exp-start-date"].value = "";
  els["exp-end-date"].value = "";
  els["exp-current-checkbox"].checked = false;
  els["exp-end-date"].disabled = false;
  els["exp-description"].value = "";
  expTechs = [];
  UI.renderProjectTagInputList(els["exp-tech-tags"], expTechs, removeExpTech);

  await renderAll();
}

async function excluirExperiencia(id) {
  const ok = await UI.confirmAction("Excluir esta experiência? Esta ação não pode ser desfeita.");
  if (!ok) return;
  await DataService.deleteExperience(id);
  await renderAll();
}

/* ---------------------------------------------------------------------
 * Áreas de interesse — autocomplete com criação de novas áreas
 * ------------------------------------------------------------------- */
function renderInterestSuggestions() {
  const box = document.getElementById("interest-suggestions");
  if (!box) return;

  const query = els["interest-input"].value.trim();
  const lowerQuery = query.toLowerCase();
  const available = interestCatalogCache.filter(
    (name) => !selectedInterests.some((s) => s.toLowerCase() === name.toLowerCase())
  );
  // Sem texto digitado (primeiro clique), mostra a lista inteira; ao
  // digitar, filtra pelo termo (sem limite de itens — o menu já rola).
  const matches = query
    ? available.filter((name) => name.toLowerCase().includes(lowerQuery))
    : available;

  box.innerHTML = "";

  if (matches.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "combobox__empty";
    emptyLi.textContent = "Nenhuma área encontrada.";
    box.appendChild(emptyLi);

    if (query) {
      const createLi = document.createElement("li");
      createLi.className = "combobox__create";
      createLi.textContent = "+ Adicionar “" + query + "”";
      createLi.addEventListener("mousedown", (e) => {
        e.preventDefault();
        createInterestArea(query);
      });
      box.appendChild(createLi);
    }
    box.hidden = false;
    return;
  }

  matches.forEach((name) => {
    const li = document.createElement("li");
    li.className = "combobox__option";
    li.textContent = name;
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      selectInterestArea(name);
    });
    box.appendChild(li);
  });
  box.hidden = false;
}

async function selectInterestArea(name) {
  const box = document.getElementById("interest-suggestions");
  if (selectedInterests.some((a) => a.toLowerCase() === name.toLowerCase())) {
    els["interest-input"].value = "";
    if (box) box.hidden = true;
    return;
  }
  selectedInterests.push(name);
  UI.renderProjectTagInputList(els["interest-tags"], selectedInterests, removeInterestTag);
  els["interest-input"].value = "";
  if (box) box.hidden = true;
  await DataService.setInterests([...selectedInterests]);
  await atualizarProgresso();
}

async function createInterestArea(query) {
  const created = await DataService.addInterestAreaToCatalog(query);
  if (!created) return;
  interestCatalogCache = await DataService.listInterestAreaCatalog();
  await selectInterestArea(created);
}

async function removeInterestTag(index) {
  selectedInterests.splice(index, 1);
  UI.renderProjectTagInputList(els["interest-tags"], selectedInterests, removeInterestTag);
  await DataService.setInterests([...selectedInterests]);
  await atualizarProgresso();
}

function wireInterestAutocomplete() {
  els["interest-input"].addEventListener("input", renderInterestSuggestions);
  els["interest-input"].addEventListener("focus", renderInterestSuggestions);
  els["interest-input"].addEventListener("blur", () => {
    window.setTimeout(() => {
      const box = document.getElementById("interest-suggestions");
      if (box) box.hidden = true;
    }, 120);
  });
  els["interest-input"].addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const box = document.getElementById("interest-suggestions");
      if (box) box.hidden = true;
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const query = els["interest-input"].value.trim();
    if (!query) return;
    const lower = query.toLowerCase();
    const available = interestCatalogCache.filter(
      (name) => !selectedInterests.some((s) => s.toLowerCase() === name.toLowerCase())
    );
    const exact = available.find((name) => name.toLowerCase() === lower);
    if (exact) {
      selectInterestArea(exact);
      return;
    }
    const partial = available.find((name) => name.toLowerCase().includes(lower));
    if (partial) {
      selectInterestArea(partial);
      return;
    }
    createInterestArea(query);
  });
}

/* ---------------------------------------------------------------------
 * Progresso de preenchimento
 * ------------------------------------------------------------------- */
function missingProfileParts(state) {
  const missing = [];
  if (!state.profile.course) missing.push("o curso");
  if (state.technologies.length === 0) missing.push("as tecnologias");
  if (state.projects.length === 0) missing.push("os projetos");
  if (state.interests.length === 0) missing.push("as áreas de interesse");
  return missing;
}

async function atualizarProgresso() {
  const state = await DataService.getFullState();
  const percent = UI.computeCompletionPercent(state);

  els["progress-fill"].style.width = percent + "%";
  els["progress-value"].textContent = percent + "%";

  const isComplete = percent >= 100;
  els["btn-save-profile"].disabled = !isComplete;
  els["save-hint"].classList.toggle("is-complete", isComplete);

  if (isComplete) {
    els["save-hint"].textContent = "Perfil completo — pronto para salvar.";
  } else {
    const missing = missingProfileParts(state);
    els["save-hint"].textContent = "Preencha " + missing.join(", ") + " para habilitar o salvamento.";
  }

  return percent;
}

/* ---------------------------------------------------------------------
 * Importação Lattes — Fase 4: o XML é enviado ao backend, que processa
 * e devolve a prévia; nada é gravado até o usuário confirmar.
 * ------------------------------------------------------------------- */
function resetLattesModal() {
  lattesParsedData = null;
  els["lattes-upload-state"].hidden = false;
  els["lattes-loading-state"].hidden = true;
  els["lattes-preview-state"].hidden = true;
  els["lattes-apply-btn"].hidden = true;
  els["lattes-cancel-btn"].textContent = "Fechar";
  els["lattes-file-input"].value = "";
  els["lattes-dropzone"].style.borderColor = "";
}

function showLattesError(message) {
  els["lattes-loading-state"].hidden = true;
  els["lattes-upload-state"].hidden = false;
  els["lattes-preview-state"].hidden = true;
  els["lattes-apply-btn"].hidden = true;
  UI.showToast(els["toast"], message, true);
}

async function handleLattesFile(file) {
  if (!file) return;

  if (!/\.xml$/i.test(file.name)) {
    showLattesError("Selecione o arquivo XML exportado do Currículo Lattes.");
    return;
  }

  els["lattes-upload-state"].hidden = true;
  els["lattes-loading-state"].hidden = false;
  els["lattes-preview-state"].hidden = true;

  try {
    const result = await DataService.previewLattes(file);
    lattesParsedData = result;
    showLattesPreview(file, result);
  } catch (err) {
    showLattesError(err.message || "Não foi possível processar o arquivo selecionado.");
  }
}

function showLattesPreview(file, data) {
  els["lattes-preview-filename"].textContent = file.name;
  els["lattes-preview-name"].textContent = data.full_name || "Não identificado no arquivo";
  els["lattes-preview-id"].textContent = data.lattes_id || "Não identificado no arquivo";

  els["lattes-preview-formations"].innerHTML = "";
  if (data.formations.length === 0) {
    const empty = document.createElement("p");
    empty.className = "field-hint";
    empty.textContent = "Nenhuma formação acadêmica encontrada neste arquivo.";
    els["lattes-preview-formations"].appendChild(empty);
  } else {
    const preferredIndex = Math.max(
      0,
      data.formations.findIndex((f) => f.level_tag === "GRADUACAO")
    );
    data.formations.forEach((formation, index) => {
      const label = document.createElement("label");
      label.className = "lattes-formation-option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "lattes-formation-choice";
      radio.value = String(index);
      radio.checked = index === preferredIndex;

      const info = document.createElement("div");
      const levelBadge = document.createElement("span");
      levelBadge.className = "lattes-formation-option__level";
      levelBadge.textContent = formation.level;
      const course = document.createElement("div");
      course.className = "lattes-formation-option__course";
      course.textContent = formation.course;
      const institution = document.createElement("div");
      institution.className = "lattes-formation-option__institution";
      institution.textContent = formation.institution;

      info.appendChild(levelBadge);
      info.appendChild(course);
      info.appendChild(institution);

      const metaParts = [];
      if (formation.status) metaParts.push("Status: " + formation.status);
      if (formation.start_year) metaParts.push("Início: " + formation.start_year);
      if (metaParts.length) {
        const meta = document.createElement("div");
        meta.className = "lattes-formation-option__meta";
        meta.textContent = metaParts.join(" · ");
        info.appendChild(meta);
      }

      label.appendChild(radio);
      label.appendChild(info);
      els["lattes-preview-formations"].appendChild(label);
    });
  }

  const languages = data.languages || [];
  els["lattes-preview-languages"].innerHTML = "";
  els["lattes-preview-languages-block"].hidden = languages.length === 0;
  languages.forEach((lang) => {
    const card = document.createElement("div");
    card.className = "lattes-language-card";

    const name = document.createElement("div");
    name.className = "lattes-language-card__name";
    name.textContent = lang.name;
    card.appendChild(name);

    const skills = document.createElement("div");
    skills.className = "lattes-language-card__skills";
    [
      ["Leitura", lang.reading],
      ["Fala", lang.speaking],
      ["Escrita", lang.writing],
      ["Compreensão", lang.comprehension],
    ].forEach(([label, value]) => {
      if (!value) return;
      const item = document.createElement("span");
      item.textContent = label + ": " + value;
      skills.appendChild(item);
    });
    card.appendChild(skills);

    els["lattes-preview-languages"].appendChild(card);
  });

  const complementaryFormations = data.complementary_formations || [];
  els["lattes-preview-complementary"].innerHTML = "";
  els["lattes-preview-complementary-block"].hidden = complementaryFormations.length === 0;
  complementaryFormations.forEach((item) => {
    const card = document.createElement("div");
    card.className = "lattes-language-card";

    const name = document.createElement("div");
    name.className = "lattes-language-card__name";
    name.textContent = item.nome;
    card.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "lattes-language-card__skills";
    const metaParts = [item.instituicao, item.ano].filter(Boolean);
    if (metaParts.length) {
      const span = document.createElement("span");
      span.textContent = metaParts.join(" · ");
      meta.appendChild(span);
    }
    card.appendChild(meta);

    els["lattes-preview-complementary"].appendChild(card);
  });

  els["lattes-loading-state"].hidden = true;
  els["lattes-preview-state"].hidden = false;
  els["lattes-apply-btn"].hidden = false;
  els["lattes-cancel-btn"].textContent = "Cancelar";
}

async function aplicarImportacaoLattes() {
  if (!lattesParsedData) return;

  // O e-mail institucional e a matrícula já vêm da conta (ver cadastro.html)
  // e nunca são pedidos de novo aqui — o backend também nunca sobrescreve
  // esses dois campos (ver backend/app/routers/lattes.py).
  const chosenInput = els["lattes-preview-formations"].querySelector(
    "input[name='lattes-formation-choice']:checked"
  );
  const chosen = chosenInput ? lattesParsedData.formations[Number(chosenInput.value)] : null;

  const { course_matched } = await DataService.confirmarLattes({
    full_name: lattesParsedData.full_name || "",
    lattes_id: lattesParsedData.lattes_id || "",
    chosen_formation: chosen || null,
    languages: lattesParsedData.languages || [],
    complementary_formations: lattesParsedData.complementary_formations || [],
  });

  fecharModal(els["lattes-modal"]);
  resetLattesModal();
  await renderAll();

  if (chosen && !course_matched) {
    UI.showToast(
      els["toast"],
      "Dados do Lattes aplicados. O curso identificado não está na lista padronizada — selecione seu curso manualmente.",
      true
    );
  } else {
    UI.showToast(els["toast"], "Dados do Currículo Lattes confirmados e aplicados ao seu perfil.");
  }
}

/* ---------------------------------------------------------------------
 * Salvar perfil
 * ------------------------------------------------------------------- */
async function salvarPerfil() {
  await DataService.saveProfile({
    semester: els["semester-select"].value,
    expected_graduation: els["graduation-select"].value,
  });
  await atualizarProgresso();
  UI.showToast(els["toast"], "Perfil salvo.");
}

/* ---------------------------------------------------------------------
 * Wiring de eventos
 * ------------------------------------------------------------------- */
function wireEvents() {
  wireCourseFields();
  wireLinkedinField();
  wireTccFields();

  els["btn-add-tech"].addEventListener("click", adicionarTecnologia);
  els["tech-input"].addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      adicionarTecnologia();
    }
  });

  els["btn-add-project"].addEventListener("click", abrirModalProjeto);
  els["project-modal-close"].addEventListener("click", () => fecharModal(els["project-modal"]));
  els["project-cancel-btn"].addEventListener("click", () => fecharModal(els["project-modal"]));
  els["project-modal"].addEventListener("click", (e) => {
    if (e.target === els["project-modal"]) fecharModal(els["project-modal"]);
  });
  els["project-save-btn"].addEventListener("click", adicionarProjeto);
  els["project-tech-input"].addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addModalProjectTechFromInput();
    }
  });
  els["project-center"].addEventListener("change", () => {
    els["project-course-input"].value = "";
    els["project-area-input"].value = "";
    els["project-type-input"].value = "";
    setProjectCourseEnabled(Boolean(els["project-center"].value));
  });

  els["exp-toggle-yes"].addEventListener("click", () => onExperienceToggle(true));
  els["exp-toggle-no"].addEventListener("click", () => onExperienceToggle(false));
  els["exp-current-checkbox"].addEventListener("change", toggleExpCurrentJob);
  els["btn-add-experience"].addEventListener("click", adicionarExperiencia);
  els["exp-tech-input"].addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addExpTechFromInput();
    }
  });

  els["btn-import-lattes"].addEventListener("click", () => {
    resetLattesModal();
    abrirModal(els["lattes-modal"]);
  });
  els["btn-fill-manually"].addEventListener("click", () => {
    document.querySelector(".card--priority").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const closeLattesModal = () => {
    fecharModal(els["lattes-modal"]);
    resetLattesModal();
  };
  els["lattes-modal-close"].addEventListener("click", closeLattesModal);
  els["lattes-cancel-btn"].addEventListener("click", closeLattesModal);
  els["lattes-modal"].addEventListener("click", (e) => {
    if (e.target === els["lattes-modal"]) closeLattesModal();
  });
  els["lattes-apply-btn"].addEventListener("click", aplicarImportacaoLattes);
  els["btn-select-lattes-file"].addEventListener("click", () => els["lattes-file-input"].click());
  els["lattes-file-input"].addEventListener("change", (e) => handleLattesFile(e.target.files[0]));

  els["lattes-dropzone"].addEventListener("dragover", (e) => {
    e.preventDefault();
    els["lattes-dropzone"].style.borderColor = "var(--primary)";
  });
  els["lattes-dropzone"].addEventListener("dragleave", () => {
    els["lattes-dropzone"].style.borderColor = "";
  });
  els["lattes-dropzone"].addEventListener("drop", (e) => {
    e.preventDefault();
    els["lattes-dropzone"].style.borderColor = "";
    handleLattesFile(e.dataTransfer.files[0]);
  });

  els["btn-save-profile"].addEventListener("click", salvarPerfil);
  els["btn-cancel"].addEventListener("click", () => renderAll());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      fecharModal(els["project-modal"]);
      closeLattesModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
