/**
 * lattesParser.js
 * Leitura e interpretação, inteiramente no navegador, do XML exportado
 * pela plataforma Currículo Lattes (nenhum dado sai da máquina do
 * usuário e nenhuma chamada é feita a servidores do Lattes/CNPq —
 * apenas o arquivo local escolhido pelo próprio usuário é lido).
 *
 * Extrai o que realmente existe no XML do Lattes:
 *   - Nome completo
 *   - ID Lattes (NUMERO-IDENTIFICADOR)
 *   - Formação acadêmica (nível, curso e instituição de cada vínculo)
 *   - Idiomas (compreensão, fala, leitura e escrita de cada um)
 *   - E-mail e telefone, quando o titular optou por exporta-los
 *     (o Lattes costuma omitir esses dois por padrão, por privacidade)
 *
 * IMPORTANTE: o Currículo Lattes não tem conceito de "matrícula"
 * (é um identificador interno de cada universidade, não do CNPq), então
 * esse campo nunca é extraído — o próprio aluno precisa preenchê-lo.
 */

const LATTES_LEVEL_LABELS = {
  "GRADUACAO": "Graduação",
  "ESPECIALIZACAO": "Especialização",
  "MESTRADO": "Mestrado",
  "DOUTORADO": "Doutorado",
  "POS-DOUTORADO": "Pós-Doutorado",
  "LIVRE-DOCENCIA": "Livre-Docência",
};

const LATTES_STATUS_LABELS = {
  "CONCLUIDO": "Concluído",
  "EM_ANDAMENTO": "Em andamento",
  "EM-ANDAMENTO": "Em andamento",
  "INTERROMPIDO": "Interrompido",
  "TRANCADO": "Trancado",
};

function lattesFormatStatus(rawStatus) {
  if (!rawStatus) return "";
  return LATTES_STATUS_LABELS[rawStatus.toUpperCase()] || rawStatus;
}

const LATTES_PROFICIENCY_LABELS = {
  "NADA": "Nada",
  "POUCO": "Pouco",
  "RAZOAVEL": "Razoavelmente",
  "RAZOAVELMENTE": "Razoavelmente",
  "BEM": "Bem",
};

function lattesFormatProficiency(rawValue) {
  if (!rawValue) return "";
  const upper = rawValue.toUpperCase();
  if (LATTES_PROFICIENCY_LABELS[upper]) return LATTES_PROFICIENCY_LABELS[upper];
  return rawValue.charAt(0).toUpperCase() + rawValue.slice(1).toLowerCase();
}

/** O Lattes às vezes grava só a sigla do idioma (ex.: "PT", "EN"),
 * outras vezes o nome por extenso, sem acento ("INGLES"). Normaliza os
 * dois casos para um nome completo e legível. */
const LATTES_LANGUAGE_NAMES = {
  "PT": "Português", "POR": "Português", "PORTUGUES": "Português",
  "EN": "Inglês", "ING": "Inglês", "INGLES": "Inglês",
  "ES": "Espanhol", "ESP": "Espanhol", "ESPANHOL": "Espanhol", "CASTELHANO": "Espanhol",
  "FR": "Francês", "FRA": "Francês", "FRANCES": "Francês",
  "DE": "Alemão", "ALE": "Alemão", "ALEMAO": "Alemão",
  "IT": "Italiano", "ITA": "Italiano", "ITALIANO": "Italiano",
  "JA": "Japonês", "JAP": "Japonês", "JAPONES": "Japonês",
  "ZH": "Mandarim", "CHI": "Mandarim", "MANDARIM": "Mandarim", "CHINES": "Mandarim",
  "NL": "Holandês", "HOLANDES": "Holandês",
  "RU": "Russo", "RUSSO": "Russo",
  "DL": "Língua Brasileira de Sinais (Libras)", "LIBRAS": "Língua Brasileira de Sinais (Libras)",
};

function lattesFormatLanguageName(rawValue) {
  if (!rawValue) return "";
  const trimmed = rawValue.trim();
  const upper = trimmed.toUpperCase();
  if (LATTES_LANGUAGE_NAMES[upper]) return LATTES_LANGUAGE_NAMES[upper];
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/** Igual a lattesFindAttr, mas casa por SUBSTRING no nome do atributo
 * em vez de nome exato — o Lattes varia o nome exato de atributo entre
 * exportações/versões (ex.: "LEITURA" vs "PROFICIENCIA-DE-LEITURA"),
 * então procurar um trecho em comum é mais resistente a essa variação. */
function lattesFindAttrContains(element, nameContains) {
  const attrs = element.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (!attr.value || !attr.value.trim()) continue;
    const upperName = attr.name.toUpperCase();
    if (nameContains.some((part) => upperName.includes(part))) {
      return attr.value.trim();
    }
  }
  return "";
}

function lattesFindAttr(element, attrNames) {
  for (const name of attrNames) {
    const value = element.getAttribute(name);
    if (value) return value.trim();
  }
  return "";
}

function lattesFindFirstElement(doc, tagNames) {
  for (const tag of tagNames) {
    const found = doc.getElementsByTagName(tag)[0];
    if (found) return found;
  }
  return null;
}

/** Varre todos os elementos do documento procurando um atributo cujo
 * nome contenha algum dos trechos informados (busca ampla, pois o
 * Lattes nem sempre expõe e-mail/telefone e a posição exata varia). */
function lattesFindAnyAttribute(doc, nameContains) {
  const all = doc.getElementsByTagName("*");
  for (let i = 0; i < all.length; i++) {
    const attrs = all[i].attributes;
    for (let j = 0; j < attrs.length; j++) {
      const attr = attrs[j];
      if (!attr.value.trim()) continue;
      const upperName = attr.name.toUpperCase();
      if (nameContains.some((part) => upperName.includes(part))) {
        return attr.value.trim();
      }
    }
  }
  return "";
}

function lattesExtractPhone(doc) {
  const ddd = lattesFindAnyAttribute(doc, ["DDD-TELEFONE-COMERCIAL", "DDD-CELULAR"]);
  const number = lattesFindAnyAttribute(doc, [
    "TELEFONE-COMERCIAL",
    "TELEFONE-CELULAR",
    "NUMERO-DO-CELULAR",
  ]);
  if (ddd && number) return "(" + ddd + ") " + number;
  return number || "";
}

/**
 * O Lattes exporta o XML como ISO-8859-1 (Latin-1) por padrão — lê-lo
 * como UTF-8 (comportamento padrão de FileReader/fetch) corrompe todo
 * acento ("João" vira "Jo�o"). Aqui a codificação declarada no próprio
 * arquivo é detectada antes de decodificar o texto completo.
 */
function lattesDetectEncoding(bytes) {
  const header = new TextDecoder("ascii").decode(bytes.slice(0, 200));
  const match = header.match(/encoding=["']([^"']+)["']/i);
  if (!match) return "iso-8859-1";
  const declared = match[1].toLowerCase();
  if (declared === "utf-8" || declared === "utf8") return "utf-8";
  return "iso-8859-1";
}

const LattesParser = {
  /** Lê um File com a codificação declarada no seu próprio cabeçalho XML. */
  async readFile(file) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const encoding = lattesDetectEncoding(buffer);
    return new TextDecoder(encoding).decode(buffer);
  },

  /**
   * @param {string} xmlText conteúdo bruto do arquivo .xml (já decodificado)
   * @returns {{ok:boolean, error?:string, fullName?:string, lattesId?:string, email?:string, phone?:string, formations?:Array}}
   */
  parse(xmlText) {
    let doc;
    try {
      doc = new DOMParser().parseFromString(xmlText, "application/xml");
    } catch (err) {
      return { ok: false, error: "Não foi possível ler o conteúdo do arquivo." };
    }

    if (doc.getElementsByTagName("parsererror")[0]) {
      return { ok: false, error: "O arquivo selecionado não é um XML válido." };
    }

    const root = doc.documentElement;
    if (!root || !/CURRICULO-?VITAE/i.test(root.tagName)) {
      return { ok: false, error: "Este arquivo não parece ser um Currículo Lattes exportado em XML." };
    }

    const dadosGerais = lattesFindFirstElement(doc, ["DADOS-GERAIS"]);
    const fullName =
      lattesFindAttr(root, ["NOME-COMPLETO"]) ||
      (dadosGerais ? lattesFindAttr(dadosGerais, ["NOME-COMPLETO"]) : "");
    const lattesId = lattesFindAttr(root, ["NUMERO-IDENTIFICADOR"]);
    const email = lattesFindAnyAttribute(doc, ["EMAIL", "E-MAIL"]);
    const phone = lattesExtractPhone(doc);

    const formations = [];
    const formationWrapper = lattesFindFirstElement(doc, ["FORMACAO-ACADEMICA-TITULACAO"]);
    if (formationWrapper) {
      Array.from(formationWrapper.children).forEach((el) => {
        const tag = el.tagName.toUpperCase();
        const levelLabel = LATTES_LEVEL_LABELS[tag];
        if (!levelLabel) return;

        const course = lattesFindAttr(el, ["NOME-CURSO"]);
        const institution =
          lattesFindAttr(el, ["NOME-INSTITUICAO"]) || lattesFindAttr(el, ["NOME-ORGAO"]);
        const status = lattesFormatStatus(lattesFindAttr(el, ["STATUS-DO-CURSO"]));
        const startYear = lattesFindAttr(el, ["ANO-DE-INICIO"]);
        const endYear = lattesFindAttr(el, ["ANO-DE-CONCLUSAO"]);

        if (!course && !institution) return;

        formations.push({
          levelTag: tag,
          level: levelLabel,
          course: course || "Não informado no arquivo",
          institution: institution || "Não informada no arquivo",
          status,
          startYear,
          endYear,
        });
      });
    }

    const languages = [];
    const languagesWrapper = lattesFindFirstElement(doc, ["IDIOMAS"]);
    if (languagesWrapper) {
      Array.from(languagesWrapper.children).forEach((el) => {
        const rawName =
          lattesFindAttr(el, ["NOME-DO-IDIOMA", "DESCRICAO-DO-IDIOMA"]) ||
          lattesFindAttrContains(el, ["IDIOMA"]);
        if (!rawName) return;
        languages.push({
          name: lattesFormatLanguageName(rawName),
          reading: lattesFormatProficiency(lattesFindAttrContains(el, ["LEITURA"])),
          speaking: lattesFormatProficiency(lattesFindAttrContains(el, ["FALA"])),
          writing: lattesFormatProficiency(lattesFindAttrContains(el, ["ESCRIT", "ESCREV"])),
          comprehension: lattesFormatProficiency(
            lattesFindAttrContains(el, ["COMPREEN", "ENTEND"])
          ),
        });
      });
    }

    if (!fullName && !lattesId && formations.length === 0) {
      return {
        ok: false,
        error: "Não foi possível localizar nome, ID Lattes ou formação acadêmica neste arquivo.",
      };
    }

    return { ok: true, fullName, lattesId, email, phone, formations, languages };
  },
};
