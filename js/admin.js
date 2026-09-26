/**
 * admin.js
 * Controlador do Painel Administrativo. O controle de acesso (só a
 * conta de administrador definida em authService.js chega aqui) roda
 * no <head> de admin.html, antes deste script — ver o comentário de
 * segurança em dataService.js sobre os limites desse modelo enquanto
 * não existe um backend real.
 */

const adminEls = {};
let adminProfiles = [];

function cacheAdminElements() {
  [
    "admin-dashboard", "admin-summary",
    "admin-stats", "admin-search", "admin-table-body", "admin-empty",
    "admin-detail-modal", "admin-detail-title", "admin-detail-body",
    "admin-detail-close", "admin-detail-close-btn", "toast", "btn-logout",
  ].forEach((id) => {
    adminEls[id] = document.getElementById(id);
  });
}

async function init() {
  cacheAdminElements();
  wireAdminEvents();
  await loadDashboard();
}

function handleLogout() {
  AuthService.logout();
  window.location.href = "login.html";
}

/* ---------------------------------------------------------------------
 * Dashboard
 * ------------------------------------------------------------------- */
async function loadDashboard() {
  adminProfiles = await DataService.listAllProfilesForAdmin();
  renderStats(adminProfiles);
  renderTable(adminProfiles);
}

function renderStats(entries) {
  const total = entries.length;
  const percentages = entries.map((entry) =>
    UI.computeCompletionPercent({
      profile: entry.profile,
      technologies: entry.technologies,
      projects: entry.projects,
      interests: entry.interests,
    })
  );
  const complete = percentages.filter((p) => p === 100).length;
  const average = total ? Math.round(percentages.reduce((a, b) => a + b, 0) / total) : 0;
  const withExperience = entries.filter((e) => e.experiences && e.experiences.length > 0).length;

  const stats = [
    { label: "Perfis cadastrados", value: total },
    { label: "Perfis 100% completos", value: complete },
    { label: "Preenchimento médio", value: average + "%" },
    { label: "Com experiência registrada", value: withExperience },
  ];

  adminEls["admin-summary"].textContent =
    total + (total === 1 ? " perfil encontrado." : " perfis encontrados.");

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
        const haystack = [
          entry.profile.full_name,
          entry.profile.course,
          entry.profile.registration_number,
          entry.profile.email,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
    : entries;

  adminEls["admin-table-body"].innerHTML = "";
  adminEls["admin-empty"].hidden = filtered.length > 0;

  filtered.forEach((entry) => {
    const percent = UI.computeCompletionPercent({
      profile: entry.profile,
      technologies: entry.technologies,
      projects: entry.projects,
      interests: entry.interests,
    });

    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = entry.profile.full_name || "(nome não informado)";

    const courseCell = document.createElement("td");
    courseCell.textContent = entry.profile.course || "—";

    const regCell = document.createElement("td");
    regCell.textContent = entry.profile.registration_number || "—";

    const emailCell = document.createElement("td");
    emailCell.textContent = entry.profile.email || "—";

    const progressCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "admin-progress-badge" + (percent === 100 ? " is-complete" : "");
    badge.textContent = percent + "%";
    progressCell.appendChild(badge);

    const sourceCell = document.createElement("td");
    const sourceBadge = document.createElement("span");
    sourceBadge.className = "tag-pill" + (entry.source === "real" ? "" : " tag-pill--muted");
    sourceBadge.textContent = entry.source === "real" ? "Conta cadastrada" : "Demonstração";
    sourceCell.appendChild(sourceBadge);

    const actionsCell = document.createElement("td");
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "btn btn-secondary btn-sm";
    viewBtn.textContent = "Ver detalhes";
    viewBtn.addEventListener("click", () => openDetailModal(entry));
    actionsCell.appendChild(viewBtn);

    row.appendChild(nameCell);
    row.appendChild(courseCell);
    row.appendChild(regCell);
    row.appendChild(emailCell);
    row.appendChild(progressCell);
    row.appendChild(sourceCell);
    row.appendChild(actionsCell);

    adminEls["admin-table-body"].appendChild(row);
  });
}

/* ---------------------------------------------------------------------
 * Modal de detalhes
 * ------------------------------------------------------------------- */
function detailRow(label, value) {
  return (
    '<div class="admin-detail-row">' +
    '<span class="admin-detail-row__label">' + UI.escapeHtml(label) + "</span>" +
    '<span class="admin-detail-row__value">' + UI.escapeHtml(value || "—") + "</span>" +
    "</div>"
  );
}

function openDetailModal(entry) {
  const p = entry.profile;
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
    (TCC_STATUS_OPTIONS.find((o) => o.value === p.tcc_status) || {}).label || "Não iniciou TCC";
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
  if (entry.technologies.length) {
    html += '<div class="chip-list-preview">';
    entry.technologies.forEach((t) => {
      html += '<span class="tag-pill">' + UI.escapeHtml(t.name) + " · " + UI.escapeHtml(t.level) + "</span>";
    });
    html += "</div>";
  } else {
    html += '<p class="field-hint">Nenhuma tecnologia cadastrada.</p>';
  }
  html += "</div>";

  html += '<div class="admin-detail-section">';
  html += '<h3 class="admin-detail-section__title">Projetos desenvolvidos</h3>';
  if (entry.projects.length) {
    entry.projects.forEach((proj) => {
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
  if (entry.experiences.length) {
    entry.experiences.forEach((exp) => {
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
  if (entry.interests.length) {
    html += '<div class="chip-list-preview">';
    entry.interests.forEach((area) => {
      html += '<span class="tag-pill">' + UI.escapeHtml(area) + "</span>";
    });
    html += "</div>";
  } else {
    html += '<p class="field-hint">Nenhuma área de interesse selecionada.</p>';
  }
  html += "</div>";

  adminEls["admin-detail-body"].innerHTML = html;
  adminEls["admin-detail-modal"].hidden = false;
}

function closeDetailModal() {
  adminEls["admin-detail-modal"].hidden = true;
}

/* ---------------------------------------------------------------------
 * Eventos
 * ------------------------------------------------------------------- */
function wireAdminEvents() {
  adminEls["btn-logout"].addEventListener("click", handleLogout);
  adminEls["admin-search"].addEventListener("input", () => renderTable(adminProfiles));
  adminEls["admin-detail-close"].addEventListener("click", closeDetailModal);
  adminEls["admin-detail-close-btn"].addEventListener("click", closeDetailModal);
  adminEls["admin-detail-modal"].addEventListener("click", (e) => {
    if (e.target === adminEls["admin-detail-modal"]) closeDetailModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetailModal();
  });
}

document.addEventListener("DOMContentLoaded", init);
