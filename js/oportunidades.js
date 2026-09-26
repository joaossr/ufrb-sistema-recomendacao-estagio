/**
 * oportunidades.js
 * Página "Oportunidades" — carrossel de vagas de estágio. Nesta etapa
 * os dados são fictícios (array local): quando o backend existir, o
 * carregamento inicial passa a ser uma consulta a `vagas` (join com
 * `empresas`/`convenios`, ver o comentário de schema em dataService.js)
 * filtrada pelas mesmas regras que hoje o motor de recomendação (LLM)
 * ainda não existe para aplicar.
 */

const MOCK_VAGAS = [
  {
    company: "TechBahia Soluções Digitais",
    title: "Estágio em Desenvolvimento Web",
    modality: "Remoto",
    location: "Feira de Santana, BA",
    area: "Engenharia de Computação",
    deadline: "Inscrições até 10/10",
    description: "Apoio no desenvolvimento de sistemas internos usando JavaScript, APIs REST e bancos de dados relacionais.",
    tags: ["JavaScript", "SQL", "Git"],
  },
  {
    company: "Construtora Recôncavo",
    title: "Estágio em Engenharia Civil",
    modality: "Presencial",
    location: "Cruz das Almas, BA",
    area: "Engenharia Civil",
    deadline: "Inscrições até 05/10",
    description: "Acompanhamento de obras, controle de qualidade de materiais e apoio em projetos estruturais.",
    tags: ["AutoCAD", "Gestão de Obras"],
  },
  {
    company: "AgroVale Consultoria",
    title: "Estágio em Agronomia",
    modality: "Presencial",
    location: "Santo Antônio de Jesus, BA",
    area: "Agronomia",
    deadline: "Inscrições até 15/10",
    description: "Apoio técnico em manejo de culturas, irrigação e acompanhamento de safra em propriedades parceiras.",
    tags: ["Manejo de Solo", "Irrigação"],
  },
  {
    company: "Clínica Veterinária Bem Animal",
    title: "Estágio em Medicina Veterinária",
    modality: "Presencial",
    location: "Cruz das Almas, BA",
    area: "Medicina Veterinária",
    deadline: "Inscrições até 20/10",
    description: "Auxílio em consultas clínicas, procedimentos de rotina e cuidados pré e pós-operatórios.",
    tags: ["Clínica", "Sanidade Animal"],
  },
  {
    company: "Fazenda Boa Esperança",
    title: "Estágio em Zootecnia",
    modality: "Presencial",
    location: "Governador Mangabeira, BA",
    area: "Zootecnia",
    deadline: "Inscrições até 12/10",
    description: "Acompanhamento de manejo nutricional e reprodutivo de rebanhos leiteiros.",
    tags: ["Produção Animal", "Nutrição Animal"],
  },
  {
    company: "SANEBAHIA Regional",
    title: "Estágio em Engenharia Sanitária e Ambiental",
    modality: "Híbrido",
    location: "Cruz das Almas, BA",
    area: "Engenharia Sanitária e Ambiental",
    deadline: "Inscrições até 18/10",
    description: "Monitoramento da qualidade da água e apoio em projetos de tratamento de efluentes.",
    tags: ["Saneamento", "Qualidade Ambiental"],
  },
  {
    company: "Instituto Mata Atlântica Viva",
    title: "Estágio em Engenharia Florestal",
    modality: "Presencial",
    location: "Amargosa, BA",
    area: "Engenharia Florestal",
    deadline: "Inscrições até 22/10",
    description: "Apoio em projetos de recuperação de áreas degradadas e inventário florestal.",
    tags: ["Manejo Florestal", "Recursos Naturais"],
  },
  {
    company: "Cooperativa Central do Recôncavo",
    title: "Estágio em Gestão de Cooperativas",
    modality: "Presencial",
    location: "Cruz das Almas, BA",
    area: "Gestão de Cooperativas",
    deadline: "Inscrições até 08/10",
    description: "Apoio administrativo e financeiro em cooperativas de agricultura familiar da região.",
    tags: ["Administração Rural", "Associativismo"],
  },
  {
    company: "Energis Automação Industrial",
    title: "Estágio em Engenharia Elétrica",
    modality: "Presencial",
    location: "Feira de Santana, BA",
    area: "Engenharia Elétrica",
    deadline: "Inscrições até 30/10",
    description: "Apoio em projetos de automação industrial e manutenção de painéis elétricos.",
    tags: ["Automação", "Instrumentação"],
  },
  {
    company: "LabMat Materiais e Ensaios",
    title: "Estágio em Engenharia Mecânica",
    modality: "Presencial",
    location: "Cruz das Almas, BA",
    area: "Engenharia Mecânica",
    deadline: "Inscrições até 14/10",
    description: "Apoio em ensaios de materiais e manutenção preventiva de equipamentos industriais.",
    tags: ["Manutenção Industrial", "Manufatura"],
  },
];

const oppEls = {};

function cacheOppElements() {
  ["opp-track", "opp-prev", "opp-next", "btn-logout"].forEach((id) => {
    oppEls[id] = document.getElementById(id);
  });
}

function createTagPill(text) {
  const span = document.createElement("span");
  span.className = "tag-pill";
  span.textContent = text;
  return span;
}

function renderOpportunityCard(vaga) {
  const card = document.createElement("article");
  card.className = "opportunity-card";

  const header = document.createElement("div");
  header.className = "opportunity-card__header";

  const company = document.createElement("span");
  company.className = "opportunity-card__company";
  company.textContent = vaga.company;

  const badge = document.createElement("span");
  badge.className = "opportunity-card__badge";
  badge.textContent = vaga.modality;

  header.appendChild(company);
  header.appendChild(badge);

  const title = document.createElement("h3");
  title.className = "opportunity-card__title";
  title.textContent = vaga.title;

  const meta = document.createElement("div");
  meta.className = "opportunity-card__meta";
  const location = document.createElement("span");
  location.textContent = vaga.location;
  const area = document.createElement("span");
  area.textContent = vaga.area;
  meta.appendChild(location);
  meta.appendChild(area);

  const desc = document.createElement("p");
  desc.className = "opportunity-card__desc";
  desc.textContent = vaga.description;

  const tags = document.createElement("div");
  tags.className = "opportunity-card__tags";
  vaga.tags.forEach((tag) => tags.appendChild(createTagPill(tag)));

  const footer = document.createElement("div");
  footer.className = "opportunity-card__footer";
  footer.textContent = vaga.deadline;

  card.appendChild(header);
  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(desc);
  card.appendChild(tags);
  card.appendChild(footer);

  return card;
}

function renderOpportunities() {
  oppEls["opp-track"].innerHTML = "";
  MOCK_VAGAS.forEach((vaga) => {
    oppEls["opp-track"].appendChild(renderOpportunityCard(vaga));
  });
}

/** Distância de rolagem de um "passo" do carrossel: a largura de um
 * card (300px) + o espaçamento entre eles (20px, ver .opportunities-track). */
const CARD_SCROLL_STEP = 320;

function wireCarousel() {
  oppEls["opp-prev"].addEventListener("click", () => {
    oppEls["opp-track"].scrollBy({ left: -CARD_SCROLL_STEP, behavior: "smooth" });
  });
  oppEls["opp-next"].addEventListener("click", () => {
    oppEls["opp-track"].scrollBy({ left: CARD_SCROLL_STEP, behavior: "smooth" });
  });

  let autoplayTimer = null;
  const startAutoplay = () => {
    stopAutoplay();
    autoplayTimer = window.setInterval(() => {
      const track = oppEls["opp-track"];
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      track.scrollBy({ left: atEnd ? -track.scrollLeft : CARD_SCROLL_STEP, behavior: "smooth" });
    }, 3500);
  };
  const stopAutoplay = () => {
    if (autoplayTimer) window.clearInterval(autoplayTimer);
  };

  oppEls["opp-track"].addEventListener("mouseenter", stopAutoplay);
  oppEls["opp-track"].addEventListener("mouseleave", startAutoplay);
  oppEls["opp-track"].addEventListener("touchstart", stopAutoplay, { passive: true });

  startAutoplay();
}

function wireLogout() {
  oppEls["btn-logout"].addEventListener("click", () => {
    AuthService.logout();
    window.location.href = "login.html";
  });
}

function init() {
  cacheOppElements();
  renderOpportunities();
  wireCarousel();
  wireLogout();
}

document.addEventListener("DOMContentLoaded", init);
