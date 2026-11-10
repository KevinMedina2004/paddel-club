// HORARIOS DISPONIBLES (Bloques exactos de 1:30 hs desde las 08:00 hasta las 00:00)
const HORARIOS_DISPONIBLES = [
    "08:00 - 09:30",
    "09:30 - 11:00",
    "11:00 - 12:30",
    "12:30 - 14:00",
    "14:00 - 15:30",
    "15:30 - 17:00",
    "17:00 - 18:30",
    "18:30 - 20:00",
    "20:00 - 21:30",
    "21:30 - 23:00",
    "23:00 - 00:30" // Cierre flexible con margen hasta medianoche
];

document.addEventListener('DOMContentLoaded', () => {
    // Establecer fecha de hoy por defecto en el input
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('inputFecha').value = hoy;

    cargarSelectHorarios();
    obtenerReservasYActualizar();

    // Listeners para calcular precio en tiempo real
    document.getElementById('inputFecha').addEventListener('change', actualizarPrecioYDisponibilidad);
    document.getElementById('selectHorario').addEventListener('change', actualizarPrecioYDisponibilidad);
    document.getElementById('selectPago').addEventListener('change', actualizarPrecioYDisponibilidad);
    document.getElementById('selectCancha').addEventListener('change', actualizarPrecioYDisponibilidad);

    // Enviar formulario de reserva
    document.getElementById('formReserva').addEventListener('submit', async (e) => {
        e.preventDefault();
        await registrarReserva();
    });
});

// Cambiar entre Panel Clientes y Panel Staff
function cambiarVista(vista) {
    document.querySelectorAll('.vista-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    if (vista === 'clientes') {
        document.getElementById('vista-clientes').classList.add('active');
        event.target.classList.add('active');
    } else {
        document.getElementById('vista-staff').classList.add('active');
        event.target.classList.add('active');
        cargarPanelStaff();
    }
}

// Cargar opciones en el select de horarios
function cargarSelectHorarios() {
    const select = document.getElementById('selectHorario');
    select.innerHTML = '<option value="">Seleccione un horario...</option>';
    HORARIOS_DISPONIBLES.forEach(horario => {
        const opt = document.createElement('option');
        opt.value = horario;
        opt.textContent = horario;
        select.appendChild(opt);
    });
}

// Lógica de cálculo de precios según reglas del club
function calcularPrecio(fechaStr, horarioStr, metodoPago) {
    if (!fechaStr || !horarioStr) return { precio: 0, detalle: "Complete fecha y horario" };

    // Determinar si es Sábado (6) o Domingo (0)
    const partesFecha = fechaStr.split('-');
    const fechaObj = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);
    const diaSemana = fechaObj.getDay(); // 0 = Domingo, 6 = Sábado
    const esFinDeSemana = (diaSemana === 0 || diaSemana === 6);

    // Extraer hora de inicio del turno (ej: "18:30 - 20:00" -> horaInicio = 18.5 o 18)
    const horaInicioStr = horarioStr.split(' - ')[0];
    const horaInicio = parseInt(horaInicioStr.split(':')[0]);

    // Regla: 
    // - Base: $24.000
    // - Desde las 17:00 hs en adelante O Sábados y Domingos todo el día: $34.000
    // - Pago en efectivo: $31.000 (aplicado a la tarifa de $34.000, o tarifa base si aplica)
    let precioBase = 24000;
    let esHorarioPico = false;

    if (esFinDeSemana || horaInicio >= 17) {
        precioBase = 34000;
        esHorarioPico = true;
    }

    let detalle = esFinDeSemana ? "Fin de semana (Tarifa Especial)" : (horaInicio >= 17 ? "Horario Pico (Desde 17:00 hs)" : "Tarifa Diurna Standard");

    // Aplicar descuento por efectivo si la tarifa es de pico/finde o general
    if (metodoPago === 'Efectivo') {
        if (precioBase === 34000) {
            precioBase = 31000;
            detalle += " + Promoción Efectivo ($31.000)";
        } else {
            // Si fuera tarifa baja en efectivo, se mantiene o aplica descuento proporcional
            detalle += " (Pago en efectivo)";
        }
    }

    return { precio: precioBase, detalle: detalle };
}

function actualizarPrecioYDisponibilidad() {
    const fecha = document.getElementById('inputFecha').value;
    const horario = document.getElementById('selectHorario').value;
    const pago = document.getElementById('selectPago').value;

    const resultado = calcularPrecio(fecha, horario, pago);
    document.getElementById('txtPrecio').textContent = `$${resultado.precio.toLocaleString('es-AR')}`;
    document.getElementById('txtDetallePrecio').textContent = resultado.detalle;
}

// Registrar Reserva vía API
async function registrarReserva() {
    const fecha = document.getElementById('inputFecha').value;
    const cancha = document.getElementById('selectCancha').value;
    const horario = document.getElementById('selectHorario').value;
    const cliente = document.getElementById('inputCliente').value;
    const telefono = document.getElementById('inputTelefono').value;
    const metodo_pago = document.getElementById('selectPago').value;

    const calculo = calcularPrecio(fecha, horario, metodo_pago);

    const datosReserva = {
        cancha: parseInt(cancha),
        horario,
        dia: fecha,
        fecha,
        cliente,
        telefono,
        precio: calculo.precio,
        metodo_pago
    };

    try {
        const response = await fetch('/api/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosReserva)
        });

        if (response.ok) {
            alert('¡Reserva creada con éxito en Master Padel Club! 🎾');
            document.getElementById('formReserva').reset();
            document.getElementById('inputFecha').value = fecha;
            obtenerReservasYActualizar();
        } else {
            alert('Error al registrar la reserva.');
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('No se pudo conectar con el servidor.');
    }
}

// Obtener reservas y actualizar grilla de clientes y panel staff
async function obtenerReservasYActualizar() {
    try {
        const response = await fetch('/api/reservas');
        const reservas = await response.json();
        
        renderizarGrillaCanchas(reservas);
        window.reservasGlobales = reservas; // Guardar para el staff
    } catch (error) {
        console.error('Error al obtener reservas:', error);
    }
}

// Renderizar estado de las 6 canchas en el panel de clientes
function renderizarGrillaCanchas(reservas) {
    const contenedor = document.getElementById('grillaTurnos');
    contenedor.innerHTML = '';

    const fechaSeleccionada = document.getElementById('inputFecha').value;

    // Mostrar un resumen por cada una de las 6 canchas para la fecha seleccionada
    for (let c = 1; c <= 6; c++) {
        const card = document.createElement('div');
        card.className = 'turno-card';

        // Filtrar reservas para esta cancha en la fecha seleccionada
        const reservasCancha = reservas.filter(r => r.cancha === c && r.fecha === fechaSeleccionada);
        
        let htmlContenido = `<h4>Cancha ${c}</h4>`;
        if (reservasCancha.length === 0) {
            htmlContenido += `<p style="font-size:12px; color:#9ca3af;">Sin reservas hoy</p><span class="badge-estado badge-libre">Disponible</span>`;
        } else {
            htmlContenido += `<p style="font-size:12px; color:#f59e0b;">${reservasCancha.length} turno(s) ocupado(s)</p><span class="badge-estado badge-ocupado">Reservada</span>`;
        }

        card.innerHTML = htmlContenido;
        contenedor.appendChild(card);
    }
}

// Cargar datos en el Panel Staff
function cargarPanelStaff() {
    const reservas = window.reservasGlobales || [];
    const tbody = document.getElementById('tablaStaffBody');
    tbody.innerHTML = '';

    document.getElementById('statTotal').textContent = reservas.length;
    
    let recaudacionTotal = 0;
    reservas.forEach(r => {
        recaudacionTotal += parseFloat(r.precio || 0);
    });
    document.getElementById('statCaja').textContent = `$${recaudacionTotal.toLocaleString('es-AR')}`;

    if (reservas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #9ca3af;">No hay reservas registradas.</td></tr>`;
        return;
    }

    reservas.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${r.id}</td>
            <td>${r.fecha}</td>
            <td>Cancha ${r.cancha}</td>
            <td>${r.horario}</td>
            <td><strong>${r.cliente}</strong></td>
            <td>${r.telefono}</td>
            <td>${r.metodo_pago}</td>
            <td style="color: #f59e0b; font-weight:700;">$${Number(r.precio).toLocaleString('es-AR')}</td>
            <td><button class="btn-delete" onclick="eliminarReserva(${r.id})">Cancelar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// Eliminar reserva desde Staff
async function eliminarReserva(id) {
    if (!confirm('¿Estás seguro de cancelar y eliminar esta reserva?')) return;

    try {
        const response = await fetch(`/api/reservas/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('Reserva eliminada.');
            obtenerReservasYActualizar();
            setTimeout(cargarPanelStaff, 200);
        } else {
            alert('Error al eliminar.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}