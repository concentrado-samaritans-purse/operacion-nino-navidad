function obtenerLogoBase64() {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = 'img/logo.jpg';
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = function () {
            resolve(null);
        };
    });
}

function renderEncabezadoIglesia(doc, iglesia, logoBase64, startY, titulo) {
    if (logoBase64) {
        doc.addImage(logoBase64, 'JPEG', 14, startY, 20, 20);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(titulo, 110, startY + 6, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Operation Christmas Samaritan's Purse", 110, startY + 11, { align: 'center' });

    let municipiosEstado = (iglesia.municipio_estado || '').split(',');
    let municipio = municipiosEstado[0] ? municipiosEstado[0].trim() : '';
    let estado = municipiosEstado[1] ? municipiosEstado[1].trim() : '';

    let y = startY + 22;
    doc.setFontSize(7.5);

    let yLeft = y;
    let yRight = y;

    doc.setFont("helvetica", "bold");
    doc.text("NOMBRE DE LA IGLESIA:", 14, yLeft);
    doc.setFont("helvetica", "normal");
    let lineasIglesia = doc.splitTextToSize(iglesia.nombre_iglesia || "", 45);
    doc.text(lineasIglesia, 52, yLeft);
    yLeft += lineasIglesia.length * 3.5;

    doc.setFont("helvetica", "bold");
    doc.text("NOMBRE DEL PASTOR:", 14, yLeft);
    doc.setFont("helvetica", "normal");
    let lineasPastor = doc.splitTextToSize(iglesia.nombre_pastor || "", 48);
    doc.text(lineasPastor, 48, yLeft);
    yLeft += lineasPastor.length * 3.5;

    doc.setFont("helvetica", "bold");
    doc.text("DOMICILIO:", 14, yLeft);
    doc.setFont("helvetica", "normal");
    let lineasDomicilio = doc.splitTextToSize(iglesia.domicilio || "", 62);
    doc.text(lineasDomicilio, 32, yLeft);
    yLeft += lineasDomicilio.length * 3.5;

    doc.setFont("helvetica", "bold");
    doc.text("TELÉFONO:", 110, yRight);
    doc.setFont("helvetica", "normal");
    doc.text(iglesia.telefono || "", 130, yRight);
    yRight += 4;

    doc.setFont("helvetica", "bold");
    doc.text("MUNICIPIO:", 110, yRight);
    doc.setFont("helvetica", "normal");
    let lineasMuni = doc.splitTextToSize(municipio, 40);
    doc.text(lineasMuni, 130, yRight);

    doc.setFont("helvetica", "bold");
    doc.text("EST.:", 172, yRight);
    doc.setFont("helvetica", "normal");
    doc.text(estado, 181, yRight);
    yRight += lineasMuni.length * 3.5;

    doc.setFont("helvetica", "bold");
    doc.text("ENTREGA:", 110, yRight);
    doc.setFont("helvetica", "normal");
    doc.text(iglesia.fecha_entrega || "", 130, yRight);
    yRight += 4;

    let maxY = Math.max(yLeft, yRight);
    return maxY + 2;
}

function renderBloqueConcentrado(doc, iglesia, logoBase64, startY) {
    let finalY = renderEncabezadoIglesia(doc, iglesia, logoBase64, startY, "CONCENTRADO GENERAL DE NIÑOS POR IGLESIA");

    let ninas24 = iglesia.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '2-4').length;
    let ninos24 = iglesia.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '2-4').length;
    let ninas59 = iglesia.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '5-9').length;
    let ninos59 = iglesia.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '5-9').length;
    let ninas1014 = iglesia.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '10-14').length;
    let ninos1014 = iglesia.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '10-14').length;

    let totNinas = ninas24 + ninas59 + ninas1014;
    let totNinos = ninos24 + ninos59 + ninos1014;

    doc.autoTable({
        startY: finalY + 2,
        head: [['EDADES', '2-4', '5-9', '10-14', 'TOTAL']],
        body: [
            ['NIÑAS', ninas24, ninas59, ninas1014, totNinas],
            ['NIÑOS', ninos24, ninos59, ninos1014, totNinos],
            ['TOTAL POR EDADES', ninas24 + ninos24, ninas59 + ninos59, ninas1014 + ninos1014, totNinas + totNinos]
        ],
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, halign: 'center', cellPadding: 1.5 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 } }
    });

    return doc.lastAutoTable.finalY;
}

function renderBloqueListado(doc, iglesia, logoBase64, startY, incluirEncabezado = true) {
    let finalY = startY;
    if (incluirEncabezado) {
        finalY = renderEncabezadoIglesia(doc, iglesia, logoBase64, startY, "LISTADO GENERAL DE NIÑOS POR IGLESIA");
    }

    let ninas24 = iglesia.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '2-4');
    let ninos24 = iglesia.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '2-4');
    let ninas59 = iglesia.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '5-9');
    let ninos59 = iglesia.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '5-9');
    let ninas1014 = iglesia.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '10-14');
    let ninos1014 = iglesia.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '10-14');

    let rowsNominal = [];

    rowsNominal.push([{ content: 'NIÑOS 2-4', colSpan: 4, styles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' } }]);
    let max24 = Math.max(ninas24.length, ninos24.length);
    for (let i = 0; i < max24; i++) {
        rowsNominal.push([i + 1, ninos24[i] ? ninos24[i].nombre_completo : '', i + 1, ninas24[i] ? ninas24[i].nombre_completo : '']);
    }

    rowsNominal.push([{ content: 'NIÑOS 5-9', colSpan: 4, styles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' } }]);
    let max59 = Math.max(ninas59.length, ninos59.length);
    for (let i = 0; i < max59; i++) {
        rowsNominal.push([i + 1, ninos59[i] ? ninos59[i].nombre_completo : '', i + 1, ninas59[i] ? ninas59[i].nombre_completo : '']);
    }

    rowsNominal.push([{ content: 'NIÑOS 10-14', colSpan: 4, styles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' } }]);
    let max1014 = Math.max(ninas1014.length, ninos1014.length);
    for (let i = 0; i < max1014; i++) {
        rowsNominal.push([i + 1, ninos1014[i] ? ninos1014[i].nombre_completo : '', i + 1, ninas1014[i] ? ninas1014[i].nombre_completo : '']);
    }

    doc.autoTable({
        startY: finalY + 2,
        head: [['#', 'NIÑOS', '#', 'NIÑAS']],
        body: rowsNominal,
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 7, cellPadding: 1 },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 83 },
            2: { cellWidth: 8, halign: 'center' },
            3: { cellWidth: 83 }
        }
    });

    return doc.lastAutoTable.finalY;
}

async function descargarGeneralConcentradoPDF() {
    if (!datosIglesiasZona || datosIglesiasZona.length === 0) {
        alert('No hay iglesias registradas en esta zona.');
        return;
    }

    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();
    let logoBase64 = await obtenerLogoBase64();

    for (let i = 0; i < datosIglesiasZona.length; i += 2) {
        if (i > 0) doc.addPage();
        renderBloqueConcentrado(doc, datosIglesiasZona[i], logoBase64, 10);
        if (i + 1 < datosIglesiasZona.length) {
            renderBloqueConcentrado(doc, datosIglesiasZona[i + 1], logoBase64, 150);
        }
    }
    doc.save(`General_Concentrado_Zona_${zonaActualId}.pdf`);
}

async function descargarGeneralListadoPDF() {
    if (!datosIglesiasZona || datosIglesiasZona.length === 0) {
        alert('No hay iglesias registradas en esta zona.');
        return;
    }

    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();
    let logoBase64 = await obtenerLogoBase64();

    for (let index = 0; index < datosIglesiasZona.length; index++) {
        if (index > 0) doc.addPage();
        renderBloqueListado(doc, datosIglesiasZona[index], logoBase64, 10, true);
    }
    doc.save(`General_Listado_Zona_${zonaActualId}.pdf`);
}

async function descargarPDFMasterZona() {
    if (!datosIglesiasZona || datosIglesiasZona.length === 0) {
        alert('No hay iglesias registradas en esta zona.');
        return;
    }

    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();
    let logoBase64 = await obtenerLogoBase64();

    for (let index = 0; index < datosIglesiasZona.length; index++) {
        if (index > 0) doc.addPage();
        let iglesia = datosIglesiasZona[index];
        let lastY = renderBloqueConcentrado(doc, iglesia, logoBase64, 10);
        renderBloqueListado(doc, iglesia, logoBase64, lastY + 8, false);
    }
    doc.save(`Mezcla_Concentrado_y_Listado_Zona_${zonaActualId}.pdf`);
}

function descargarExcelMasterZona() {
    let wb = XLSX.utils.book_new();
    let wsData = [["NIÑAS", "", "NIÑOS"]];

    datosIglesiasZona.forEach(iglesia => {
        wsData.push([`IGLESIA: ${iglesia.nombre_iglesia}`]);
        iglesia.ninos.forEach(n => {
            wsData.push([n.genero === 'niña' ? n.nombre_completo : '', '', n.genero === 'niño' ? n.nombre_completo : '']);
        });
    });

    let ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Master Zona Agrupado");
    XLSX.writeFile(wb, `Master_Zona_${zonaActualId}_Edades.xlsx`);
}

async function descargarPDFIglesia() {
    if (!iglesiaSeleccionada) return;
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();
    let logoBase64 = await obtenerLogoBase64();

    let lastY = renderBloqueConcentrado(doc, iglesiaSeleccionada, logoBase64, 10);
    renderBloqueListado(doc, iglesiaSeleccionada, logoBase64, lastY + 8, false);
    doc.save(`${iglesiaSeleccionada.nombre_iglesia}_Oficial.pdf`);
}

function descargarExcelIglesia() {
    if (!iglesiaSeleccionada) return;
    let wb = XLSX.utils.book_new();
    let wsData = [
        ["CONCENTRADO GENERAL DE NIÑOS POR IGLESIA"],
        ["NOMBRE DE LA IGLESIA:", iglesiaSeleccionada.nombre_iglesia],
        ["NOMBRE DEL PASTOR:", iglesiaSeleccionada.nombre_pastor],
        ["DOMICILIO:", iglesiaSeleccionada.domicilio],
        ["NO. TELÉFONO:", iglesiaSeleccionada.telefono],
        ["MUNICIPIO, ESTADO:", iglesiaSeleccionada.municipio_estado],
        ["FECHA DE ENTREGA:", iglesiaSeleccionada.fecha_entrega],
        [],
        ["#", "Niñas 2-4", "Niños 2-4", "Niñas 5-9", "Niños 5-9", "Niñas 10-14", "Niños 10-14"]
    ];

    let ninas24 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '2-4');
    let ninos24 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '2-4');
    let ninas59 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '5-9');
    let ninos59 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '5-9');
    let ninas1014 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niña' && n.rango_edad === '10-14');
    let ninos1014 = iglesiaSeleccionada.ninos.filter(n => n.genero === 'niño' && n.rango_edad === '10-14');
    let maxLen = Math.max(ninas24.length, ninos24.length, ninas59.length, ninos59.length, ninas1014.length, ninos1014.length, 1);

    for (let i = 0; i < maxLen; i++) {
        wsData.push([
            i + 1,
            ninas24[i] ? ninas24[i].nombre_completo : '',
            ninos24[i] ? ninos24[i].nombre_completo : '',
            ninas59[i] ? ninas59[i].nombre_completo : '',
            ninos59[i] ? ninos59[i].nombre_completo : '',
            ninas1014[i] ? ninas1014[i].nombre_completo : '',
            ninos1014[i] ? ninos1014[i].nombre_completo : ''
        ]);
    }

    let ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Concentrado Iglesia");
    XLSX.writeFile(wb, `${iglesiaSeleccionada.nombre_iglesia}_concentrado.xlsx`);
}
