let archivoCapturaPendiente = null;

// Evita que el navegador abra la imagen en otra pestaña si se suelta fuera del cuadro
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('ocr-dropzone');
    const fileInput = document.getElementById('ocr-file-input');
    const btnSeleccionar = document.getElementById('btn-seleccionar-captura');
    const btnCambiar = document.getElementById('btn-cambiar-captura');
    const btnEscanear = document.getElementById('btn-iniciar-escaneo');

    if (!dropzone || !fileInput) return;

    btnSeleccionar?.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    btnCambiar?.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropzone.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            cargarVistaPreviaCaptura(e.target.files[0]);
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            cargarVistaPreviaCaptura(e.dataTransfer.files[0]);
        }
    });

    // Pegar captura directamente con Ctrl + V
    document.addEventListener('paste', (e) => {
        const vistaForm = document.getElementById('vista-form');
        if (!vistaForm || vistaForm.classList.contains('d-none')) return;

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                cargarVistaPreviaCaptura(blob);
                break;
            }
        }
    });

    btnEscanear?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (archivoCapturaPendiente) {
            procesarImagenOCR(archivoCapturaPendiente);
        }
    });
});

function cargarVistaPreviaCaptura(archivo) {
    archivoCapturaPendiente = archivo;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('ocr-preview-img').src = e.target.result;
        document.getElementById('ocr-placeholder').classList.add('d-none');
        document.getElementById('ocr-preview-box').classList.remove('d-none');
    };
    reader.readAsDataURL(archivo);
}

async function procesarImagenOCR(archivo) {
    const statusDiv = document.getElementById('ocr-status');
    const statusText = document.getElementById('ocr-status-text');
    const progressBar = document.getElementById('ocr-progress-bar');
    const btnEscanear = document.getElementById('btn-iniciar-escaneo');

    btnEscanear.disabled = true;
    statusDiv.classList.remove('d-none');
    statusText.textContent = 'Descargando diccionario español (solo la primera vez)...';
    progressBar.style.width = '15%';

    try {
        const worker = await Tesseract.createWorker('spa', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const pct = Math.round(m.progress * 100);
                    progressBar.style.width = `${pct}%`;
                    statusText.textContent = `Escaneando nombres y datos: ${pct}%...`;
                }
            }
        });

        const ret = await worker.recognize(archivo);
        await worker.terminate();

        const totalDetectados = rellenarFormularioDesdeTexto(ret.data.text);

        statusText.textContent = `¡Listo! Se cargaron ${totalDetectados} niños y los datos de la iglesia.`;
        progressBar.classList.remove('bg-info');
        progressBar.classList.add('bg-success');

        setTimeout(() => {
            statusDiv.classList.add('d-none');
            progressBar.classList.remove('bg-success');
            progressBar.classList.add('bg-info');
            progressBar.style.width = '0%';
            btnEscanear.disabled = false;
        }, 4000);
    } catch (error) {
        alert('Error al leer la captura: ' + error.message);
        statusDiv.classList.add('d-none');
        btnEscanear.disabled = false;
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
        // Quita viñetas iniciales (-, •, *, o, 0, números)
        .replace(/^[-•*oO0-9.)\s]+/, '')
        // Quita etiquetas de archivo de Gemini tipo "Censo_Galilea_150_con..."
        .replace(/\b[A-Za-z0-9]+_[A-Za-z0-9_.-]+.*$/g, '')
        // Quita "+3" o símbolos sueltos al final
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
            total += listas[catId].length;
            inicializarInputsDinamicos(`container_${catId}`, listas[catId]);
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
