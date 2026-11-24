let archivosCapturaPendientes = [];

// Evita que el navegador abra la imagen en otra pestaña si se suelta fuera del cuadro
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('ocr-dropzone');
    const fileInput = document.getElementById('ocr-file-input');
    const btnSeleccionar = document.getElementById('btn-seleccionar-captura');
    const btnAgregarMas = document.getElementById('btn-agregar-mas-capturas');
    const btnLimpiar = document.getElementById('btn-limpiar-capturas');
    const btnEscanear = document.getElementById('btn-iniciar-escaneo');

    if (!dropzone || !fileInput) return;

    btnSeleccionar?.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    btnAgregarMas?.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    btnLimpiar?.addEventListener('click', (e) => {
        e.stopPropagation();
        limpiarColaCapturas();
    });

    dropzone.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('.btn-quitar-miniatura')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            agregarCapturasACola(e.target.files);
            fileInput.value = '';
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            agregarCapturasACola(e.dataTransfer.files);
        }
    });

    // Pegar una o varias capturas directamente con Ctrl + V
    document.addEventListener('paste', (e) => {
        const vistaForm = document.getElementById('vista-form');
        if (!vistaForm || vistaForm.classList.contains('d-none')) return;

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        const nuevasImagenes = [];
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                if (blob) nuevasImagenes.push(blob);
            }
        }
        if (nuevasImagenes.length > 0) {
            agregarCapturasACola(nuevasImagenes);
        }
    });

    btnEscanear?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (archivosCapturaPendientes.length > 0) {
            procesarMultiplesImagenesOCR(archivosCapturaPendientes);
        }
    });
});

function agregarCapturasACola(fileList) {
    Array.from(fileList).forEach(archivo => {
        if (archivo.type.startsWith('image/')) {
            archivosCapturaPendientes.push(archivo);
        }
    });
    renderizarMiniaturasCapturas();
}

function quitarCapturaDeCola(indice) {
    archivosCapturaPendientes.splice(indice, 1);
    renderizarMiniaturasCapturas();
}

function limpiarColaCapturas() {
    archivosCapturaPendientes = [];
    renderizarMiniaturasCapturas();
}

function renderizarMiniaturasCapturas() {
    const placeholder = document.getElementById('ocr-placeholder');
    const previewBox = document.getElementById('ocr-preview-box');
    const grid = document.getElementById('ocr-preview-grid');
    const contador = document.getElementById('ocr-contador-imagenes');

    if (archivosCapturaPendientes.length === 0) {
        placeholder.classList.remove('d-none');
        previewBox.classList.add('d-none');
        grid.innerHTML = '';
        return;
    }

    placeholder.classList.add('d-none');
    previewBox.classList.remove('d-none');
    grid.innerHTML = '';

    const total = archivosCapturaPendientes.length;
    contador.textContent = total === 1
        ? '1 captura lista para escanear (puedes agregar o pegar más con Ctrl + V)'
        : `${total} capturas listas para escanear en secuencia`;

    archivosCapturaPendientes.forEach((archivo, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'position-relative d-inline-block border border-info rounded overflow-hidden bg-dark';
        wrapper.style.width = '115px';
        wrapper.style.height = '115px';

        const img = document.createElement('img');
        img.className = 'w-100 h-100';
        img.style.objectFit = 'cover';

        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(archivo);

        const badgeNum = document.createElement('span');
        badgeNum.className = 'position-absolute bottom-0 start-0 badge bg-dark bg-opacity-75 text-warning m-1';
        badgeNum.textContent = `#${idx + 1}`;

        const btnRemove = document.createElement('button');
        btnRemove.type = 'button';
        btnRemove.className = 'btn btn-danger btn-sm position-absolute top-0 end-0 p-0 px-1 m-1 btn-quitar-miniatura';
        btnRemove.innerHTML = '×';
        btnRemove.title = 'Quitar esta captura';
        btnRemove.onclick = (e) => {
            e.stopPropagation();
            quitarCapturaDeCola(idx);
        };

        wrapper.appendChild(img);
        wrapper.appendChild(badgeNum);
        wrapper.appendChild(btnRemove);
        grid.appendChild(wrapper);
    });
}

async function procesarMultiplesImagenesOCR(listaArchivos) {
    const statusDiv = document.getElementById('ocr-status');
    const statusText = document.getElementById('ocr-status-text');
    const progressBar = document.getElementById('ocr-progress-bar');
    const btnEscanear = document.getElementById('btn-iniciar-escaneo');
    const btnAgregar = document.getElementById('btn-agregar-mas-capturas');
    const btnLimpiar = document.getElementById('btn-limpiar-capturas');

    btnEscanear.disabled = true;
    btnAgregar.disabled = true;
    btnLimpiar.disabled = true;
    statusDiv.classList.remove('d-none');
    statusText.textContent = 'Iniciando motor lector local...';
    progressBar.style.width = '5%';

    const totalImgs = listaArchivos.length;
    let imagenActualIndex = 0;

    try {
        const worker = await Tesseract.createWorker('spa', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const progresoBase = (imagenActualIndex / totalImgs) * 100;
                    const progresoActual = (m.progress / totalImgs) * 100;
                    const pctTotal = Math.min(99, Math.round(progresoBase + progresoActual));
                    progressBar.style.width = `${pctTotal}%`;
                    statusText.textContent = `Escaneando captura ${imagenActualIndex + 1} de ${totalImgs} (${pctTotal}%)...`;
                }
            }
        });

        let textoCombinado = '';
        for (let i = 0; i < totalImgs; i++) {
            imagenActualIndex = i;
            const ret = await worker.recognize(listaArchivos[i]);
            textoCombinado += '\n' + ret.data.text;
        }

        await worker.terminate();

        const totalDetectados = rellenarFormularioDesdeTexto(textoCombinado);

        progressBar.style.width = '100%';
        statusText.textContent = `¡Listo! Se procesaron ${totalImgs} captura(s) y se cargaron ${totalDetectados} niños.`;
        progressBar.classList.remove('bg-info');
        progressBar.classList.add('bg-success');

        setTimeout(() => {
            statusDiv.classList.add('d-none');
            progressBar.classList.remove('bg-success');
            progressBar.classList.add('bg-info');
            progressBar.style.width = '0%';
            btnEscanear.disabled = false;
            btnAgregar.disabled = false;
            btnLimpiar.disabled = false;
        }, 4500);
    } catch (error) {
        alert('Error al leer las capturas: ' + error.message);
        statusDiv.classList.add('d-none');
        btnEscanear.disabled = false;
        btnAgregar.disabled = false;
        btnLimpiar.disabled = false;
    }
}

function normalizarClave(str) {
    return str
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9_]/g, '');
}

function limpiarValorGeneral(val) {
    const limpio = sanitizarTexto(val);
    if (/no\s*especificado|ninguno|n\/a/i.test(limpio)) return '';
    return limpio;
}

function limpiarNombreNino(linea) {
    let texto = linea
        .replace(/^[-•*oO0-9.)\s]+/, '')
        .replace(/\b[A-Za-z0-9]+_[A-Za-z0-9_.-]+.*$/g, '')
        .replace(/\s*\+\d+\s*$/, '');
    return sanitizarTexto(texto);
}

function rellenarFormularioDesdeTexto(textoCrudo) {
    const lineas = textoCrudo.split('\n').map(l => l.trim()).filter(l => l !== '');

    const listas = {
        ninas_2_4: [],
        ninos_2_4: [],
        ninas_5_9: [],
        ninos_5_9: [],
        ninas_10_14: [],
        ninos_10_14: []
    };

    let seccionActual = null;

    lineas.forEach(linea => {
        const idxDosPuntos = linea.indexOf(':');

        if (idxDosPuntos !== -1) {
            const clave = normalizarClave(linea.substring(0, idxDosPuntos));
            const valor = limpiarValorGeneral(linea.substring(idxDosPuntos + 1));

            if (clave.includes('ZONA')) {
                seccionActual = null;
                if (valor) seleccionarZonaPorNombre(valor);
                return;
            }
            if (clave.includes('IGLESIA')) {
                seccionActual = null;
                if (valor) document.getElementById('nombre_iglesia').value = valor;
                return;
            }
            if (clave.includes('PASTOR')) {
                seccionActual = null;
                if (valor) document.getElementById('nombre_pastor').value = valor;
                return;
            }
            if (clave.includes('DOMICILIO')) {
                seccionActual = null;
                if (valor) document.getElementById('domicilio').value = valor;
                return;
            }
            if (clave.includes('TELEFONO') || clave.includes('CELULAR')) {
                seccionActual = null;
                if (valor) document.getElementById('telefono').value = valor;
                return;
            }
            if (clave.includes('MUNICIPIO')) {
                seccionActual = null;
                if (valor) document.getElementById('municipio_estado').value = valor;
                return;
            }
            if (clave.includes('FECHA')) {
                seccionActual = null;
                const matchFecha = valor.match(/\d{4}-\d{2}-\d{2}/);
                if (matchFecha) document.getElementById('fecha_entrega').value = matchFecha[0];
                return;
            }

            if (clave.includes('NINAS') && clave.includes('2')) { seccionActual = 'ninas_2_4'; return; }
            if (clave.includes('NINOS') && clave.includes('2')) { seccionActual = 'ninos_2_4'; return; }
            if (clave.includes('NINAS') && clave.includes('5')) { seccionActual = 'ninas_5_9'; return; }
            if (clave.includes('NINOS') && clave.includes('5')) { seccionActual = 'ninos_5_9'; return; }
            if (clave.includes('NINAS') && clave.includes('10')) { seccionActual = 'ninas_10_14'; return; }
            if (clave.includes('NINOS') && clave.includes('10')) { seccionActual = 'ninos_10_14'; return; }
        }

        if (seccionActual) {
            const nombreLimpio = limpiarNombreNino(linea);
            if (nombreLimpio.length > 3) {
                listas[seccionActual].push(nombreLimpio);
            }
        }
    });

    let total = 0;
    Object.keys(listas).forEach(catId => {
        if (listas[catId].length > 0) {
            const existentes = obtenerValoresContainer(`container_${catId}`);
            const combinados = [...existentes];

            listas[catId].forEach(nombreNuevo => {
                const yaExiste = combinados.some(e => e.toLowerCase() === nombreNuevo.toLowerCase());
                if (!yaExiste) {
                    combinados.push(nombreNuevo);
                }
            });

            total += listas[catId].length;
            inicializarInputsDinamicos(`container_${catId}`, combinados);
        }
    });

    return total;
}

function seleccionarZonaPorNombre(textoZona) {
    if (!textoZona) return;
    const busq = textoZona.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const encontrada = ZONAS_CATALOGO.find(z => {
        const nom = z.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return busq.includes(nom) || nom.includes(busq);
    });
    if (encontrada) {
        document.getElementById('zona_id').value = String(encontrada.id);
    }
}
