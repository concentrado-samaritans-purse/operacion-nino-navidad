async function guardarRegistro(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Guardando concentrado...`;

    try {
        const zona_id = parseInt(document.getElementById('zona_id').value, 10);
        const nombre_iglesia = sanitizarTexto(document.getElementById('nombre_iglesia').value);
        const nombre_pastor = sanitizarTexto(document.getElementById('nombre_pastor').value);
        const domicilio = sanitizarTexto(document.getElementById('domicilio').value);
        const telefono = sanitizarTexto(document.getElementById('telefono').value);
        const municipio_estado = sanitizarTexto(document.getElementById('municipio_estado').value);
        const fecha_entrega = document.getElementById('fecha_entrega').value;

        const zonaValida = ZONAS_CATALOGO.some(z => z.id === zona_id);
        if (!zonaValida) {
            throw new Error('Zona seleccionada no válida.');
        }

        const { data: iglesiaData, error: iglesiaError } = await _supabase
            .from('iglesias')
            .insert([{ zona_id, nombre_iglesia, nombre_pastor, domicilio, telefono, municipio_estado, fecha_entrega }])
            .select();

        if (iglesiaError) throw iglesiaError;
        const iglesiaId = iglesiaData[0].id;

        let ninosInserts = [];
        CATEGORIAS_EDAD.forEach(cat => {
            const nombres = obtenerValoresContainer(`container_${cat.id}`);
            nombres.forEach(nombre => {
                ninosInserts.push({
                    iglesia_id: iglesiaId,
                    nombre_completo: nombre,
                    genero: cat.genero,
                    rango_edad: cat.rango
                });
            });
        });

        if (ninosInserts.length > 0) {
            const { error: ninosError } = await _supabase.from('ninos').insert(ninosInserts);
            if (ninosError) throw ninosError;
        }

        alert('¡Concentrado guardado exitosamente!');
        document.getElementById('form-iglesia').reset();
        CATEGORIAS_EDAD.forEach(cat => {
            inicializarInputsDinamicos(`container_${cat.id}`);
        });
    } catch (err) {
        alert('Error al guardar: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> Guardar Concentrado General`;
    }
}
