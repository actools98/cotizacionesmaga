// domHelpers.js - Funciones para creación y manipulación del DOM

// Estado de colapso por categoría (persistente en sesión)
const collapsedCategories = new Set();

// Cargar estado de colapso desde localStorage
function loadCollapsedState() {
  try {
    const saved = localStorage.getItem('actols_collapsed_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.forEach(id => collapsedCategories.add(id));
    }
  } catch (e) { /* ignore */ }
}

// Guardar estado de colapso en localStorage
function saveCollapsedState() {
  try {
    localStorage.setItem('actols_collapsed_categories', JSON.stringify(Array.from(collapsedCategories)));
  } catch (e) { /* ignore */ }
}

// Cargar estado al inicio
loadCollapsedState();

export function createModuleCard(module, currency, convertFn, formatFn) {
  const { id, description, price } = module;
  const priceConverted = convertFn(price, currency);
  const priceFormatted = formatFn(priceConverted, currency);

  const card = document.createElement('div');
  card.className = 'module-card';
  card.dataset.id = id;
  card.dataset.categoryId = module.category_id || '';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.dataset.id = id;
  checkbox.id = `mod-${id}`;
  checkbox.setAttribute('aria-label', `Seleccionar ${description}`);

  const label = document.createElement('label');
  label.className = 'module-label';
  label.htmlFor = `mod-${id}`;
  label.textContent = description;

  const priceSpan = document.createElement('span');
  priceSpan.className = 'module-price';
  priceSpan.textContent = priceFormatted;

  card.appendChild(checkbox);
  card.appendChild(label);
  card.appendChild(priceSpan);

  return card;
}

export function renderModulesByCategory(container, modules, categories, currency, convertFn, formatFn) {
  container.innerHTML = '';
  if (!categories || categories.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = 'No hay categorías. Agrega una desde el modo Editar.';
    container.appendChild(msg);
    return;
  }

  const grouped = {};
  categories.forEach(cat => {
    grouped[cat.id] = {
      category: cat,
      modules: modules.filter(m => m.category_id === cat.id) || []
    };
  });

  for (const catId in grouped) {
    const { category, modules: mods } = grouped[catId];
    const isCollapsed = collapsedCategories.has(category.id);

    const section = document.createElement('div');
    section.className = 'category-section';
    section.dataset.categoryId = category.id;

    // --- HEADER de categoría (clickeable) ---
    const header = document.createElement('div');
    header.className = 'category-header';
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', !isCollapsed);
    header.setAttribute('tabindex', '0');
    header.style.cursor = 'pointer';

    // Título
    const title = document.createElement('h3');
    title.textContent = category.name;
    header.appendChild(title);

    // Contador de módulos
    const counter = document.createElement('span');
    counter.className = 'category-counter';
    counter.textContent = `${mods.length} servicio${mods.length !== 1 ? 's' : ''}`;
    header.appendChild(counter);

    // Flecha de toggle
    const arrow = document.createElement('span');
    arrow.className = 'category-arrow';
    arrow.textContent = isCollapsed ? '▶' : '▼';
    header.appendChild(arrow);

    // Evento toggle al hacer clic en el header
    header.addEventListener('click', () => {
      toggleCategory(section, header, arrow, category.id);
    });

    // También con teclado (accesibilidad)
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCategory(section, header, arrow, category.id);
      }
    });

    section.appendChild(header);

    // --- LISTA de módulos (contenido colapsable) ---
    const listWrapper = document.createElement('div');
    listWrapper.className = 'category-modules-wrapper';
    if (isCollapsed) listWrapper.classList.add('collapsed');

    const list = document.createElement('div');
    list.className = 'module-list';
    list.dataset.categoryId = category.id;

    if (mods.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-message';
      empty.textContent = 'No hay módulos en esta categoría.';
      list.appendChild(empty);
    } else {
      mods.forEach(mod => {
        const card = createModuleCard(mod, currency, convertFn, formatFn);
        list.appendChild(card);
      });
    }

    listWrapper.appendChild(list);
    section.appendChild(listWrapper);
    container.appendChild(section);
  }
}

function toggleCategory(section, header, arrow, categoryId) {
  const wrapper = section.querySelector('.category-modules-wrapper');
  const isCollapsed = wrapper.classList.toggle('collapsed');
  
  header.setAttribute('aria-expanded', !isCollapsed);
  arrow.textContent = isCollapsed ? '▶' : '▼';
  
  if (isCollapsed) {
    collapsedCategories.add(categoryId);
  } else {
    collapsedCategories.delete(categoryId);
  }
  saveCollapsedState();
}

export function createAdminModuleCard(module, onDelete, onEdit) {
  const { id, description, price } = module;
  const card = document.createElement('div');
  card.className = 'module-card admin-mode';
  card.dataset.id = id;
  card.dataset.categoryId = module.category_id || '';

  const info = document.createElement('span');
  info.className = 'module-label';
  info.textContent = description;

  const priceSpan = document.createElement('span');
  priceSpan.className = 'module-price';
  priceSpan.textContent = `$ ${Number(price).toLocaleString('es-CO')}`;

  const actions = document.createElement('div');
  actions.className = 'admin-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-edit';
  editBtn.textContent = 'Editar';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onEdit(id);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-delete';
  deleteBtn.textContent = 'Eliminar';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onDelete(id);
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  card.appendChild(info);
  card.appendChild(priceSpan);
  card.appendChild(actions);

  return card;
}

export function renderAdminModulesByCategory(container, modules, categories, onDeleteModule, onEditModule, onEditCategory, onDeleteCategory) {
  container.innerHTML = '';
  if (!categories || categories.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = 'No hay categorías. Agrega una.';
    container.appendChild(msg);
    return;
  }

  const grouped = {};
  categories.forEach(cat => {
    grouped[cat.id] = {
      category: cat,
      modules: modules.filter(m => m.category_id === cat.id) || []
    };
  });

  for (const catId in grouped) {
    const { category, modules: mods } = grouped[catId];
    const section = document.createElement('div');
    section.className = 'category-section';
    section.dataset.categoryId = category.id;

    // En modo administración, las categorías SIEMPRE están expandidas
    const header = document.createElement('div');
    header.className = 'category-header';

    const title = document.createElement('h3');
    title.textContent = category.name;
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'category-actions';

    const editCatBtn = document.createElement('button');
    editCatBtn.className = 'btn btn-edit-cat';
    editCatBtn.textContent = 'Editar';
    editCatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onEditCategory(category.id);
    });

    const deleteCatBtn = document.createElement('button');
    deleteCatBtn.className = 'btn btn-delete-cat';
    deleteCatBtn.textContent = 'Eliminar';
    deleteCatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onDeleteCategory(category.id);
    });

    actions.appendChild(editCatBtn);
    actions.appendChild(deleteCatBtn);
    header.appendChild(actions);
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'module-list';
    list.dataset.categoryId = category.id;

    if (mods.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-message';
      empty.textContent = 'No hay módulos en esta categoría.';
      list.appendChild(empty);
    } else {
      mods.forEach(mod => {
        const card = createAdminModuleCard(mod, onDeleteModule, onEditModule);
        list.appendChild(card);
      });
    }
    section.appendChild(list);
    container.appendChild(section);
  }
}

// Función para colapsar todas las categorías
export function collapseAllCategories() {
  document.querySelectorAll('.category-section').forEach(section => {
    const categoryId = section.dataset.categoryId;
    if (categoryId && !collapsedCategories.has(categoryId)) {
      collapsedCategories.add(categoryId);
      const wrapper = section.querySelector('.category-modules-wrapper');
      const arrow = section.querySelector('.category-arrow');
      const header = section.querySelector('.category-header');
      if (wrapper) wrapper.classList.add('collapsed');
      if (arrow) arrow.textContent = '▶';
      if (header) header.setAttribute('aria-expanded', 'false');
    }
  });
  saveCollapsedState();
}

// Función para expandir todas las categorías
export function expandAllCategories() {
  document.querySelectorAll('.category-section').forEach(section => {
    const categoryId = section.dataset.categoryId;
    if (categoryId && collapsedCategories.has(categoryId)) {
      collapsedCategories.delete(categoryId);
      const wrapper = section.querySelector('.category-modules-wrapper');
      const arrow = section.querySelector('.category-arrow');
      const header = section.querySelector('.category-header');
      if (wrapper) wrapper.classList.remove('collapsed');
      if (arrow) arrow.textContent = '▼';
      if (header) header.setAttribute('aria-expanded', 'true');
    }
  });
  saveCollapsedState();
}
