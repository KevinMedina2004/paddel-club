document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('formLogin').addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('userAdmin').value;
        const pass = document.getElementById('passAdmin').value;

        if (usuario === 'admin' && pass === 'sanesteban2026') {
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('panelAdminContent').style.display = 'block';
            cargarPanelAdmin();
        } else {
            document.getElementById('errorLogin').textContent = 'Usuario o contraseña incorrectos.';
        }
    });
});

async function cargarPanelAdmin() {
    try {
        const response = await fetch('/api/reservas');
        const reservas = await response.json();
        
        const tbody = document.getElementById('tablaStaffBody');
        tbody.innerHTML = '';

        document.getElementById('statTotal').textContent = reservas.length;
        
        let recaudacionTotal = 0;
        let senasTotales = 0;

        reservas.forEach(r => {
            recaudacionTotal += parseFloat(r.precio || 0);
            if (r.estado_pago === 'Aprobado') {
                senasTotales += 15000;
            }
        });

        document.getElementById('statCaja').textContent = `$${recaudacionTotal.toLocaleString('es-AR')}`;
        document.getElementById('statSenas').textContent = `$${senasTotales.toLocaleString('es-AR')}`;

        if (reservas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #9ca3af;">No hay reservas registradas.</td></tr>`;
            return;
        }

        reservas.forEach(r => {
            let badgeColor = '#f59e0b'; // Pendiente
            if (r.estado_pago === 'Aprobado') badgeColor = '#10b981';
            if (r.estado_pago === 'Rechazado') badgeColor = '#ef4444';

            // Botón o enlace para ver el comprobante en nueva pestaña
            let comprobanteHtml = 'Sin comprobante';
            if (r.comprobante && r.comprobante.startsWith('data:')) {
                comprobanteHtml = `<a href="${r.comprobante}" target="_blank" class="btn-ver-comprobante">Ver Comprobante 🔍</a>`;
            } else if (r.comprobante) {
                comprobanteHtml = `<span>${r.comprobante}</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${r.id}</td>
                <td>${r.fecha}<br><small style="color:#9ca3af;">${r.horario}</small></td>
                <td>Cancha ${r.cancha}</td>
                <td><strong>${r.cliente}</strong><br><small>${r.telefono}</small></td>
                <td>${r.metodo_pago}<br><strong style="color:var(--accent-color);">$${Number(r.precio).toLocaleString('es-AR')}</strong></td>
                <td>${comprobanteHtml}</td>
                <td><span style="color: ${badgeColor}; font-weight:700;">${r.estado_pago || 'Pendiente'}</span></td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="btn-aprobar" onclick="cambiarEstadoPago(${r.id}, 'Aprobado')">Aprobar Seña</button>
                        <button class="btn-rechazar" onclick="cambiarEstadoPago(${r.id}, 'Rechazado')">Rechazar</button>
                        <button class="btn-delete" onclick="eliminarReserva(${r.id})">Borrar</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error al cargar panel admin:', error);
    }
}

async function cambiarEstadoPago(id, nuevoEstado) {
    try {
        const response = await fetch(`/api/reservas/${id}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado_pago: nuevoEstado })
        });
        if (response.ok) {
            cargarPanelAdmin();
        } else {
            alert('Error al actualizar estado.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function eliminarReserva(id) {
    if (!confirm('¿Estás seguro de eliminar esta reserva?')) return;

    try {
        const response = await fetch(`/api/reservas/${id}`, { method: 'DELETE' });
        if (response.ok) {
            cargarPanelAdmin();
        } else {
            alert('Error al eliminar.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}