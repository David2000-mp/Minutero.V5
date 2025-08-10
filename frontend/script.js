document.addEventListener('DOMContentLoaded', main);

const colorMap = {
    'Dar seguimiento a un proyecto.': '#3498DB', 'Una propuesta nueva': '#9B59B6', 'Idea para una colaboración': '#1ABC9C', 'Tema de Copys': '#F1C40F', 'Iluminación': '#E74C3C', 'Mejorar tiempos de publicación': '#2ECC71', 'Observación': '#8E44AD'
};

let toastTimeout;
let activeTaskTimer = {
    intervalId: null, li: null, remainingSeconds: 0, totalSeconds: 0
};
let globalTimer = {
    intervalId: null, totalSeconds: 0, isRunning: false
};

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 2000);
}

function inicializarControles(tiempoTotalPlanificado = 0) {
    const startTimerButton = document.getElementById('start-timer');
    const stopTimerButton = document.getElementById('stop-timer');
    const resetGlobalButton = document.getElementById('reset-global-timer');
    const timerDisplay = document.getElementById('timer-display');
    
    function updateGlobalDisplay() {
        const minutes = Math.floor(globalTimer.totalSeconds / 60);
        const seconds = globalTimer.totalSeconds % 60;
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    startTimerButton.addEventListener('click', () => {
        if (!globalTimer.isRunning) {
            globalTimer.isRunning = true;
            globalTimer.intervalId = setInterval(() => {
                globalTimer.totalSeconds++;
                updateGlobalDisplay();
            }, 1000);
        }
    });

    stopTimerButton.addEventListener('click', () => {
        if (globalTimer.isRunning) {
            clearInterval(globalTimer.intervalId);
            globalTimer.isRunning = false;
        }
    });

    resetGlobalButton.addEventListener('click', () => {
        if (globalTimer.isRunning) {
            clearInterval(globalTimer.intervalId);
            globalTimer.isRunning = false;
        }
        globalTimer.totalSeconds = 0;
        updateGlobalDisplay();
    });

    const resetMeetingButton = document.getElementById('reset-meeting');
    resetMeetingButton.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres borrar todos los datos de esta minuta?')) {
            localStorage.removeItem('agendaEstado');
            location.reload();
        }
    });
    const meetingNumberSelect = document.getElementById('meeting-number');
    for (let i = 1; i <= 50; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Reunión #${i}`;
        meetingNumberSelect.appendChild(option);
    }
    meetingNumberSelect.addEventListener('change', guardarEstado);
    document.querySelectorAll('.attendee-checkbox').forEach(cb => cb.addEventListener('change', guardarEstado));
    inicializarBotonPDF();
}

function guardarEstado() {
    const attendees = Array.from(document.querySelectorAll('.attendee-checkbox:checked')).map(cb => cb.value);
    const estado = {
        reunion: document.getElementById('meeting-number').value,
        asistentes: attendees,
        tareas: {}
    };
    document.querySelectorAll('#agenda-container li, #lista-completados li').forEach(li => {
        const id = li.dataset.tareaId;
        if (!id) return;
        estado.tareas[id] = {
            acuerdos: li.querySelector('.acuerdos-textarea').value,
            notas: li.querySelector('.notas-textarea').value,
            rol: li.querySelector('.rol-select').value,
            responsable: li.querySelector('.responsable-select').value,
            fechaEntrega: li.querySelector('.due-date-input').value,
            discutido: li.parentElement.id === 'lista-completados',
            tiempo: li.dataset.tiempoAsignado || 0
        };
    });
    localStorage.setItem('agendaEstado', JSON.stringify(estado));
    showToast('✓ Guardado');
}

function cargarEstado() {
    const estadoGuardado = localStorage.getItem('agendaEstado');
    if (!estadoGuardado) return;
    const estado = JSON.parse(estadoGuardado);
    document.getElementById('meeting-number').value = estado.reunion || '1';
    if (estado.asistentes && Array.isArray(estado.asistentes)) {
        estado.asistentes.forEach(name => {
            const checkbox = document.querySelector(`.attendee-checkbox[value="${name}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    const listaCompletados = document.getElementById('lista-completados');
    const completadosContainer = document.getElementById('completados-container');
    let hayCompletados = false;
    for (const id in estado.tareas) {
        const li = document.querySelector(`li[data-tarea-id="${id}"]`);
        if (li) {
            const datosTarea = estado.tareas[id];
            li.querySelector('.acuerdos-textarea').value = datosTarea.acuerdos || '';
            li.querySelector('.notas-textarea').value = datosTarea.notas || '';
            li.querySelector('.rol-select').value = datosTarea.rol || '';
            li.querySelector('.responsable-select').value = datosTarea.responsable || '';
            li.querySelector('.due-date-input').value = datosTarea.fechaEntrega || '';
            li.dataset.tiempoAsignado = datosTarea.tiempo || 0;
            if (li.querySelector('.task-time-display')) {
                const tiempo = datosTarea.tiempo || 0;
                li.querySelector('.task-time-display').textContent = `${tiempo}:00`;
            }
            if (datosTarea.discutido) {
                li.classList.add('discutido');
                listaCompletados.appendChild(li);
                hayCompletados = true;
                const boton = li.querySelector('.task-action-btn');
                boton.textContent = 'Reabrir';
                boton.classList.replace('complete-task-btn', 'reopen-task-btn');
            }
        }
    }
    if (hayCompletados) {
        completadosContainer.classList.remove('hidden');
    }
}

async function fetchSheetData() {
    try {
        const response = await fetch('/read_sheet');
        if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        return result.data;
    } catch (error) {
        console.error("Error al obtener los datos:", error);
        document.getElementById('agenda-container').innerHTML = `<p style="color: red;">No se pudo cargar la agenda.</p>`;
        return [];
    }
}

function displayAgenda(agendaData, tiempoTotalMinutos) {
    const agendaContainer = document.getElementById('agenda-container');
    const summaryContainer = document.getElementById('agenda-summary');
    const summaryList = document.getElementById('summary-list');
    const totalTimeValue = document.getElementById('total-time-value');
    const meetingEta = document.getElementById('meeting-eta');
    
    agendaContainer.innerHTML = '';
    summaryList.innerHTML = '';

    if (!agendaData || agendaData.length === 0) {
        agendaContainer.innerHTML = "<h2>No hay pendientes para mostrar en la agenda.</h2>";
        summaryContainer.style.display = 'none';
        return;
    }

    agendaData.forEach(tareaObj => {
        const summaryItem = document.createElement('li');
        summaryItem.textContent = tareaObj.datos[3];
        summaryList.appendChild(summaryItem);
    });
    totalTimeValue.textContent = `${tiempoTotalMinutos} minutos`;
    const now = new Date();
    const endTime = new Date(now.getTime() + tiempoTotalMinutos * 60000);
    meetingEta.textContent = endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    summaryContainer.style.display = 'block';

    let categoriaActual = "";
    let ulActual = null;
    agendaData.forEach(tareaObj => {
        const categoria = tareaObj.categoriaOriginal;
        const tarea = tareaObj.datos;
        const tiempoAsignado = tareaObj.tiempo;
        if (categoria !== categoriaActual) {
            categoriaActual = categoria;
            const h2 = document.createElement('h2');
            h2.className = 'toggle-seccion';
            h2.innerHTML = `<span>${categoria}</span><div class="controls"><span class="task-counter"></span> <span class="arrow">▲</span></div>`;
            agendaContainer.appendChild(h2);
            ulActual = document.createElement('ul');
            ulActual.id = `lista-${categoria.replace(/[^a-zA-Z0-9]/g, '-')}`;
            ulActual.className = 'seccion-ul';
            agendaContainer.appendChild(ulActual);
        }
        const li = document.createElement('li');
        const tareaId = `${tarea[3]}-${tarea[0]}`.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        li.dataset.tareaId = tareaId;
        li.dataset.originalLista = ulActual.id;
        li.dataset.tiempoAsignado = tiempoAsignado;
        if (colorMap[categoria.trim()]) {
            li.style.borderLeftColor = colorMap[categoria.trim()];
        }
        li.innerHTML = `
            <div class="card-header">
                <h4>${tarea[3]}</h4>
                <div class="task-timer-controls">
                    <div class="task-time-display">${tiempoAsignado}:00</div>
                    <button class="task-timer-start-btn">▶ Iniciar</button>
                </div>
            </div>
            <div class="progress-bar-container"><div class="progress-bar"></div></div>
            <div class="card-content">
                <div class="card-meta"><p><strong>Propuesto por:</strong><br>${tarea[0]}</p><label>Rol Asignado:</label><select class="rol-select"><option value="">-- Elegir Rol --</option><option value="Productor">Productor</option><option value="Director Creativo">Director Creativo</option><option value="Relaciones Públicas">Relaciones Públicas</option><option value="Publicista">Publicista</option></select><label>Responsable:</label><select class="responsable-select"><option value="">-- Elegir Persona --</option><option value="David">David</option><option value="Andoni">Andoni</option><option value="Axel">Axel</option><option value="Pablo">Pablo</option></select><label>Fecha de Entrega:</label><input type="date" class="due-date-input"></div>
                <div class="card-main"><label>Acuerdos:</label><textarea class="acuerdos-textarea" rows="3" placeholder="Escribe aquí los acuerdos clave..."></textarea><label>Notas:</label><textarea class="notas-textarea" rows="2" placeholder="Observaciones, próximos pasos, etc..."></textarea></div>
            </div>
            <div class="card-actions"><button class="task-action-btn complete-task-btn">Completar</button></div>
        `;
        li.querySelectorAll('textarea, select, input[type="date"]').forEach(input => {
            input.addEventListener('input', guardarEstado);
        });
        ulActual.appendChild(li);
    });
    document.querySelectorAll('ul').forEach(lista => { new Sortable(lista, { group: 'shared', animation: 150, ghostClass: 'fantasma', onEnd: guardarEstado }); });
}

function actualizarContadores() {
    const listaCompletados = document.getElementById('lista-completados');
    const completadosHeader = document.querySelector('#completados-container .toggle-header');
    if (completadosHeader) {
        completadosHeader.querySelector('.task-counter').textContent = `(${listaCompletados.children.length})`;
    }
    document.querySelectorAll('#agenda-container .seccion-ul').forEach(ul => {
        const header = ul.previousElementSibling;
        if (!header) return;
        const totalTareas = document.querySelectorAll(`li[data-original-lista="${ul.id}"]`).length;
        const tareasCompletadasEnSeccion = listaCompletados.querySelectorAll(`li[data-original-lista="${ul.id}"]`).length;
        header.querySelector('.task-counter').textContent = `(${tareasCompletadasEnSeccion}/${totalTareas})`;
    });
}

function inicializarBotonPDF() {
    const exportButton = document.getElementById('export-pdf');
    window.jsPDF = window.jspdf.jsPDF;
    exportButton.addEventListener('click', () => {
        exportButton.disabled = true;
        exportButton.textContent = 'Generando...';
        const tareasPorPersona = {};
        document.querySelectorAll('#agenda-container li, #lista-completados li').forEach(li => {
            const responsable = li.querySelector('.responsable-select').value;
            const tituloTarea = li.querySelector('h4').textContent;
            const acuerdos = li.querySelector('.acuerdos-textarea').value;
            const fechaEntrega = li.querySelector('.due-date-input').value;
            if (responsable) {
                if (!tareasPorPersona[responsable]) { tareasPorPersona[responsable] = []; }
                tareasPorPersona[responsable].push({
                    titulo: tituloTarea,
                    acuerdos: acuerdos || 'No se definieron acuerdos.',
                    fecha: fechaEntrega
                });
            }
        });
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        let y = 20; const margen = 15; const anchoPagina = doc.internal.pageSize.getWidth();
        const meetingNumber = document.getElementById('meeting-number').value;
        doc.setFont('Montserrat', 'bold');
        doc.setFontSize(22);
        doc.setTextColor('#191919');
        doc.text(`Resumen | Reunión #${meetingNumber}`, anchoPagina / 2, y, { align: 'center' });
        y += 8;
        doc.setFont('Lato', 'normal');
        doc.setFontSize(11);
        doc.setTextColor('#555');
        doc.text(new Date().toLocaleDateString('es-ES', { dateStyle: 'long' }), anchoPagina / 2, y, { align: 'center' });
        y += 15;
        doc.setDrawColor('#FF4D00');
        doc.setLineWidth(0.5);
        doc.line(margen, y, anchoPagina - margen, y);
        y += 12;
        const asistentes = Array.from(document.querySelectorAll('.attendee-checkbox:checked')).map(cb => cb.value);
        if(asistentes.length > 0) {
            doc.setFont('Montserrat', 'bold');
            doc.setFontSize(12);
            doc.setTextColor('#191919');
            doc.text('Asistentes:', margen, y);
            y += 6;
            doc.setFont('Lato', 'normal');
            doc.setFontSize(11);
            doc.setTextColor('#333');
            doc.text(asistentes.join(', '), margen, y);
            y += 15;
        }
        if (Object.keys(tareasPorPersona).length === 0) {
            doc.setFont('Lato', 'normal');
            doc.setFontSize(12);
            doc.text('No se asignaron tareas a ningún responsable.', anchoPagina / 2, y, { align: 'center' });
        }
        for (const persona in tareasPorPersona) {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFont('Montserrat', 'bold');
            doc.setFontSize(16);
            doc.setTextColor('#FF4D00');
            doc.text(persona, margen, y);
            y += 8;
            tareasPorPersona[persona].forEach(tarea => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFont('Lato', 'bold');
                doc.setFontSize(12);
                doc.setTextColor('#191919');
                doc.text(`• Tarea: ${tarea.titulo}`, margen + 5, y);
                y += 6;
                doc.setFontSize(10);
                doc.setTextColor('#555');
                let fechaFormateada = tarea.fecha ? new Date(tarea.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No definida';
                doc.text(`  Fecha de Entrega: ${fechaFormateada}`, margen + 5, y);
                y += 7;
                doc.setFont('Lato', 'normal');
                doc.setFontSize(11);
                doc.setTextColor('#333');
                let textoAcuerdos = doc.splitTextToSize(`  Acuerdos: ${tarea.acuerdos}`, anchoPagina - (margen * 2) - 15);
                doc.text(textoAcuerdos, margen + 10, y);
                y += (textoAcuerdos.length * 5) + 8;
            });
        }
        doc.save(`resumen-reunion-${meetingNumber}.pdf`);
        exportButton.disabled = false;
        exportButton.textContent = 'Exportar PDF';
    });
}

document.querySelector('main').addEventListener('click', function(event) {
    const header = event.target.closest('.toggle-seccion, .toggle-header');
    const completeBtn = event.target.closest('.complete-task-btn');
    const reopenBtn = event.target.closest('.reopen-task-btn');
    const startTimerBtn = event.target.closest('.task-timer-start-btn');
    if (header) {
        const list = header.nextElementSibling;
        const arrow = header.querySelector('.arrow');
        if (list && list.tagName === 'UL') {
            const isCollapsed = list.classList.toggle('collapsed');
            arrow.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        }
    }
    if (completeBtn || reopenBtn) {
        const boton = completeBtn || reopenBtn;
        const li = boton.closest('li');
        const isCompleting = boton.classList.contains('complete-task-btn');
        li.classList.toggle('discutido', isCompleting);
        if (isCompleting) {
            document.getElementById('lista-completados').appendChild(li);
            document.getElementById('completados-container').classList.remove('hidden');
            boton.textContent = 'Reabrir';
            boton.classList.replace('complete-task-btn', 'reopen-task-btn');
        } else {
            const originalLista = document.getElementById(li.dataset.originalLista);
            if (originalLista) originalLista.appendChild(li);
            boton.textContent = 'Completar';
            boton.classList.replace('reopen-task-btn', 'complete-task-btn');
        }
        actualizarContadores();
        guardarEstado();
    }
    if (startTimerBtn) {
        const li = startTimerBtn.closest('li');
        if (activeTaskTimer.li === li) {
            clearInterval(activeTaskTimer.intervalId);
            activeTaskTimer.intervalId = null;
            activeTaskTimer.li = null;
            startTimerBtn.textContent = '▶ Reanudar';
            startTimerBtn.classList.remove('running');
            return;
        }
        if (activeTaskTimer.intervalId) {
            clearInterval(activeTaskTimer.intervalId);
            const botonAnterior = activeTaskTimer.li.querySelector('.task-timer-start-btn');
            botonAnterior.textContent = '▶ Iniciar';
            botonAnterior.classList.remove('running');
            const tiempoTotalAnterior = (activeTaskTimer.li.dataset.tiempoAsignado || 0) * 60;
            if(tiempoTotalAnterior > 0) {
                activeTaskTimer.li.querySelector('.progress-bar').style.width = `${(activeTaskTimer.remainingSeconds/tiempoTotalAnterior)*100}%`;
            }
        }
        
        const tiempoAsignadoMinutos = parseInt(li.dataset.tiempoAsignado, 10) || 0;
        if (tiempoAsignadoMinutos > 0) {
            if (!globalTimer.isRunning) {
                globalTimer.isRunning = true;
                const timerDisplay = document.getElementById('timer-display');
                globalTimer.intervalId = setInterval(() => {
                    globalTimer.totalSeconds++;
                    const minutes = Math.floor(globalTimer.totalSeconds / 60);
                    const seconds = globalTimer.totalSeconds % 60;
                    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }, 1000);
            }
            const tiempoTotalSegundos = tiempoAsignadoMinutos * 60;
            activeTaskTimer.remainingSeconds = tiempoTotalSegundos;
            activeTaskTimer.totalSeconds = tiempoTotalSegundos;
            activeTaskTimer.li = li;
            startTimerBtn.textContent = '❚❚ Pausar';
            startTimerBtn.classList.add('running');
            const display = li.querySelector('.task-time-display');
            const progressBarContainer = li.querySelector('.progress-bar-container');
            const progressBar = li.querySelector('.progress-bar');
            progressBarContainer.style.display = 'block';

            activeTaskTimer.intervalId = setInterval(() => {
                activeTaskTimer.remainingSeconds--;
                const minutes = Math.floor(activeTaskTimer.remainingSeconds / 60);
                const seconds = activeTaskTimer.remainingSeconds % 60;
                display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                const porcentajeRestante = (activeTaskTimer.remainingSeconds / activeTaskTimer.totalSeconds) * 100;
                progressBar.style.width = `${porcentajeRestante}%`;
                if (activeTaskTimer.remainingSeconds <= 0) {
                    clearInterval(activeTaskTimer.intervalId);
                    activeTaskTimer.intervalId = null;
                    activeTaskTimer.li = null;
                    startTimerBtn.textContent = '¡Tiempo!';
                    startTimerBtn.disabled = true;
                    startTimerBtn.classList.remove('running');
                    li.style.backgroundColor = '#fff3cd';
                }
            }, 1000);
        }
    }
});

function abrirModalDePlanificacion(agendaData) {
    const modal = document.getElementById('setup-modal');
    const taskList = document.getElementById('modal-task-list');
    const startButton = document.getElementById('start-meeting-btn');
    taskList.innerHTML = '';
    const todasLasTareas = agendaData.flatMap(seccion => seccion.tareas.map(tarea => ({ datos: tarea, categoriaOriginal: seccion.categoria })) );
    todasLasTareas.forEach(tareaObj => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="modal-task-title">${tareaObj.datos[3]}</span><input type="number" class="time-input" placeholder="min" min="0">`;
        li.dataset.tareaData = JSON.stringify(tareaObj);
        taskList.appendChild(li);
    });
    new Sortable(taskList, { animation: 150 });
    
    startButton.addEventListener('click', () => {
        let tiempoTotalPlanificado = 0;
        const tareasReordenadas = Array.from(taskList.querySelectorAll('li')).map(li => {
            const tareaObj = JSON.parse(li.dataset.tareaData);
            const tiempoAsignado = parseInt(li.querySelector('.time-input').value, 10) || 0;
            tareaObj.tiempo = tiempoAsignado;
            tiempoTotalPlanificado += tiempoAsignado;
            return tareaObj;
        });
        
        modal.style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        
        inicializarControles(tiempoTotalPlanificado * 60);
        displayAgenda(tareasReordenadas, tiempoTotalPlanificado);
        cargarEstado();
        actualizarContadores();
    }, { once: true });
}

async function main() {
    const agendaData = await fetchSheetData();
    if (agendaData && agendaData.length > 0) {
        abrirModalDePlanificacion(agendaData);
    } else {
        document.getElementById('setup-modal').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        inicializarControles();
        displayAgenda(agendaData, 0);
    }
}
</script>
</body>
</html>