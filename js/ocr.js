document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('ocr-dropzone');
    const fileInput = document.getElementById('ocr-file-input');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            procesarImagenOCR(e.target.files[0]);
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            procesarImagenOCR(e.dataTransfer.files[0]);
        }
    });

    // Permite pegar captura directamente con Ctrl+V cuando estás en el formulario
    document.addEventListener('paste', (e) => {
        const vistaForm = document.getElementById('vista-form');
        if (!vistaForm || vistaForm.classList.contains('d-none')) return;

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                procesarImagenOCR(blob);
                break;
            }
        }
    });
});

async function procesarImagenOCR(archivo) {
    const statusDiv = document.getElementById('ocr-status');
    const statusText = document.getElementById('ocr-status-text');
    const progressBar = document.getElementById('ocr-progress-bar');

    statusDiv.classList.remove('d-none');
    statusText.textContent = 'Iniciando motor lector local...';
    progressBar.style.width = '10%';

    try {
        const worker = await Tesseract.createWorker('spa', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const pct = Math.round(m.progress * 100);
                    progressBar.style.width = `${pct}%`;
                    statusText.textContent = `Leyendo captura: ${pct}%...`;
                }
            }
        });

        const ret = await worker.recognize(archivo);
        await worker.terminate();

        rellenarFormularioDesdeTexto(ret.data.text);

        statusText.textContent = '¡Datos extraídos y rellenados correctamente!';
        progressBar.classList.remove('bg-info');
        progressBar.classList.add('bg-success');
        setTimeout(() => {
            statusDiv.classList.add('d-none');
            progressBar.classList.remove('bg-success');
            progressBar.classList.add('bg-info');
            progressBar.style.width = '0%';
        }, 3500);
    } catch (error) {
        alert('No se pudo leer la imagen: ' + error.message);
        statusDiv.classList.add('d-none');
    }
}

function normalizarClave(str) {
    return str
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9_]/g, '');
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
            const valor = sanitizarTexto(linea.substring(idxDosPuntos + 1));

            if (clave.includes('ZONA')) {
                seccionActual = null;
                seleccionarZonaPorNombre(valor);
                return;
            }
            if (clave.includes('IGLESIA')) {
                seccionActual = null;
                document.getElementById('nombre_iglesia').value = valor;
                return;
            }
            if (clave.includes('PASTOR')) {
                seccionActual = null;
                document.getElementById('nombre_pastor').value = valor;
                return;
            }
            if (clave.includes('DOMICILIO')) {
                seccionActual = null;
                document.getElementById('domicilio').value = valor;
                return;
            }
            if (clave.includes('TELEFONO') || clave.includes('CELULAR')) {
                seccionActual = null;
                document.getElementById('telefono').value = valor;
                return;
            }
            if (clave.includes('MUNICIPIO')) {
                seccionActual = null;
                document.getElementById('municipio_estado').value = valor;
                return;
            }
            if (clave.includes('FECHA')) {
                seccionActual = null;
                const matchFecha = valor.match(/\d{4}-\d{2}-\d{2}/);
                if (matchFecha) document.getElementById('fecha_entrega').value = matchFecha[0];
                return;
            }

            // Detección de secciones de edades
            if (clave.includes('NINAS') && clave.includes('2')) { seccionActual = 'ninas_2_4'; return; }
            if (clave.includes('NINOS') && clave.includes('2')) { seccionActual = 'ninos_2_4'; return; }
            if (clave.includes('NINAS') && clave.includes('5')) { seccionActual = 'ninas_5_9'; return; }
            if (clave.includes('NINOS') && clave.includes('5')) { seccionActual = 'ninos_5_9'; return; }
            if (clave.includes('NINAS') && clave.includes('10')) { seccionActual = 'ninas_10_14'; return; }
            if (clave.includes('NINOS') && clave.includes('10')) { seccionActual = 'ninos_10_14'; return; }
        }

        // Si estamos dentro de una categoría de edades, agregamos el nombre
        if (seccionActual) {
            const nombreLimpio = sanitizarTexto(linea.replace(/^[-•*0-9.)\s]+/, ''));
            if (nombreLimpio.length > 2) {
                listas[seccionActual].push(nombreLimpio);
            }
        }
    });

    // Rellenar los contenedores dinámicos
    Object.keys(listas).forEach(catId => {
        if (listas[catId].length > 0) {
            inicializarInputsDinamicos(`container_${catId}`, listas[catId]);
        }
    });
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
