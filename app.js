const HORARIOS_DISPONIBLES = [
    "08:00 - 09:30", "09:30 - 11:00", "11:00 - 12:30", "12:30 - 14:00",
    "14:00 - 15:30", "15:30 - 17:00", "17:00 - 18:30", "18:30 - 20:00",
    "20:00 - 21:30", "21:30 - 23:00", "23:00 - 00:30"
];

document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('inputFecha').value = hoy;

    cargarSelectHorarios();
    obtenerReservasYActualizar();
    iniciarReloj();
    cargarClimaSanJusto();

    document.getElementById('inputFecha').addEventListener('change', actualizarPrecioYDisponibilidad);
    document.getElementById('selectHorario').addEventListener('change', actualizarPrecioYDisponibilidad);
    document.getElementById('selectPago').addEventListener('change', actualizarPrecioYDisponibilidad);
    document.getElementById('selectCancha').addEventListener('change', actualizarPrecioYDisponibilidad);

    document.getElementById('formReserva').addEventListener('submit', async (e) => {
        e.preventDefault();
        await registrarReserva();
    });
});

function iniciarReloj() {
    setInterval(() => {
        const ahora = new Date();
        document.getElementById('widgetReloj').textContent = ahora.toLocaleTimeString('es-AR');
    }, 1000);
}

// CORRECCIÓN CLIMA: Usamos ?format=3 para obtener texto plano limpio sin HTML
async function cargarClimaSanJusto() {
    const contenedorClima = document.getElementById('widgetClima');
    try {
        // Usamos la API de wttr.in solicitando formato de clima actual en texto plano
        const res = await fetch('https://wttr.in/Buenos+Aires?format=%t+%C');
        if (!res.ok) throw new Error('Error clima');
        const clima = await res.text();
        contenedorClima.textContent = clima.trim();
    } catch (e) {
        // Valor fijo por defecto si la red o la API externa bloquean la petición
        contenedorClima.textContent = "🌤️ 22°C (San Justo)";
    }
}

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

function calcularPrecio(fechaStr, horarioStr, metodoPago) {
    if (!fechaStr || !horarioStr) return { precio: 0, detalle: "Complete fecha y horario" };

    const partesFecha = fechaStr.split('-');
    const fechaObj = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);
    const diaSemana = fechaObj.getDay();
    const esFinDeSemana = (diaSemana === 0 || diaSemana === 6);

    const horaInicioStr = horarioStr.split(' - ')[0];
    const horaInicio = parseInt(horaInicioStr.split(':')[0]);

    let precioBase = 24000;
    let detalle = "Tarifa Diurna Standard";

    if (esFinDeSemana || horaInicio >= 17) {
        precioBase = 34000;
        detalle = esFinDeSemana ? "Fin de semana" : "Horario Pico (Desde 17:00 hs)";
    }

    if (metodoPago === 'Efectivo' && precioBase === 34000) {
        precioBase = 31000;
        detalle += " + Promo Efectivo ($31.000)";
    } else if (metodoPago === 'Efectivo') {
        detalle += " (Efectivo)";
    }

    return { precio: precioBase, detalle: `${detalle} | Seña obligatoria: $15.000` };
}

function actualizarPrecioYDisponibilidad() {
    const fecha = document.getElementById('inputFecha').value;
    const horario = document.getElementById('selectHorario').value;
    const pago = document.getElementById('selectPago').value;

    const resultado = calcularPrecio(fecha, horario, pago);
    document.getElementById('txtPrecio').textContent = `$${resultado.precio.toLocaleString('es-AR')}`;
    document.getElementById('txtDetallePrecio').textContent = resultado.detalle;
}

async function registrarReserva() {
    const fecha = document.getElementById('inputFecha').value;
    const cancha = document.getElementById('selectCancha').value;
    const horario = document.getElementById('selectHorario').value;
    const cliente = document.getElementById('inputCliente').value;
    const telefono = document.getElementById('inputTelefono').value;
    const metodo_pago = document.getElementById('selectPago').value;
    const comprobante = document.getElementById('inputComprobante').value;

    const calculo = calcularPrecio(fecha, horario, metodo_pago);

    const datosReserva = {
        cancha: parseInt(cancha),
        horario,
        dia: fecha,
        fecha,
        cliente,
        telefono,
        precio: calculo.precio,
        metodo_pago,
        comprobante
    };

    try {
        const response = await fetch('/api/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosReserva)
        });

        if (response.ok) {
            alert('¡Reserva registrada en San Esteban Paddle Club! Tu turno quedará confirmado al verificar la seña de $15.000. 🎾');
            document.getElementById('formReserva').reset();
            document.getElementById('inputFecha').value = fecha;
            obtenerReservasYActualizar();
        } else {
            const errorData = await response.json();
            alert('Error al registrar la reserva: ' + (errorData.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('No se pudo conectar con el servidor.');
    }
}

async function obtenerReservasYActualizar() {
    try {
        const response = await fetch('/api/reservas');
        const reservas = await response.json();
        renderizarGrillaCanchas(reservas);
    } catch (error) {
        console.error('Error al obtener reservas:', error);
    }
}

function renderizarGrillaCanchas(reservas) {
    const contenedor = document.getElementById('grillaTurnos');
    contenedor.innerHTML = '';
    const fechaSeleccionada = document.getElementById('inputFecha').value;

    for (let c = 1; c <= 6; c++) {
        const card = document.createElement('div');
        card.className = 'turno-card';
        const reservasCancha = reservas.filter(r => r.cancha === c && r.fecha === fechaSeleccionada);
        
        let htmlContenido = `<h4>Cancha ${c}</h4>`;
        if (reservasCancha.length === 0) {
            htmlContenido += `<p style="font-size:12px; color:#9ca3af;">Sin reservas hoy</p><span class="badge-estado badge-libre">Disponible</span>`;
        } else {
            htmlContenido += `<p style="font-size:12px; color:#f59e0b;">${reservasCancha.length} turno(s) ocupados</p><span class="badge-estado badge-ocupado">Reservada</span>`;
        }

        card.innerHTML = htmlContenido;
        contenedor.appendChild(card);
    }
}