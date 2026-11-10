const HORARIOS_DISPONIBLES = [
    "08:00 - 09:30", "09:30 - 11:00", "11:00 - 12:30", "12:30 - 14:00",
    "14:00 - 15:30", "15:30 - 17:00", "17:00 - 18:30", "18:30 - 20:00",
    "20:00 - 21:30", "21:30 - 23:00", "23:00 - 00:30"
];

let listaGlobalReservas = [];

document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('inputFecha').value = hoy;

    obtenerReservasYActualizar();
    iniciarReloj();
    cargarClimaOpenMeteo();

    document.getElementById('inputFecha').addEventListener('change', () => {
        actualizarSelectHorarios();
        actualizarPrecioYDisponibilidad();
    });
    document.getElementById('selectCancha').addEventListener('change', () => {
        actualizarSelectHorarios();
        actualizarPrecioYDisponibilidad();
    });
    document.getElementById('selectHorario').addEventListener('change', actualizarPrecioYDisponibilidad);
    document.getElementById('selectPago').addEventListener('change', actualizarPrecioYDisponibilidad);

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

// CLIMA PRECISO USANDO OPEN-METEO (SAN JUSTO / BUENOS AIRES)
async function cargarClimaOpenMeteo() {
    const elClima = document.getElementById('clima-admin');
    if (!elClima) return;
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.6037&longitude=-58.3816&current_weather=true');
        const data = await res.json();
        if (data.current_weather) {
            elClima.innerText = `${Math.round(data.current_weather.temperature)}°C`;
        }
    } catch(e) {
        elClima.innerText = '22°C';
    }
}

// VENTANA MODAL PERSONALIZADA EN VEZ DE ALERT()
function mostrarModal(titulo, mensaje) {
    document.getElementById('modalTitle').textContent = titulo;
    document.getElementById('modalMessage').textContent = mensaje;
    document.getElementById('customModal').style.display = 'flex';
}

function cerrarModalCustom() {
    document.getElementById('customModal').style.display = 'none';
}

// ACTUALIZAR HORARIOS (SOLO TOMA LOS TURNOS ACTIVOS Y NO LOS RECHAZADOS)
function actualizarSelectHorarios() {
    const select = document.getElementById('selectHorario');
    const fechaSeleccionada = document.getElementById('inputFecha').value;
    const canchaSeleccionada = parseInt(document.getElementById('selectCancha').value);

    select.innerHTML = '<option value="">Seleccione un horario...</option>';

    if (!fechaSeleccionada || !canchaSeleccionada) {
        select.innerHTML = '<option value="">Primero elije fecha y cancha...</option>';
        return;
    }

    // Excluimos las reservas rechazadas para que esos horarios vuelvan a estar libres
    const horariosOcupados = listaGlobalReservas
        .filter(r => r.cancha === canchaSeleccionada && r.fecha === fechaSeleccionada && r.estado_pago !== 'Rechazado')
        .map(r => r.horario);

    HORARIOS_DISPONIBLES.forEach(horario => {
        const opt = document.createElement('option');
        opt.value = horario;
        if (horariosOcupados.includes(horario)) {
            opt.textContent = `${horario} (OCUPADO)`;
            opt.disabled = true;
            opt.style.color = '#ef4444';
        } else {
            opt.textContent = `${horario} (Disponible)`;
        }
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
    const inputFile = document.getElementById('inputComprobanteFile').files[0];

    let comprobanteData = "Sin comprobante";
    if (inputFile) {
        comprobanteData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(inputFile);
        });
    }

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
        comprobante: comprobanteData
    };

    try {
        const response = await fetch('/api/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosReserva)
        });

        if (response.ok) {
            mostrarModal('¡Reserva Exitosa!', 'Tu turno en San Esteban Paddle Club quedó registrado. Quedará confirmado en cuanto staff verifique tu seña de $15.000.');
            document.getElementById('formReserva').reset();
            document.getElementById('inputFecha').value = fecha;
            await obtenerReservasYActualizar();
        } else {
            const errorData = await response.json();
            mostrarModal('Error', 'No se pudo registrar la reserva: ' + (errorData.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error de red:', error);
        mostrarModal('Error de Conexión', 'No se pudo conectar con el servidor.');
    }
}

async function obtenerReservasYActualizar() {
    try {
        const response = await fetch('/api/reservas');
        listaGlobalReservas = await response.json();
        renderizarGrillaCanchas(listaGlobalReservas);
        actualizarSelectHorarios();
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
        // Solo contamos como ocupadas aquellas reservas que NO estén rechazadas
        const reservasCancha = reservas.filter(r => r.cancha === c && r.fecha === fechaSeleccionada && r.estado_pago !== 'Rechazado');
        
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

// CONSULTOR DE ESTADO DE RESERVA POR TELÉFONO
function consultarEstadoReserva() {
    const telefonoBuscado = document.getElementById('inputBusquedaTel').value.trim();
    const contenedorResultado = document.getElementById('resultadoConsulta');

    if (!telefonoBuscado) {
        contenedorResultado.innerHTML = `<p style="color: #ef4444;">Por favor ingresa un número de teléfono.</p>`;
        return;
    }

    const reservasCliente = listaGlobalReservas.filter(r => r.telefono.includes(telefonoBuscado));

    if (reservasCliente.length === 0) {
        contenedorResultado.innerHTML = `<p style="color: #9ca3af;">No se encontraron reservas asociadas al teléfono ${telefonoBuscado}.</p>`;
        return;
    }

    let html = `<h4>Reservas encontradas para: ${telefonoBuscado}</h4>`;
    reservasCliente.forEach(r => {
        let estadoColor = '#f59e0b';
        let textoEstado = r.estado_pago || 'Pendiente';
        if (textoEstado === 'Aprobado') estadoColor = '#10b981';
        if (textoEstado === 'Rechazado') estadoColor = '#ef4444';

        html += `
            <div class="reserva-encontrada-item">
                <p><strong>Fecha:</strong> ${r.fecha} | <strong>Horario:</strong> ${r.horario} | <strong>Cancha:</strong> ${r.cancha}</p>
                <p><strong>Cliente:</strong> ${r.cliente} | <strong>Total:</strong> $${Number(r.precio).toLocaleString('es-AR')}</p>
                <p><strong>Estado de Seña:</strong> <span style="color: ${estadoColor}; font-weight: 700;">${textoEstado}</span></p>
            </div>
        `;
    });

    contenedorResultado.innerHTML = html;
}