document.getElementById('btnCargar').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/reservas');
        const data = await response.json();
        document.getElementById('resultado').innerText = JSON.stringify(data);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('resultado').innerText = 'Error al conectar con el servidor.';
    }
});