/**
 * ui.js
 * Constantes de domínio e funções puras de renderização (DOM) usadas
 * pelo perfil.js. Manter a lógica de "como desenhar" separada da
 * lógica de "o que fazer" facilita reaproveitar estes componentes em
 * outras páginas futuras (ex.: tela de Recomendações).
 */

/**
 * Estrutura hierárquica Centro Acadêmico -> Curso.
 *
 * O sistema trabalha SOMENTE com estes dois centros por decisão de
 * escopo (não são adicionados outros centros/cursos nesta etapa).
 */
const ACADEMIC_CENTERS = [
  { id: "CETEC", name: "CETEC — Centro de Ciências Exatas e Tecnológicas" },
  { id: "CCAAB", name: "CCAAB — Centro de Ciências Agrárias, Ambientais e Biológicas" },
];

/**
 * Fonte única de verdade dos cursos: cada curso tem um id estável (o
 * "curso_id" que seria salvo no Postgres) e o centro ao qual pertence.
 * Esse mesmo id é a chave de PROJECT_OPTIONS_BY_COURSE, que define as
 * opções de Área/Tipo de projeto relevantes para cada curso.
 */
const UFRB_COURSES = [
  // CETEC
  { id: 1, centerId: "CETEC", name: "Bacharelado em Ciências Exatas e Tecnológicas" },
  { id: 2, centerId: "CETEC", name: "Engenharia de Computação" },
  { id: 3, centerId: "CETEC", name: "Bacharelado em Matemática" },
  { id: 4, centerId: "CETEC", name: "Engenharia Elétrica" },
  { id: 5, centerId: "CETEC", name: "Engenharia Sanitária e Ambiental" },
  { id: 6, centerId: "CETEC", name: "Engenharia Civil" },
  { id: 7, centerId: "CETEC", name: "Engenharia Mecânica" },
  { id: 8, centerId: "CETEC", name: "Bacharelado em Física" },
  { id: 9, centerId: "CETEC", name: "Licenciatura em Matemática EaD" },
  { id: 10, centerId: "CETEC", name: "Licenciatura em Computação EaD" },
  { id: 11, centerId: "CETEC", name: "Licenciatura em Física EaD" },

  // CCAAB
  { id: 12, centerId: "CCAAB", name: "Agroecologia" },
  { id: 13, centerId: "CCAAB", name: "Agronomia" },
  { id: 14, centerId: "CCAAB", name: "Biologia" },
  { id: 15, centerId: "CCAAB", name: "Engenharia de Pesca" },
  { id: 16, centerId: "CCAAB", name: "Engenharia Florestal" },
  { id: 17, centerId: "CCAAB", name: "Gestão de Cooperativas" },
  { id: 18, centerId: "CCAAB", name: "Gestão Ambiental" },
  { id: 19, centerId: "CCAAB", name: "Interdisciplinar em Ciências Ambientais" },
  { id: 20, centerId: "CCAAB", name: "Medicina Veterinária" },
  { id: 21, centerId: "CCAAB", name: "Zootecnia" },
];

/**
 * Opções de Área do Projeto e Tipo de Projeto relevantes para CADA
 * curso (chave = UFRB_COURSES[].id). Continuam sendo sugestões de
 * autocomplete, não uma lista fechada — o campo aceita texto livre
 * quando o projeto não se encaixa em nenhuma opção (ver Combobox
 * allowCustom em perfil.js).
 */
const PROJECT_OPTIONS_BY_COURSE = {
  // 1 — Bacharelado em Ciências Exatas e Tecnológicas
  1: {
    areas: ["Computação", "Matemática", "Física", "Química", "Engenharia", "Ciência de Dados", "Automação", "Meio Ambiente", "Pesquisa e Desenvolvimento"],
    types: ["Projeto Acadêmico", "Iniciação Científica", "Projeto de Pesquisa", "Projeto de Extensão", "TCC", "Trabalho Acadêmico"],
  },
  // 2 — Engenharia de Computação
  2: {
    areas: ["Desenvolvimento Web", "Desenvolvimento Mobile", "Inteligência Artificial", "Ciência de Dados", "Banco de Dados", "Redes", "Segurança da Informação", "Sistemas Embarcados", "Automação", "Robótica", "Internet das Coisas"],
    types: ["Desenvolvimento de Software", "Projeto de Hardware", "Iniciação Científica", "Projeto de Pesquisa", "Projeto de Extensão", "Hackathon", "TCC", "Projeto Pessoal"],
  },
  // 3 — Bacharelado em Matemática
  3: {
    areas: ["Matemática Aplicada", "Álgebra", "Análise Matemática", "Modelagem Matemática", "Otimização", "Probabilidade e Estatística", "Pesquisa Operacional"],
    types: ["Projeto de Pesquisa", "Iniciação Científica", "Projeto de Extensão", "TCC", "Trabalho Acadêmico"],
  },
  // 4 — Engenharia Elétrica
  4: {
    areas: ["Eletrônica", "Sistemas de Potência", "Automação", "Controle", "Sistemas Embarcados", "Energias Renováveis", "Instrumentação"],
    types: ["Projeto de Hardware", "Automação de Processos", "Iniciação Científica", "Projeto de Pesquisa", "Projeto de Extensão", "TCC"],
  },
  // 5 — Engenharia Sanitária e Ambiental
  5: {
    areas: ["Saneamento Básico", "Tratamento de Água e Esgoto", "Gestão de Resíduos", "Recursos Hídricos", "Qualidade Ambiental", "Sustentabilidade"],
    types: ["Projeto de Pesquisa Aplicada", "Estudo de Campo", "Iniciação Científica", "Projeto de Extensão", "TCC"],
  },
  // 6 — Engenharia Civil
  6: {
    areas: ["Estruturas", "Construção Civil", "Geotecnia", "Saneamento", "Topografia", "Materiais de Construção", "Gestão de Obras", "Infraestrutura Urbana"],
    types: ["Projeto Estrutural", "Projeto Acadêmico", "Estudo de Caso", "Iniciação Científica", "Projeto de Extensão", "Projeto de Pesquisa", "TCC"],
  },
  // 7 — Engenharia Mecânica
  7: {
    areas: ["Mecânica dos Sólidos", "Termodinâmica", "Manufatura", "Automação Industrial", "Manutenção Industrial", "Energia", "Robótica"],
    types: ["Projeto Mecânico", "Projeto de Hardware", "Iniciação Científica", "Projeto de Pesquisa", "Projeto de Extensão", "TCC"],
  },
  // 8 — Bacharelado em Física
  8: {
    areas: ["Física Aplicada", "Física Experimental", "Física Computacional", "Instrumentação Científica", "Astronomia", "Óptica", "Mecânica Quântica"],
    types: ["Projeto de Pesquisa", "Iniciação Científica", "Projeto de Extensão", "TCC", "Trabalho Acadêmico"],
  },
  // 9 — Licenciatura em Matemática EaD
  9: {
    areas: ["Educação Matemática", "Matemática Aplicada", "Didática", "Ensino de Matemática", "Tecnologias Educacionais", "Educação a Distância"],
    types: ["Projeto de Ensino", "Projeto de Pesquisa", "Iniciação Científica", "Projeto de Extensão", "TCC"],
  },
  // 10 — Licenciatura em Computação EaD
  10: {
    areas: ["Educação em Computação", "Ensino de Programação", "Tecnologias Educacionais", "Informática na Educação", "Letramento Digital", "Educação a Distância"],
    types: ["Projeto de Ensino", "Desenvolvimento de Software Educacional", "Projeto de Pesquisa", "Projeto de Extensão", "TCC"],
  },
  // 11 — Licenciatura em Física EaD
  11: {
    areas: ["Educação em Física", "Ensino de Ciências", "Instrumentação para o Ensino", "Tecnologias Educacionais", "Educação a Distância"],
    types: ["Projeto de Ensino", "Projeto de Pesquisa", "Iniciação Científica", "Projeto de Extensão", "TCC"],
  },
  // 12 — Agroecologia
  12: {
    areas: ["Agroecologia", "Sistemas Agroflorestais", "Agricultura Familiar", "Sustentabilidade", "Ciência do Solo", "Produção Vegetal"],
    types: ["Projeto de Campo", "Projeto de Extensão", "Iniciação Científica", "Projeto de Pesquisa", "TCC"],
  },
  // 13 — Agronomia
  13: {
    areas: ["Produção Vegetal", "Fitotecnia", "Fitopatologia", "Ciência do Solo", "Irrigação", "Entomologia", "Agroindústria", "Recursos Hídricos"],
    types: ["Projeto de Campo", "Estudo Experimental", "Iniciação Científica", "Projeto de Pesquisa", "Projeto de Extensão", "TCC"],
  },
  // 14 — Biologia
  14: {
    areas: ["Ecologia", "Biodiversidade", "Zoologia", "Botânica", "Biotecnologia", "Conservação Ambiental", "Recursos Naturais", "Educação em Biologia", "Ensino de Ciências"],
    types: ["Projeto de Campo", "Estudo Experimental", "Iniciação Científica", "Projeto de Pesquisa", "Projeto de Extensão", "Projeto de Ensino", "TCC"],
  },
  // 15 — Engenharia de Pesca
  15: {
    areas: ["Aquicultura", "Recursos Pesqueiros", "Piscicultura", "Gestão Pesqueira", "Qualidade da Água"],
    types: ["Projeto de Campo", "Estudo Experimental", "Iniciação Científica", "Projeto de Pesquisa", "Projeto de Extensão", "TCC"],
  },
  // 16 — Engenharia Florestal
  16: {
    areas: ["Manejo Florestal", "Conservação Ambiental", "Silvicultura", "Recursos Naturais", "Recuperação de Áreas Degradadas"],
    types: ["Projeto de Campo", "Estudo Experimental", "Iniciação Científica", "Projeto de Pesquisa", "Projeto de Extensão", "TCC"],
  },
  // 17 — Gestão de Cooperativas
  17: {
    areas: ["Gestão de Cooperativas", "Economia Solidária", "Agricultura Familiar", "Administração Rural", "Associativismo", "Gestão de Pessoas", "Comercialização"],
    types: ["Projeto de Campo", "Estudo de Caso", "Projeto de Extensão", "Iniciação Científica", "Projeto de Pesquisa", "TCC"],
  },
  // 18 — Gestão Ambiental
  18: {
    areas: ["Gestão Ambiental", "Ciências Ambientais", "Sustentabilidade", "Educação Ambiental", "Licenciamento Ambiental", "Recursos Naturais"],
    types: ["Projeto de Campo", "Projeto de Extensão", "Iniciação Científica", "Projeto de Pesquisa", "TCC"],
  },
  // 19 — Interdisciplinar em Ciências Ambientais
  19: {
    areas: ["Ciências Ambientais", "Sustentabilidade", "Educação Ambiental", "Gestão de Recursos Naturais", "Mudanças Climáticas", "Ecologia"],
    types: ["Projeto de Pesquisa", "Iniciação Científica", "Projeto de Extensão", "Projeto de Campo", "TCC", "Trabalho Acadêmico"],
  },
  // 20 — Medicina Veterinária
  20: {
    areas: ["Clínica Veterinária", "Reprodução Animal", "Sanidade Animal", "Medicina Preventiva", "Cirurgia Veterinária", "Diagnóstico", "Saúde Pública", "Epidemiologia", "Nutrição Animal", "Bem-estar Animal", "Inspeção de Produtos de Origem Animal", "Patologia Veterinária", "Zoonoses", "Produção Animal"],
    types: ["Pesquisa", "Extensão", "Iniciação Científica", "Projeto de Campo", "Estudo Experimental", "Trabalho Acadêmico", "Projeto de Pesquisa Aplicada", "Projeto de Extensão", "TCC"],
  },
  // 21 — Zootecnia
  21: {
    areas: ["Produção Animal", "Nutrição Animal", "Melhoramento Genético Animal", "Forragicultura", "Bem-estar Animal", "Reprodução Animal"],
    types: ["Projeto de Campo", "Estudo Experimental", "Iniciação Científica", "Projeto de Pesquisa", "Projeto de Extensão", "TCC"],
  },
};

const DEFAULT_PROJECT_AREAS = ["Pesquisa e Desenvolvimento", "Extensão", "Interdisciplinar"];
const DEFAULT_PROJECT_TYPES = ["Projeto Acadêmico", "Iniciação Científica", "Projeto de Extensão", "TCC"];

/** Acha o id do curso (chave de PROJECT_OPTIONS_BY_COURSE) a partir do
 * centro + nome exibido no campo — usado para descobrir as opções de
 * Área/Tipo de projeto relevantes ao curso selecionado no modal. */
function findCourseId(centerId, courseName) {
  const name = (courseName || "").trim().toLowerCase();
  if (!centerId || !name) return null;
  const match = UFRB_COURSES.find((c) => c.centerId === centerId && c.name.toLowerCase() === name);
  return match ? match.id : null;
}

/** Opções de Área/Tipo de projeto para o curso atualmente selecionado
 * no modal (ou um conjunto genérico enquanto nenhum curso for escolhido
 * ou o texto digitado ainda não corresponder a um curso da lista). */
function getProjectOptionsForCourse(centerId, courseName) {
  const courseId = findCourseId(centerId, courseName);
  const options = courseId && PROJECT_OPTIONS_BY_COURSE[courseId];
  return {
    areas: options ? options.areas : DEFAULT_PROJECT_AREAS,
    types: options ? options.types : DEFAULT_PROJECT_TYPES,
  };
}

/** O Lattes costuma registrar o nome do curso sem o prefixo de grau —
 * "Ciências Exatas e Tecnológicas" em vez de "Bacharelado em Ciências
 * Exatas e Tecnológicas" — porque o grau já vem separado (tag GRADUACAO).
 * Usado para o auto-preenchimento de Curso na importação do Lattes:
 * tenta bater o nome exato primeiro e, se não achar, tenta de novo
 * ignorando esse prefixo nos nossos nomes padronizados. */
const COURSE_DEGREE_PREFIX = /^bacharelado( interdisciplinar)? em\s+/i;

function findStandardCourseByName(courseName) {
  const name = (courseName || "").trim().toLowerCase();
  if (!name) return null;

  let match = UFRB_COURSES.find((c) => c.name.toLowerCase() === name);
  if (match) return match;

  match = UFRB_COURSES.find((c) => c.name.toLowerCase().replace(COURSE_DEGREE_PREFIX, "") === name);
  return match || null;
}

/** Ícone SVG de "x" para os botões de remover chip/tag — substitui o
 * caractere "✕" (que alguns sistemas renderem como emoji) por um
 * vetor consistente com os demais ícones do site. */
function createRemoveIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "13");
  svg.setAttribute("height", "13");
  svg.setAttribute("aria-hidden", "true");

  const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line1.setAttribute("x1", "18");
  line1.setAttribute("y1", "6");
  line1.setAttribute("x2", "6");
  line1.setAttribute("y2", "18");

  const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line2.setAttribute("x1", "6");
  line2.setAttribute("y1", "6");
  line2.setAttribute("x2", "18");
  line2.setAttribute("y2", "18");

  svg.appendChild(line1);
  svg.appendChild(line2);
  return svg;
}

/** {centerId: ["Nome do curso", ...]} — mantido para telas que ainda
 * usam apenas o nome do curso como texto simples (ex.: projeto). */
const COURSES_BY_CENTER = UFRB_COURSES.reduce((acc, course) => {
  if (!acc[course.centerId]) acc[course.centerId] = [];
  acc[course.centerId].push(course.name);
  return acc;
}, {});

/** [{label, options:[{id,name}]}] pronto para o GroupedCombobox do campo Curso. */
function buildCourseGroups() {
  return ACADEMIC_CENTERS.map((center) => ({
    label: center.name,
    options: UFRB_COURSES.filter((c) => c.centerId === center.id),
  })).filter((group) => group.options.length > 0);
}

const SEMESTER_OPTIONS = ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º", "10º"];

const GRADUATION_YEARS = (function () {
  const current = new Date().getFullYear();
  const years = [];
  for (let i = 0; i <= 6; i++) years.push(String(current + i));
  return years;
})();

const TECH_LEVELS = ["Básico", "Intermediário", "Avançado"];

const PROJECT_AREAS = [
  "Computação",
  "Desenvolvimento Web",
  "Desenvolvimento Mobile",
  "Inteligência Artificial",
  "Ciência de Dados",
  "Banco de Dados",
  "Automação",
  "Robótica",
  "Eletrônica",
  "Sistemas Embarcados",
  "Internet das Coisas",
  "Engenharia",
  "Matemática",
  "Estatística",
  "Física",
  "Química",
  "Pesquisa e Desenvolvimento",
  "Outro",
];

/**
 * Lista SEMENTE de áreas de interesse (equivalente à tabela `areas_interesse`
 * no Postgres). Não é uma lista fechada: o estudante pode digitar e criar
 * uma nova área pelo autocomplete (ver DataService.addInterestAreaToCatalog),
 * que normaliza e verifica duplicidade antes de "gravar".
 */
const INTEREST_AREAS_SEED = [
  // Computação e tecnologia
  "Computação",
  "Inteligência Artificial",
  "Machine Learning",
  "Ciência de Dados",
  "Engenharia de Software",
  "Desenvolvimento de Software",
  "Desenvolvimento Web",
  "Desenvolvimento Mobile",
  "Banco de Dados",
  "Redes",
  "Segurança da Informação",
  "Computação em Nuvem",
  "Internet das Coisas",
  "Automação",
  "Robótica",
  "Eletrônica",
  "Sistemas Embarcados",
  "Controle",

  // Engenharias
  "Engenharia",
  "Engenharia Civil",
  "Engenharia Mecânica",
  "Engenharia Elétrica",

  // Exatas
  "Matemática",
  "Estatística",
  "Física",
  "Química",

  // Ciências biológicas
  "Ciências Biológicas",
  "Biologia",
  "Biotecnologia",
  "Ecologia",
  "Biodiversidade",
  "Recursos Naturais",

  // Agrárias / produção vegetal
  "Agronomia",
  "Agroecologia",
  "Produção Vegetal",
  "Fitotecnia",
  "Fitopatologia",
  "Entomologia",
  "Ciência do Solo",
  "Irrigação",
  "Recursos Hídricos",
  "Agroindústria",
  "Tecnologia de Alimentos",

  // Produção e saúde animal
  "Produção Animal",
  "Zootecnia",
  "Medicina Veterinária",
  "Reprodução Animal",
  "Nutrição Animal",
  "Sanidade Animal",
  "Saúde Animal",
  "Clínica Veterinária",

  // Pesca e florestas
  "Engenharia de Pesca",
  "Aquicultura",
  "Recursos Pesqueiros",
  "Engenharia Florestal",
  "Manejo Florestal",

  // Ambiental
  "Conservação Ambiental",
  "Gestão Ambiental",
  "Ciências Ambientais",
  "Meio Ambiente",
  "Sustentabilidade",

  // Rural e transversais
  "Extensão Rural",
  "Desenvolvimento Rural",
  "Pesquisa",
  "Pesquisa Científica",
  "Extensão",
  "Inovação",
  "Desenvolvimento",
  "Gestão",
  "Administração",
  "Educação",
  "Ensino",
  "Saúde",
];

const TCC_STATUS_OPTIONS = [
  { value: "nao_iniciou", label: "Não iniciou TCC" },
  { value: "em_andamento", label: "TCC em andamento" },
  { value: "concluido", label: "TCC concluído/apresentado" },
];

/** Lista de apoio para o autocomplete de orientador — aceita valores fora
 * da lista (allowCustom), já que nem todo docente estará pré-cadastrado. */
const ORIENTADORES_SUGESTOES = [
  "Prof. Dr. André Luiz Santos",
  "Profa. Dra. Camila Rocha Andrade",
  "Prof. Dr. Diego Almeida Farias",
  "Profa. Dra. Juliana Prado Menezes",
  "Prof. Dr. Marcelo Vieira Costa",
  "Profa. Dra. Patrícia Gomes Teixeira",
];

const UI = {
  /**
   * Calcula o percentual de preenchimento do perfil a partir do mesmo
   * critério usado em toda a aplicação (curso 30% + tecnologias 30% +
   * projetos 30% + interesses 10%). Recebe o "estado completo" no
   * formato retornado por DataService.getFullState().
   */
  computeCompletionPercent(state) {
    let percent = 0;
    if (state.profile && state.profile.course) percent += 30;
    if (state.technologies && state.technologies.length > 0) percent += 30;
    if (state.projects && state.projects.length > 0) percent += 30;
    if (state.interests && state.interests.length > 0) percent += 10;
    return percent;
  },

  /** Converte "2024-03" (input type=month) em "Mar 2024" para exibição. */
  formatMonthYear(value) {
    if (!value) return "";
    const [year, month] = value.split("-");
    const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const index = parseInt(month, 10) - 1;
    return (labels[index] || month) + " " + year;
  },

  formatExperiencePeriod(exp) {
    const start = UI.formatMonthYear(exp.start_date);
    const end = exp.is_current ? "Atual" : UI.formatMonthYear(exp.end_date);
    if (start && end) return start + " – " + end;
    return start || end || "Período não informado";
  },

  escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  },

  populateSelect(selectEl, options, placeholder) {
    selectEl.innerHTML = "";
    if (placeholder) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = placeholder;
      opt.disabled = true;
      opt.selected = true;
      selectEl.appendChild(opt);
    }
    options.forEach((value) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      selectEl.appendChild(opt);
    });
  },

  renderTechChips(container, technologies, handlers) {
    container.innerHTML = "";
    technologies.forEach((tech) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.dataset.id = tech.id;

      const name = document.createElement("span");
      name.className = "chip__name";
      name.textContent = tech.name;

      const levelSelect = document.createElement("select");
      levelSelect.className = "chip__level-select";
      levelSelect.dataset.level = tech.level;
      TECH_LEVELS.forEach((level) => {
        const opt = document.createElement("option");
        opt.value = level;
        opt.textContent = level;
        if (level === tech.level) opt.selected = true;
        levelSelect.appendChild(opt);
      });
      levelSelect.addEventListener("change", () => {
        levelSelect.dataset.level = levelSelect.value;
        handlers.onLevelChange(tech.id, levelSelect.value);
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "chip__remove";
      removeBtn.setAttribute("aria-label", "Remover " + tech.name);
      removeBtn.appendChild(createRemoveIcon());
      removeBtn.addEventListener("click", () => handlers.onRemove(tech.id));

      chip.appendChild(name);
      chip.appendChild(levelSelect);
      chip.appendChild(removeBtn);
      container.appendChild(chip);
    });
  },

  renderProjectTagInputList(container, technologies, onRemove) {
    container.innerHTML = "";
    technologies.forEach((tech, index) => {
      const tag = document.createElement("span");
      tag.className = "tag-pill tag-pill--removable";
      const label = document.createElement("span");
      label.textContent = tech;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", "Remover " + tech);
      btn.appendChild(createRemoveIcon());
      btn.addEventListener("click", () => onRemove(index));
      tag.appendChild(label);
      tag.appendChild(btn);
      container.appendChild(tag);
    });
  },

  renderProjects(container, emptyStateEl, projects, handlers) {
    if (!projects.length) {
      container.hidden = true;
      emptyStateEl.hidden = false;
      container.innerHTML = "";
      return;
    }
    emptyStateEl.hidden = true;
    container.hidden = false;
    container.innerHTML = "";

    projects.forEach((project) => {
      const card = document.createElement("article");
      card.className = "project-card";

      const title = document.createElement("h4");
      title.className = "project-card__title";
      title.textContent = project.name;

      const type = document.createElement("span");
      type.className = "project-card__type";
      type.textContent = project.type || "Projeto";

      const desc = document.createElement("p");
      desc.className = "project-card__desc";
      desc.textContent = project.description;

      card.appendChild(title);
      card.appendChild(type);
      card.appendChild(desc);

      if (project.technologies && project.technologies.length) {
        const tagWrap = document.createElement("div");
        tagWrap.className = "project-card__tags";
        project.technologies.forEach((t) => {
          const tag = document.createElement("span");
          tag.className = "tag-pill";
          tag.textContent = t;
          tagWrap.appendChild(tag);
        });
        card.appendChild(tagWrap);
      }

      if (project.academic_center || project.course) {
        const vinculo = document.createElement("span");
        vinculo.className = "project-card__area";
        vinculo.textContent = [project.academic_center, project.course].filter(Boolean).join(" · ");
        card.appendChild(vinculo);
      }

      if (project.area) {
        const area = document.createElement("span");
        area.className = "project-card__area";
        area.textContent = project.area;
        card.appendChild(area);
      }

      if (project.link) {
        const link = document.createElement("a");
        link.className = "project-card__link";
        link.href = project.link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = project.link;
        card.appendChild(link);
      }

      const actions = document.createElement("div");
      actions.className = "project-card__actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-secondary btn-sm";
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => handlers.onEdit(project.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-danger-text btn-sm";
      deleteBtn.textContent = "Excluir";
      deleteBtn.addEventListener("click", () => handlers.onDelete(project.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(actions);

      container.appendChild(card);
    });
  },

  renderExperiences(container, experiences, onDelete) {
    container.innerHTML = "";
    experiences.forEach((exp) => {
      const item = document.createElement("div");
      item.className = "experience-item";

      const head = document.createElement("div");
      head.className = "experience-item__head";

      const info = document.createElement("div");
      const title = document.createElement("h4");
      title.textContent = exp.role + " · " + exp.company;
      const meta = document.createElement("div");
      meta.className = "experience-item__meta";
      const metaParts = [UI.formatExperiencePeriod(exp)];
      if (exp.work_area) metaParts.push(exp.work_area);
      meta.textContent = metaParts.join(" · ");
      info.appendChild(title);
      info.appendChild(meta);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-danger-text btn-sm";
      deleteBtn.textContent = "Excluir";
      deleteBtn.addEventListener("click", () => onDelete(exp.id));

      head.appendChild(info);
      head.appendChild(deleteBtn);
      item.appendChild(head);

      if (exp.description) {
        const desc = document.createElement("p");
        desc.textContent = exp.description;
        item.appendChild(desc);
      }

      if (exp.technologies && exp.technologies.length) {
        const tagWrap = document.createElement("div");
        tagWrap.className = "project-card__tags";
        exp.technologies.forEach((t) => {
          const tag = document.createElement("span");
          tag.className = "tag-pill";
          tag.textContent = t;
          tagWrap.appendChild(tag);
        });
        item.appendChild(tagWrap);
      }

      container.appendChild(item);
    });
  },

  showToast(toastEl, message, isError) {
    toastEl.textContent = message;
    toastEl.classList.toggle("is-error", Boolean(isError));
    toastEl.classList.add("is-visible");
    window.clearTimeout(toastEl._hideTimer);
    toastEl._hideTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");
    }, 3200);
  },
};
