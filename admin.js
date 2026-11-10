document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('formLogin').addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('userAdmin').value;
        const pass = document.getElementById('passAdmin').value;

        if (usuario === 'admin' && pass === 'sanesteban2026') {
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('panelAdminContent').style.display = 'block';
            
            // Modal de bienvenida personalizado al ingresar al sistema de staff
            mostrarModal('¡Bienvenido al Staff!', 'Has ingresado correctamente al panel de control de San Esteban Paddle Club.');
            
            cargarPanelAdmin();
        } else {
            document.getElementById('errorLogin').textContent = 'Usuario o contraseña incorrectos.';
        }
    });
});

function mostrarModal(titulo, mensaje) {
    document.getElementById('modalTitle').textContent = titulo;
    document.getElementById('modalMessage').textContent = mensaje;
    document.getElementById('customModal').style.display = 'flex';
}

function cerrarModalCustom() {
    document.getElementById('customModal').style.display = 'none';
}

async function cargarPanelAdmin() {
    try {
        const response = await fetch('/api/reservas');
        const reservas = await response.json();
        
        const tbody = document.getElementById('tablaStaffBody');
        tbody.innerHTML = '';

        const reservasActivas = reservas.filter(r => r.estado_pago !== 'Rechazado');
        document.getElementById('statTotal').textContent = reservasActivas.length;
        
        let recaudacionTotal = 0;
        let senasTotales = 0;

        reservas.forEach(r => {
            if (r.estado_pago !== 'Rechazado') {
                recaudacionTotal += parseFloat(r.precio || 0);
                if (r.estado_pago === 'Aprobado') {
                    senasTotales += 15000;
                }
            }
        });

        document.getElementById('statCaja').textContent = `$${recaudacionTotal.toLocaleString('es-AR')}`;
        document.getElementById('statSenas').textContent = `$${senasTotales.toLocaleString('es-AR')}`;

        if (reservas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #9ca3af;">No hay reservas registradas.</td></tr>`;
            return;
        }

        reservas.forEach(r => {
            let badgeColor = '#f59e0b';
            if (r.estado_pago === 'Aprobado') badgeColor = '#10b981';
            if (r.estado_pago === 'Rechazado') badgeColor = '#ef4444';

            let comprobanteHtml = 'Sin comprobante';
            if (r.comprobante && r.comprobante.startsWith('data:')) {
                comprobanteHtml = `<a href="#" onclick="abrirComprobanteBase64('${r.comprobante}'); return false;" class="btn-ver-comprobante">Ver Comprobante 🔍</a>`;
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
                        <button class="btn-aprobar" onclick="cambiarEstadoPago(${r.id}, 'Aprobado')">Aprobar</button>
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

function abrirComprobanteBase64(base64Data) {
    try {
        const arr = base64Data.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
    } catch (e) {
        console.error("Error al abrir comprobante:", e);
        mostrarModal('Error', 'No se pudo previsualizar el archivo adjunto.');
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
            mostrarModal('Actualizado', `La reserva #${id} fue marcada como ${nuevoEstado}.`);
            cargarPanelAdmin();
        } else {
            mostrarModal('Error', 'No se pudo actualizar el estado.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function eliminarReserva(id) {
    if (!confirm('¿Estás seguro de eliminar esta reserva permanentemente?')) return;

    try {
        const response = await fetch(`/api/reservas/${id}`, { method: 'DELETE' });
        if (response.ok) {
            cargarPanelAdmin();
        } else {
            mostrarModal('Error', 'No se pudo eliminar.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}