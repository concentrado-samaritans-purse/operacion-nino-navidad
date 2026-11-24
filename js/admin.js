async function verificarLogin() {
    const zonaId = parseInt(document.getElementById('login-zona').value, 10);
    const pass = document.getElementById('login-pass').value.trim();

    if (isNaN(zonaId)) {
        alert('Seleccione una zona válida.');
        return;
    }

    const zonaCatalogo = ZONAS_CATALOGO.find(z => z.id === zonaId);
    let nombreZona = zonaCatalogo ? zonaCatalogo.nombre : `Zona ${zonaId}`;
    let passValido = false;

    // Intenta consultar en Supabase si existe la zona
    const { data, error } = await _supabase
        .from('zonas')
        .select('*')
        .eq('id', zonaId)
        .single();

    if (!error && data) {
        nombreZona = data.nombre_zona || nombreZona;
        if (data.password_admin === pass || pass === MASTER_ADMIN_PASS) {
            passValido = true;
        }
    } else if (zonaCatalogo && (pass === zonaCatalogo.pass || pass === MASTER_ADMIN_PASS)) {
        // Respaldo local para zonas nuevas en catálogo si aún no están en tabla zonas
        passValido = true;
    }

    if (passValido) {
        zonaActualId = zonaId;
        document.getElementById('titulo-zona-admin').innerHTML = `<i class="bi bi-speedometer2 me-2"></i>Panel de Administración`;
        document.getElementById('subtitulo-zona').innerText = `Zona activa: ${nombreZona.toUpperCase()}`;
        document.getElementById('admin-login').classList.add('d-none');
        document.getElementById('admin-dashboard').classList.remove('d-none');
        cargarDatosAdmin();
    } else {
        alert('Contraseña incorrecta para esta zona.');
    }
}

function cerrarSesion() {
    zonaActualId = null;
    document.getElementById('login-pass').value = '';
    document.getElementById('admin-dashboard').classList.add('d-none');
    document.getElementById('admin-login').classList.remove('d-none');
}

async function cargarDatosAdmin() {
    if (!zonaActualId) return;
    const { data: iglesias, error } = await _supabase
        .from('iglesias')
        .select('*, ninos(*)')
        .eq('zona_id', zonaActualId);

    if (error) {
        alert('Error al cargar los datos.');
        return;
    }

    datosIglesiasZona = iglesias;
    filtrarIglesias();
}

function limpiarFiltros() {
    document.getElementById('buscador-iglesias').value = '';
    document.getElementById('filtro-fecha-inicio').value = '';
    document.getElementById('filtro-fecha-fin').value = '';
    document.getElementById('filtro-orden').value = 'nombre-asc';
    filtrarIglesias();
}

function filtrarIglesias() {
    const query = sanitizarTexto(document.getElementById('buscador-iglesias').value).toLowerCase();
    const fechaInicio = document.getElementById('filtro-fecha-inicio').value;
    const fechaFin = document.getElementById('filtro-fecha-fin').value;
    const orden = document.getElementById('filtro-orden').value;

    let filtradas = datosIglesiasZona.filter(iglesia => {
        let coincideTexto =
            iglesia.nombre_iglesia.toLowerCase().includes(query) ||
            iglesia.nombre_pastor.toLowerCase().includes(query) ||
            iglesia.municipio_estado.toLowerCase().includes(query);

        let coincideFecha = true;
        if (fechaInicio && iglesia.fecha_entrega < fechaInicio) coincideFecha = false;
        if (fechaFin && iglesia.fecha_entrega > fechaFin) coincideFecha = false;

        return coincideTexto && coincideFecha;
    });

    filtradas.sort((a, b) => {
        if (orden === 'nombre-asc') return a.nombre_iglesia.localeCompare(b.nombre_iglesia);
        if (orden === 'fecha-reciente') return new Date(b.fecha_entrega) - new Date(a.fecha_entrega);
        if (orden === 'infantes-mayor') return b.ninos.length - a.ninos.length;
        return 0;
    });

    renderizarDashboard(filtradas);
}

function renderizarDashboard(listaIglesias) {
    const contenedorCatalogo = document.getElementById('lista-iglesias-catalogo');
    const tarjetasTotales = document.getElementById('tarjetas-totales');
    contenedorCatalogo.innerHTML = '';

    let totalCajitas = 0;
    datosIglesiasZona.forEach(iglesia => {
        totalCajitas += iglesia.ninos.length;
    });

    if (listaIglesias.length === 0) {
        contenedorCatalogo.innerHTML = '<p class="text-muted text-center py-3">No se encontraron iglesias registradas con esos filtros.</p>';
    }

    listaIglesias.forEach(iglesia => {
        let totalIglesia = iglesia.ninos.length;

        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-6';

        const cardDiv = document.createElement('div');
        cardDiv.className = 'border rounded-4 p-3 bg-light h-100 shadow-sm btn-animated d-flex flex-column justify-content-between';
        cardDiv.style.cursor = 'pointer';
        cardDiv.onclick = () => verDetalleIglesia(iglesia.id);

        const topContent = document.createElement('div');
        topContent.innerHTML = `
            <span class="badge bg-success mb-2"><i class="bi bi-calendar-check me-1"></i> Entrega: ${iglesia.fecha_entrega}</span>
            <h4 class="h5 fw-bold text-success mb-1"></h4>
            <p class="text-secondary small mb-1"><i class="bi bi-person-fill me-1"></i> Pastor: <strong></strong></p>
            <p class="text-muted small mb-0"><i class="bi bi-geo-alt-fill me-1"></i> <span></span></p>
        `;
        topContent.querySelector('h4').textContent = iglesia.nombre_iglesia;
        topContent.querySelector('strong').textContent = iglesia.nombre_pastor;
        topContent.querySelector('span').textContent = iglesia.municipio_estado;

        const bottomContent = document.createElement('div');
        bottomContent.className = 'mt-3 pt-2 border-top d-flex justify-content-between align-items-center flex-wrap gap-2';
        bottomContent.innerHTML = `
            <span class="fw-bold text-dark small"><i class="bi bi-people-fill text-success me-1"></i> Total infantes: ${totalIglesia}</span>
            <span class="text-success fw-bold small">Gestionar y ver detalles <i class="bi bi-arrow-right"></i></span>
        `;

        cardDiv.appendChild(topContent);
        cardDiv.appendChild(bottomContent);
        colDiv.appendChild(cardDiv);
        contenedorCatalogo.appendChild(colDiv);
    });

    tarjetasTotales.innerHTML = `
        <div class="col-12 col-md-4">
            <div class="card bg-success text-white p-3 rounded-4 shadow h-100 d-flex flex-row align-items-center justify-content-between">
                <div>
                    <h6 class="text-uppercase small opacity-75 mb-1">Iglesias</h6>
                    <p class="h2 fw-bold mb-0">${datosIglesiasZona.length}</p>
                </div>
                <i class="bi bi-house-door-fill fs-1 opacity-50"></i>
            </div>
        </div>
        <div class="col-12 col-md-4">
            <div class="card bg-primary text-white p-3 rounded-4 shadow h-100 d-flex flex-row align-items-center justify-content-between">
                <div>
                    <h6 class="text-uppercase small opacity-75 mb-1">Cajitas / Niños</h6>
                    <p class="h2 fw-bold mb-0">${totalCajitas}</p>
                </div>
                <i class="bi bi-box-seam-fill fs-1 opacity-50"></i>
            </div>
        </div>
        <div class="col-12 col-md-4">
            <div class="card bg-dark text-white p-3 rounded-4 shadow h-100 border border-success d-flex flex-row align-items-center justify-content-between">
                <div>
                    <h6 class="text-uppercase small opacity-75 mb-1">Maestros / Pastores</h6>
                    <p class="h2 fw-bold mb-0">${datosIglesiasZona.length}</p>
                </div>
                <i class="bi bi-person-badge-fill fs-1 opacity-50 text-success"></i>
            </div>
        </div>
    `;
}

function verDetalleIglesia(id) {
    iglesiaSeleccionada = datosIglesiasZona.find(i => i.id === id);
    if (!iglesiaSeleccionada) return;

    document.getElementById('vista-admin').classList.add('d-none');
    document.getElementById('vista-detalle').classList.remove('d-none');

    let ninas24 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '2-4');
    let ninos24 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '2-4');
    let ninas59 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '5-9');
    let ninos59 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '5-9');
    let ninas1014 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '10-14');
    let ninos1014 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '10-14');

    let totalNinas = ninas24.length + ninas59.length + ninas1014.length;
    let totalNinos = ninos24.length + ninos59.length + ninos1014.length;
    let totalGlobal = totalNinas + totalNinos;

    let maxLen = Math.max(ninas24.length, ninos24.length, ninas59.length, ninos59.length, ninas1014.length, ninos1014.length, 1);

    let htmlTablaNombres = '';
    for (let i = 0; i < maxLen; i++) {
        let n1 = ninas24[i] ? document.createTextNode(ninas24[i].nombre_completo).nodeValue : '';
        let n2 = ninos24[i] ? document.createTextNode(ninos24[i].nombre_completo).nodeValue : '';
        let n3 = ninas59[i] ? document.createTextNode(ninas59[i].nombre_completo).nodeValue : '';
        let n4 = ninos59[i] ? document.createTextNode(ninos59[i].nombre_completo).nodeValue : '';
        let n5 = ninas1014[i] ? document.createTextNode(ninas1014[i].nombre_completo).nodeValue : '';
        let n6 = ninos1014[i] ? document.createTextNode(ninos1014[i].nombre_completo).nodeValue : '';

        htmlTablaNombres += `
            <tr>
                <td class="text-center fw-bold">${i + 1}</td>
                <td>${n1}</td>
                <td>${n2}</td>
                <td>${n3}</td>
                <td>${n4}</td>
                <td>${n5}</td>
                <td>${n6}</td>
            </tr>
        `;
    }

    const detalleContenedor = document.getElementById('detalle-contenido-iglesia');
    detalleContenedor.innerHTML = `
        <div class="border p-3 bg-white rounded shadow-sm">
            <div class="row border-bottom pb-2 mb-2">
                <div class="col-12"><strong class="text-dark">NOMBRE DE LA IGLESIA:</strong> <span class="text-success fw-bold" id="det-iglesia"></span></div>
                <div class="col-md-6"><strong class="text-dark">NOMBRE DEL PASTOR:</strong> <span id="det-pastor"></span></div>
                <div class="col-md-6"><strong class="text-dark">DOMICILIO:</strong> <span id="det-domicilio"></span></div>
                <div class="col-md-6"><strong class="text-dark">NO. TELÉFONO Y CELULAR:</strong> <span id="det-tel"></span></div>
                <div class="col-md-6"><strong class="text-dark">MUNICIPIO, ESTADO:</strong> <span id="det-mun"></span></div>
                <div class="col-12"><strong class="text-dark">FECHA DE ENTREGA DE LA LISTA:</strong> <span id="det-fecha"></span></div>
            </div>

            <div class="table-responsive mb-3">
                <table class="table table-bordered table-sm text-center align-middle">
                    <thead class="table-light">
                        <tr>
                            <th rowspan="2" class="align-middle">EDADES<br>NIÑAS (OS)</th>
                            <th>2-4</th>
                            <th>5-9</th>
                            <th>10-14</th>
                            <th>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="fw-bold text-start ps-3">NIÑAS</td>
                            <td>${ninas24.length}</td>
                            <td>${ninas59.length}</td>
                            <td>${ninas1014.length}</td>
                            <td class="fw-bold">${totalNinas}</td>
                        </tr>
                        <tr>
                            <td class="fw-bold text-start ps-3">NIÑOS</td>
                            <td>${ninos24.length}</td>
                            <td>${ninos59.length}</td>
                            <td>${ninos1014.length}</td>
                            <td class="fw-bold">${totalNinos}</td>
                        </tr>
                        <tr class="table-light">
                            <td class="fw-bold text-start ps-3">TOTAL POR EDADES</td>
                            <td>${ninas24.length + ninos24.length}</td>
                            <td>${ninas59.length + ninos59.length}</td>
                            <td>${ninas1014.length + ninos1014.length}</td>
                            <td class="fw-bold">${totalGlobal}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="p-2 bg-light border fw-bold text-end">TOTAL GENERAL: ${totalGlobal}</div>
            </div>

            <hr class="my-3">
            <h4 class="h6 fw-bold text-dark mb-2">LISTADO NOMINAL DE NIÑOS PARTICIPANTES</h4>
            <div class="table-responsive">
                <table class="table table-bordered table-striped table-sm text-xs bg-white">
                    <thead class="table-success text-dark">
                        <tr>
                            <th class="text-center">#</th>
                            <th>👧 Niñas (2-4)</th>
                            <th>👦 Niños (2-4)</th>
                            <th>👧 Niñas (5-9)</th>
                            <th>👦 Niños (5-9)</th>
                            <th>👧 Niñas (10-14)</th>
                            <th>👦 Niños (10-14)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlTablaNombres}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('det-iglesia').textContent = iglesiaSeleccionada.nombre_iglesia;
    document.getElementById('det-pastor').textContent = iglesiaSeleccionada.nombre_pastor;
    document.getElementById('det-domicilio').textContent = iglesiaSeleccionada.domicilio;
    document.getElementById('det-tel').textContent = iglesiaSeleccionada.telefono;
    document.getElementById('det-mun').textContent = iglesiaSeleccionada.municipio_estado;
    document.getElementById('det-fecha').textContent = iglesiaSeleccionada.fecha_entrega;
}

function volverAlAdmin() {
    document.getElementById('vista-detalle').classList.add('d-none');
    document.getElementById('vista-admin').classList.remove('d-none');
    cargarDatosAdmin();
}

// --- TRASLADO ENTRE ZONAS ---
function abrirModalTrasladarZona() {
    if (!iglesiaSeleccionada) return;
    document.getElementById('trasladar-nombre-iglesia').textContent = iglesiaSeleccionada.nombre_iglesia;
    document.getElementById('trasladar-zona-destino').value = String(iglesiaSeleccionada.zona_id || zonaActualId);
    const modal = new bootstrap.Modal(document.getElementById('modalTrasladarZona'));
    modal.show();
}

async function confirmarTrasladoZona() {
    if (!iglesiaSeleccionada) return;
    const selectDestino = document.getElementById('trasladar-zona-destino');
    const nuevaZonaId = parseInt(selectDestino.value, 10);
    const nombreZonaDestino = selectDestino.options[selectDestino.selectedIndex].text;

    if (nuevaZonaId === iglesiaSeleccionada.zona_id) {
        alert('La iglesia ya se encuentra registrada en esa zona.');
        return;
    }

    const btn = document.getElementById('btn-confirmar-traslado');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Trasladando...`;

    try {
        const { error } = await _supabase
            .from('iglesias')
            .update({ zona_id: nuevaZonaId })
            .eq('id', iglesiaSeleccionada.id);

        if (error) throw error;

        alert(`¡Iglesia "${iglesiaSeleccionada.nombre_iglesia}" trasladada exitosamente a la zona ${nombreZonaDestino}!`);
        bootstrap.Modal.getInstance(document.getElementById('modalTrasladarZona')).hide();
        volverAlAdmin();
    } catch (err) {
        alert('Error al trasladar la iglesia: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `Confirmar Traslado`;
    }
}

// --- NOTIFICACIONES POR WHATSAPP ---
function abrirModalNotificarWhatsApp() {
    if (!iglesiaSeleccionada) return;
    document.getElementById('wa-nombre-pastor').value = iglesiaSeleccionada.nombre_pastor || '';
    document.getElementById('wa-telefono-pastor').value = iglesiaSeleccionada.telefono || '';
    document.getElementById('wa-tipo-notificacion').value = 'faltante';
    document.getElementById('wa-nota-adicional').value = '';

    document.querySelectorAll('.wa-check-faltante').forEach(chk => {
        chk.checked = false;
    });

    actualizarMensajeWhatsApp();
    const modal = new bootstrap.Modal(document.getElementById('modalNotificarWhatsApp'));
    modal.show();
}

function actualizarMensajeWhatsApp() {
    if (!iglesiaSeleccionada) return;
    const pastor = document.getElementById('wa-nombre-pastor').value.trim() || 'Pastor';
    const iglesia = iglesiaSeleccionada.nombre_iglesia || 'su congregación';
    const tipo = document.getElementById('wa-tipo-notificacion').value;
    const nota = document.getElementById('wa-nota-adicional').value.trim();

    const bloqueFaltantes = document.getElementById('wa-bloque-faltantes');
    const faltantesSeleccionados = Array.from(document.querySelectorAll('.wa-check-faltante:checked'))
        .map(chk => `• ${chk.value}`);

    let msg = `¡Dios le bendiga Pastor ${pastor}!\n`;
    msg += `Le saludamos de Operación Niño de la Navidad (Samaritan's Purse).\n\n`;

    if (tipo === 'faltante') {
        bloqueFaltantes.classList.remove('d-none');
        msg += `Le escribimos para solicitar respetuosamente complementar la información de su iglesia *${iglesia}*.\n\n`;
        if (faltantesSeleccionados.length > 0) {
            msg += `Actualmente nos falta la siguiente información:\n${faltantesSeleccionados.join('\n')}\n\n`;
        } else {
            msg += `Actualmente nos falta la siguiente información:\n• (Seleccione arriba qué información falta)\n\n`;
        }
    } else if (tipo === 'recordatorio') {
        bloqueFaltantes.classList.add('d-none');
        msg += `Le enviamos un atento recordatorio respecto a la entrega del listado nominal y concentrado de su iglesia *${iglesia}*.\n\n`;
    } else if (tipo === 'confirmacion') {
        bloqueFaltantes.classList.add('d-none');
        msg += `Le confirmamos que hemos recibido satisfactoriamente el concentrado general de su iglesia *${iglesia}* con un total de *${iglesiaSeleccionada.ninos.length}* niños registrados.\n\n`;
    }

    if (nota) {
        msg += `📌 *Nota:* ${nota}\n\n`;
    }

    msg += `Quedamos a sus órdenes. ¡Muchas bendiciones!`;
    document.getElementById('wa-mensaje-final').value = msg;
}

function copiarMensajeWhatsApp() {
    const textarea = document.getElementById('wa-mensaje-final');
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => {
        alert('Mensaje copiado al portapapeles.');
    });
}

function enviarWhatsAppDirecto() {
    let telefono = document.getElementById('wa-telefono-pastor').value.replace(/\D/g, '');
    const mensaje = document.getElementById('wa-mensaje-final').value.trim();

    if (!telefono) {
        alert('Por favor ingrese un número de teléfono válido para enviar el mensaje.');
        document.getElementById('wa-telefono-pastor').focus();
        return;
    }

    if (telefono.length === 10) {
        telefono = '52' + telefono;
    }

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// --- EDICIÓN Y ELIMINACIÓN ---
function abrirModalEdicionIglesia() {
    if (!iglesiaSeleccionada) return;
    document.getElementById('edit_nombre_iglesia').value = iglesiaSeleccionada.nombre_iglesia;
    document.getElementById('edit_nombre_pastor').value = iglesiaSeleccionada.nombre_pastor;
    document.getElementById('edit_domicilio').value = iglesiaSeleccionada.domicilio;
    document.getElementById('edit_telefono').value = iglesiaSeleccionada.telefono;
    document.getElementById('edit_municipio_estado').value = iglesiaSeleccionada.municipio_estado;
    document.getElementById('edit_fecha_entrega').value = iglesiaSeleccionada.fecha_entrega;

    CATEGORIAS_EDAD.forEach(cat => {
        const nombresCat = iglesiaSeleccionada.ninos
            .filter(n => n.genero === cat.genero && n.rango_edad === cat.rango)
            .map(n => n.nombre_completo);

        inicializarInputsDinamicos(`edit_container_${cat.id}`, nombresCat);
    });

    const modal = new bootstrap.Modal(document.getElementById('modalEditarIglesia'));
    modal.show();
}

async function guardarEdicionIglesia(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-edicion');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Guardando cambios...`;

    try {
        const nombre_iglesia = sanitizarTexto(document.getElementById('edit_nombre_iglesia').value);
        const nombre_pastor = sanitizarTexto(document.getElementById('edit_nombre_pastor').value);
        const domicilio = sanitizarTexto(document.getElementById('edit_domicilio').value);
        const telefono = sanitizarTexto(document.getElementById('edit_telefono').value);
        const municipio_estado = sanitizarTexto(document.getElementById('edit_municipio_estado').value);
        const fecha_entrega = document.getElementById('edit_fecha_entrega').value;

        const { error: errorIglesia } = await _supabase
            .from('iglesias')
            .update({ nombre_iglesia, nombre_pastor, domicilio, telefono, municipio_estado, fecha_entrega })
            .eq('id', iglesiaSeleccionada.id);

        if (errorIglesia) throw errorIglesia;

        await _supabase.from('ninos').delete().eq('iglesia_id', iglesiaSeleccionada.id);

        let ninosInserts = [];
        CATEGORIAS_EDAD.forEach(cat => {
            const nombres = obtenerValoresContainer(`edit_container_${cat.id}`);
            nombres.forEach(nombre => {
                ninosInserts.push({
                    iglesia_id: iglesiaSeleccionada.id,
                    nombre_completo: nombre,
                    genero: cat.genero,
                    rango_edad: cat.rango
                });
            });
        });

        if (ninosInserts.length > 0) {
            const { error: errorNinos } = await _supabase.from('ninos').insert(ninosInserts);
            if (errorNinos) throw errorNinos;
        }

        const { data: iglesiaActualizada, error: errReload } = await _supabase
            .from('iglesias')
            .select('*, ninos(*)')
            .eq('id', iglesiaSeleccionada.id)
            .single();

        if (!errReload) {
            iglesiaSeleccionada = iglesiaActualizada;
        }

        alert('¡Cambios guardados exitosamente!');
        bootstrap.Modal.getInstance(document.getElementById('modalEditarIglesia')).hide();
        verDetalleIglesia(iglesiaSeleccionada.id);
    } catch (err) {
        alert('Error al actualizar: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-save me-1"></i> Guardar Cambios`;
    }
}

async function eliminarIglesia() {
    if (!iglesiaSeleccionada) return;
    if (!confirm(`¿Está totalmente seguro de eliminar la iglesia "${iglesiaSeleccionada.nombre_iglesia}" y todos sus niños registrados?`)) {
        return;
    }

    try {
        await _supabase.from('ninos').delete().eq('iglesia_id', iglesiaSeleccionada.id);
        const { error } = await _supabase.from('iglesias').delete().eq('id', iglesiaSeleccionada.id);

        if (error) throw error;

        alert('Iglesia eliminada correctamente.');
        volverAlAdmin();
    } catch (err) {
        alert('Error al eliminar: ' + err.message);
    }
}
