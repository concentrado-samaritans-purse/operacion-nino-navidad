function sanitizarEnTiempoReal(str) {
    if (!str) return '';
    return str.replace(/[<>]/g, '');
}

function sanitizarTexto(str) {
    if (!str) return '';
    return str.replace(/[<>]/g, '').trim();
}

function normalizarBusqueda(str) {
    if (!str) return '';
    return str
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function cargarSelectoresZonas() {
    const selectores = [
        { id: 'zona_id', placeholder: 'Seleccione una zona...' },
        { id: 'login-zona', placeholder: null },
        { id: 'trasladar-zona-destino', placeholder: null }
    ];

    selectores.forEach(sel => {
        const el = document.getElementById(sel.id);
        if (!el) return;
        el.innerHTML = sel.placeholder ? `<option value="">${sel.placeholder}</option>` : '';
        ZONAS_CATALOGO.forEach(z => {
            const opt = document.createElement('option');
            opt.value = z.id;
            opt.textContent = z.nombre;
            el.appendChild(opt);
        });
    });
}

function inicializarInputsDinamicos(containerId, nombresIniciales = []) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const listaNombres = nombresIniciales.length > 0 ? nombresIniciales : [''];
    listaNombres.forEach((nombre) => {
        agregarFilaInput(container, sanitizarTexto(nombre));
    });
    asegurarFilaVaciaFinal(container);
}

function agregarFilaInput(container, valorInicial = '') {
    const index = container.children.length + 1;
    const divGroup = document.createElement('div');
    divGroup.className = 'dynamic-input-group';
    divGroup.innerHTML = `
        <span class="badge bg-secondary badge-index text-white">${index}</span>
        <input type="text" class="form-control input-perimetro dynamic-input" maxlength="100" placeholder="Nombre completo..." value="${sanitizarTexto(valorInicial)}">
        <button type="button" class="btn btn-outline-danger btn-sm border-0" onclick="eliminarFilaInput(this)" title="Eliminar este casillero">
            <i class="bi bi-trash"></i>
        </button>
    `;
    const input = divGroup.querySelector('input');
    input.addEventListener('input', function () {
        this.value = sanitizarEnTiempoReal(this.value);
        asegurarFilaVaciaFinal(container);
    });
    container.appendChild(divGroup);
    reindexarContainer(container);
}

function reindexarContainer(container) {
    Array.from(container.children).forEach((group, idx) => {
        const badge = group.querySelector('.badge-index');
        if (badge) badge.innerText = idx + 1;
    });
}

function eliminarFilaInput(btn) {
    const group = btn.closest('.dynamic-input-group');
    const container = group.parentElement;
    if (container.children.length === 1) {
        group.querySelector('input').value = '';
        return;
    }
    group.remove();
    asegurarFilaVaciaFinal(container);
    reindexarContainer(container);
}

function asegurarFilaVaciaFinal(container) {
    const inputs = container.querySelectorAll('.dynamic-input');
    if (inputs.length === 0) {
        agregarFilaInput(container, '');
        return;
    }
    const ultimoInput = inputs[inputs.length - 1];
    if (ultimoInput.value.trim() !== '') {
        agregarFilaInput(container, '');
    }
}

function obtenerValoresContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const inputs = container.querySelectorAll('.dynamic-input');
    let nombres = [];
    inputs.forEach(input => {
        const val = sanitizarTexto(input.value);
        if (val !== '') nombres.push(val);
    });
    return nombres;
}

function cambiarVista(vista) {
    document.getElementById('vista-form').classList.add('d-none');
    document.getElementById('vista-admin').classList.add('d-none');
    document.getElementById('vista-detalle').classList.add('d-none');

    document.getElementById('btn-form').className = "btn btn-outline-light btn-animated fw-bold opacity-75 w-100 w-lg-auto";
    document.getElementById('btn-admin').className = "btn btn-outline-light btn-animated fw-bold opacity-75 w-100 w-lg-auto";

    if (vista === 'form') {
        document.getElementById('vista-form').classList.remove('d-none');
        document.getElementById('btn-form').className = "btn btn-success btn-animated fw-bold w-100 w-lg-auto";
    } else if (vista === 'admin') {
        document.getElementById('vista-admin').classList.remove('d-none');
        document.getElementById('btn-admin').className = "btn btn-success btn-animated fw-bold w-100 w-lg-auto";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarSelectoresZonas();
    CATEGORIAS_EDAD.forEach(cat => {
        inicializarInputsDinamicos(`container_${cat.id}`);
    });
});
