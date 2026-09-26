/**
 * combobox.js
 * Autocomplete leve e reutilizável: transforma um <input type="text">
 * comum em um campo com sugestões filtradas enquanto o usuário digita.
 * Evita erros de digitação e mantém os valores padronizados, sem exigir
 * uma biblioteca externa.
 *
 * Exporta dois componentes:
 *   - Combobox: lista simples (usado em Área/Tipo de projeto, Orientador
 *     e, com allowCreate, em Áreas de interesse).
 *   - GroupedCombobox: lista agrupada por categoria com seleção por ID
 *     (usado no campo Curso, agrupado por Centro Acadêmico).
 */

const Combobox = {
  /**
   * @param {HTMLInputElement} inputEl
   * @param {object} config
   * @param {() => string[]} config.getOptions lista atual de opções (chamada a cada digitação, permitindo listas dependentes de outro campo)
   * @param {(value: string) => void} [config.onChange] disparado quando o valor muda (digitação livre ou seleção)
   * @param {boolean} [config.allowCustom=true] se false, o campo é limpo ao perder foco caso o texto não bata com nenhuma opção
   * @param {string} [config.emptyMessage] mensagem exibida quando a busca não encontra nada (se ausente, a lista some)
   * @param {boolean} [config.allowCreate=false] mostra uma opção "+ Adicionar novo(a) ..." quando não há resultados
   * @param {(query: string) => void} [config.onCreate] disparado ao clicar em "+ Adicionar novo(a)"
   * @param {number} [config.maxResults=8]
   */
  attach(inputEl, config) {
    const {
      getOptions,
      onChange,
      allowCustom = true,
      emptyMessage = null,
      allowCreate = false,
      onCreate = null,
      maxResults = 8,
    } = config;

    let wrapper = inputEl.parentElement;
    if (!wrapper || !wrapper.classList.contains("combobox")) {
      wrapper = document.createElement("div");
      wrapper.className = "combobox";
      inputEl.parentNode.insertBefore(wrapper, inputEl);
      wrapper.appendChild(inputEl);
    }
    inputEl.setAttribute("autocomplete", "off");

    const list = document.createElement("ul");
    list.className = "combobox__list";
    list.hidden = true;
    wrapper.appendChild(list);

    let activeIndex = -1;
    let currentMatches = [];

    function renderList() {
      const query = inputEl.value.trim().toLowerCase();
      const options = getOptions() || [];
      currentMatches = query
        ? options.filter((opt) => opt.toLowerCase().includes(query)).slice(0, maxResults)
        : options.slice(0, maxResults);

      list.innerHTML = "";

      if (inputEl.disabled) {
        list.hidden = true;
        return;
      }

      if (currentMatches.length === 0) {
        if (query && allowCreate) {
          const li = document.createElement("li");
          li.className = "combobox__empty";
          li.textContent = emptyMessage || "Nenhum resultado encontrado.";
          list.appendChild(li);

          const createLi = document.createElement("li");
          createLi.className = "combobox__create";
          createLi.textContent = "+ Adicionar “" + inputEl.value.trim() + "”";
          createLi.addEventListener("mousedown", (e) => {
            e.preventDefault();
            if (onCreate) onCreate(inputEl.value.trim());
            list.hidden = true;
          });
          list.appendChild(createLi);
          list.hidden = false;
          return;
        }
        if (query && emptyMessage) {
          const li = document.createElement("li");
          li.className = "combobox__empty";
          li.textContent = emptyMessage;
          list.appendChild(li);
          list.hidden = false;
          return;
        }
        list.hidden = true;
        return;
      }

      currentMatches.forEach((opt, index) => {
        const li = document.createElement("li");
        li.className = "combobox__option" + (index === activeIndex ? " is-active" : "");
        li.textContent = opt;
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          selectOption(opt);
        });
        list.appendChild(li);
      });
      list.hidden = false;
    }

    function selectOption(value) {
      inputEl.value = value;
      list.hidden = true;
      activeIndex = -1;
      if (onChange) onChange(value);
    }

    inputEl.addEventListener("input", () => {
      activeIndex = -1;
      renderList();
      if (onChange) onChange(inputEl.value);
    });

    inputEl.addEventListener("focus", () => {
      if (!inputEl.disabled) renderList();
    });

    inputEl.addEventListener("keydown", (e) => {
      if (list.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        renderList();
        return;
      }
      if (list.hidden) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
        renderList();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderList();
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && currentMatches[activeIndex]) {
          e.preventDefault();
          selectOption(currentMatches[activeIndex]);
        }
      } else if (e.key === "Escape") {
        list.hidden = true;
      }
    });

    inputEl.addEventListener("blur", () => {
      window.setTimeout(() => {
        list.hidden = true;
      }, 120);
      if (!allowCustom) {
        const options = getOptions() || [];
        if (inputEl.value && !options.includes(inputEl.value)) {
          inputEl.value = "";
          if (onChange) onChange("");
        }
      }
    });

    return {
      setValue(value) {
        inputEl.value = value || "";
      },
      close() {
        list.hidden = true;
      },
    };
  },
};

/**
 * Autocomplete de seleção única com resultados agrupados por categoria
 * (ex.: cursos agrupados por Centro Acadêmico) e seleção por ID — o
 * texto exibido é só o rótulo; o valor "real" que deve ser persistido é
 * o id do item escolhido. Não permite texto livre: se o usuário sair do
 * campo sem selecionar um item da lista, o valor é desfeito.
 */
const GroupedCombobox = {
  /**
   * @param {HTMLInputElement} inputEl
   * @param {object} config
   * @param {() => Array<{label:string, options:Array<{id:*, name:string}>}>} config.getGroups
   * @param {(option:{id:*,name:string}|null) => void} config.onSelect
   * @param {string} [config.emptyMessage]
   * @param {number} [config.maxResultsPerGroup=6]
   */
  attach(inputEl, config) {
    const { getGroups, onSelect, emptyMessage = "Nenhum resultado encontrado.", maxResultsPerGroup = 6 } = config;

    let wrapper = inputEl.parentElement;
    if (!wrapper || !wrapper.classList.contains("combobox")) {
      wrapper = document.createElement("div");
      wrapper.className = "combobox";
      inputEl.parentNode.insertBefore(wrapper, inputEl);
      wrapper.appendChild(inputEl);
    }
    inputEl.setAttribute("autocomplete", "off");

    const list = document.createElement("ul");
    list.className = "combobox__list";
    list.hidden = true;
    wrapper.appendChild(list);

    let selected = null; // { id, name }
    let flatMatches = []; // opções selecionáveis na ordem exibida (para navegação por teclado)
    let activeIndex = -1;

    function buildMatches() {
      const query = inputEl.value.trim().toLowerCase();
      const groups = getGroups() || [];
      const result = [];
      groups.forEach((group) => {
        const options = (group.options || []).filter((opt) =>
          query ? opt.name.toLowerCase().includes(query) : true
        );
        if (options.length) {
          result.push({ groupLabel: group.label, options: options.slice(0, maxResultsPerGroup) });
        }
      });
      return result;
    }

    function renderList() {
      if (inputEl.disabled) {
        list.hidden = true;
        return;
      }

      const grouped = buildMatches();
      flatMatches = [];
      list.innerHTML = "";

      if (grouped.length === 0) {
        const li = document.createElement("li");
        li.className = "combobox__empty";
        li.textContent = emptyMessage;
        list.appendChild(li);
        list.hidden = false;
        return;
      }

      grouped.forEach((group) => {
        const header = document.createElement("li");
        header.className = "combobox__group-header";
        header.textContent = group.groupLabel;
        list.appendChild(header);

        group.options.forEach((opt) => {
          const index = flatMatches.length;
          flatMatches.push(opt);

          const li = document.createElement("li");
          li.className = "combobox__option" + (index === activeIndex ? " is-active" : "");
          li.textContent = opt.name;
          li.addEventListener("mousedown", (e) => {
            e.preventDefault();
            selectOption(opt);
          });
          list.appendChild(li);
        });
      });

      list.hidden = false;
    }

    function selectOption(option) {
      selected = option;
      inputEl.value = option.name;
      list.hidden = true;
      activeIndex = -1;
      if (onSelect) onSelect(option);
    }

    inputEl.addEventListener("input", () => {
      activeIndex = -1;
      if (selected && inputEl.value !== selected.name) {
        selected = null;
      }
      renderList();
    });

    inputEl.addEventListener("focus", () => {
      if (!inputEl.disabled) renderList();
    });

    inputEl.addEventListener("keydown", (e) => {
      if (list.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        renderList();
        return;
      }
      if (list.hidden) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, flatMatches.length - 1);
        renderList();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderList();
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && flatMatches[activeIndex]) {
          e.preventDefault();
          selectOption(flatMatches[activeIndex]);
        }
      } else if (e.key === "Escape") {
        list.hidden = true;
      }
    });

    inputEl.addEventListener("blur", () => {
      window.setTimeout(() => {
        list.hidden = true;
      }, 120);
      // Seleção obrigatória: se o texto não corresponde ao item
      // selecionado, desfaz (não salva variações digitadas livremente).
      if (!selected || inputEl.value !== selected.name) {
        selected = null;
        inputEl.value = "";
        if (onSelect) onSelect(null);
      }
    });

    return {
      setValue(option) {
        selected = option || null;
        inputEl.value = option ? option.name : "";
      },
      close() {
        list.hidden = true;
      },
    };
  },
};
