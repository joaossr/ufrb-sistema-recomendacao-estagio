/**
 * adminMockProfiles.js
 * -----------------------------------------------------------------------
 * Perfis fictícios de demonstração, usados em duas telas nesta etapa
 * (somente frontend, sem banco de dados): para popular o painel
 * administrativo e para simular a checagem de "matrícula já cadastrada"
 * no formulário de cadastro — hoje o navegador só guarda o cadastro do
 * próprio estudante (localStorage), não existe uma base real com todos
 * os estudantes da UFRB.
 *
 * Quando o backend/API existir, este arquivo deixa de ser usado: tanto
 * a listagem do admin quanto a checagem de matrícula UNIQUE passam a
 * ser resolvidas por uma consulta real à tabela `alunos` no PostgreSQL.
 * -----------------------------------------------------------------------
 */

const ADMIN_MOCK_PROFILES = [
  {
    profile: {
      id: "mock-ana-beatriz",
      full_name: "Ana Beatriz Souza Lima",
      lattes_id: "4127859630145872",
      email: "ana.lima@aluno.ufrb.edu.br",
      phone: "(75) 99811-2233",
      registration_number: "2019104522",
      linkedin_url: "https://www.linkedin.com/in/anabeatrizlima",
      course: "Bacharelado em Matemática",
      institution: "Universidade Federal do Recôncavo da Bahia",
      education_level: "Graduação",
      education_status: "Em andamento",
      education_start_year: "2019",
      education_end_year: "",
      semester: "8º",
      expected_graduation: "2027",
      has_experience: true,
      tcc_status: "em_andamento",
      tcc_title: "Modelos preditivos para evasão universitária no CETEC",
      tcc_summary:
        "Aplicação de modelos estatísticos e de aprendizado de máquina para identificar fatores associados à evasão em cursos de exatas.",
      tcc_advisor: "Profa. Dra. Patrícia Gomes Teixeira",
      tcc_keywords: ["Evasão universitária", "Machine Learning", "Estatística aplicada"],
      updated_at: "2026-09-10T13:20:00.000Z",
    },
    technologies: [
      { id: "t1", name: "R", level: "Avançado" },
      { id: "t2", name: "Python", level: "Intermediário" },
      { id: "t3", name: "Power BI", level: "Intermediário" },
      { id: "t4", name: "SQL", level: "Avançado" },
    ],
    projects: [
      {
        id: "p1",
        name: "Painel de Indicadores Acadêmicos",
        description: "Dashboard em Power BI para acompanhar evasão e desempenho dos cursos do CETEC.",
        academic_center: "CETEC",
        course: "Bacharelado em Matemática",
        area: "Ciência de Dados",
        type: "Projeto de Extensão",
        technologies: ["Power BI", "SQL", "Python"],
        link: "",
      },
      {
        id: "p2",
        name: "Modelagem Estatística de Séries Temporais",
        description: "Iniciação científica sobre previsão de demanda usando modelos ARIMA.",
        academic_center: "CETEC",
        course: "Bacharelado em Matemática",
        area: "Estatística Aplicada",
        type: "Iniciação Científica",
        technologies: ["R"],
        link: "",
      },
    ],
    experiences: [
      {
        id: "e1",
        company: "NIT/UFRB",
        role: "Bolsista de Iniciação Científica",
        work_area: "Pesquisa e Desenvolvimento",
        start_date: "2024-03",
        end_date: "",
        is_current: true,
        description: "Apoio em análises estatísticas de projetos de pesquisa do núcleo.",
        technologies: ["R", "SQL"],
      },
    ],
    interests: ["Ciência de Dados", "Estatística", "Pesquisa"],
  },
  {
    profile: {
      id: "mock-carlos-eduardo",
      full_name: "Carlos Eduardo Nascimento",
      lattes_id: "7834501296387410",
      email: "carlos.nascimento@aluno.ufrb.edu.br",
      phone: "",
      registration_number: "2021118890",
      linkedin_url: "",
      course: "Engenharia Civil",
      institution: "Universidade Federal do Recôncavo da Bahia",
      education_level: "Graduação",
      education_status: "Em andamento",
      education_start_year: "2021",
      education_end_year: "",
      semester: "5º",
      expected_graduation: "2029",
      has_experience: false,
      tcc_status: "nao_iniciou",
      tcc_title: "",
      tcc_summary: "",
      tcc_advisor: "",
      tcc_keywords: [],
      updated_at: "2026-09-08T09:05:00.000Z",
    },
    technologies: [
      { id: "t5", name: "AutoCAD", level: "Avançado" },
      { id: "t6", name: "SketchUp", level: "Intermediário" },
      { id: "t7", name: "Excel", level: "Intermediário" },
    ],
    projects: [
      {
        id: "p3",
        name: "Levantamento Topográfico do Campus",
        description: "Projeto de disciplina de mapeamento topográfico da área do CETEC.",
        academic_center: "CETEC",
        course: "Engenharia Civil",
        area: "Engenharia",
        type: "Projeto Acadêmico",
        technologies: ["AutoCAD"],
        link: "",
      },
    ],
    experiences: [],
    interests: ["Engenharia"],
  },
  {
    profile: {
      id: "mock-fernanda-oliveira",
      full_name: "Fernanda Oliveira Cruz",
      lattes_id: "",
      email: "",
      phone: "",
      registration_number: "2022130044",
      linkedin_url: "",
      course: "Gestão Ambiental",
      institution: "",
      education_level: "",
      education_status: "",
      education_start_year: "",
      education_end_year: "",
      semester: "3º",
      expected_graduation: "2030",
      has_experience: false,
      tcc_status: "nao_iniciou",
      tcc_title: "",
      tcc_summary: "",
      tcc_advisor: "",
      tcc_keywords: [],
      updated_at: "2026-09-05T17:45:00.000Z",
    },
    technologies: [{ id: "t8", name: "Excel", level: "Básico" }],
    projects: [],
    experiences: [],
    interests: [],
  },
];
