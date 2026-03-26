/* ========================================
   SYSTEME DE PRISE DE RDV — AXE Expertise
   Connexion aux calendriers Outlook 365
   via Microsoft Graph API (backend PHP)
   ======================================== */

const RDV_API_BASE = '/api';

// State
let rdvData = {
    service: '',
    mode: '',       // 'cabinet' ou 'visio'
    slot: null,     // { date, day, time, datetime, employee }
    weekOffset: 0,  // 0 = semaine courante, 1 = prochaine, etc.
};

let currentSlots = [];
let isLoadingSlots = false;

/* ========================================
   STEP 1: Selection service + mode
   ======================================== */
function selectService(btn, service) {
    document.querySelectorAll('.rdv-service-btn').forEach(b => {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');
    rdvData.service = service;

    // Afficher la section mode
    const modeSection = document.getElementById('rdvModeSection');
    if (modeSection) {
        modeSection.style.display = 'block';
        modeSection.style.opacity = '0';
        modeSection.style.transform = 'translateY(10px)';
        requestAnimationFrame(() => {
            modeSection.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            modeSection.style.opacity = '1';
            modeSection.style.transform = 'translateY(0)';
        });
    }

    updateStep1Button();
}

function selectMode(btn, mode) {
    document.querySelectorAll('.rdv-mode-btn').forEach(b => {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');
    rdvData.mode = mode;
    updateStep1Button();
}

function updateStep1Button() {
    const nextBtn = document.getElementById('rdvNext1');
    if (!nextBtn) return;

    if (rdvData.service && rdvData.mode) {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
    } else {
        nextBtn.style.opacity = '0.4';
        nextBtn.style.pointerEvents = 'none';
    }
}

/* ========================================
   STEP 2: Calendrier des disponibilites
   ======================================== */

function getMonday(weekOffset) {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // lundi
    const monday = new Date(now.setDate(diff));
    monday.setDate(monday.getDate() + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDateFR(dateStr) {
    const d = new Date(dateStr);
    const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
                    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
    return d.getDate() + ' ' + months[d.getMonth()];
}

function updateWeekLabel() {
    const monday = getMonday(rdvData.weekOffset);
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);

    const label = document.getElementById('weekLabel');
    if (label) {
        label.textContent = 'Semaine du ' + formatDateFR(monday) + ' au ' + formatDateFR(friday);
    }

    // Desactiver le bouton "precedent" si on est sur la semaine courante
    const prevBtn = document.getElementById('prevWeek');
    if (prevBtn) {
        prevBtn.disabled = rdvData.weekOffset <= 0;
        prevBtn.style.opacity = rdvData.weekOffset <= 0 ? '0.3' : '1';
    }

    // Limiter a 3 semaines en avant
    const nextBtn = document.getElementById('nextWeek');
    if (nextBtn) {
        nextBtn.disabled = rdvData.weekOffset >= 2;
        nextBtn.style.opacity = rdvData.weekOffset >= 2 ? '0.3' : '1';
    }
}

function changeWeek(direction) {
    const newOffset = rdvData.weekOffset + direction;
    if (newOffset < 0 || newOffset > 2) return;

    rdvData.weekOffset = newOffset;
    rdvData.slot = null; // Reset slot selection

    const nextBtn = document.getElementById('rdvNext2');
    if (nextBtn) {
        nextBtn.style.opacity = '0.4';
        nextBtn.style.pointerEvents = 'none';
    }

    loadAvailability();
}

async function loadAvailability() {
    if (isLoadingSlots) return;
    isLoadingSlots = true;

    const calendar = document.getElementById('rdvCalendar');
    const loading = document.getElementById('rdvLoading');
    const noSlots = document.getElementById('rdvNoSlots');

    if (calendar) calendar.innerHTML = '';
    if (loading) loading.style.display = 'flex';
    if (noSlots) noSlots.style.display = 'none';

    updateWeekLabel();

    const monday = getMonday(rdvData.weekOffset);

    try {
        const response = await fetch(
            RDV_API_BASE + '/availability.php?service=' + encodeURIComponent(rdvData.service)
            + '&week=' + formatDate(monday)
        );

        if (!response.ok) {
            throw new Error('Erreur serveur: ' + response.status);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        currentSlots = data.slots || [];
        renderCalendar(currentSlots);

    } catch (err) {
        console.error('Erreur chargement disponibilites:', err);

        // Fallback: generer des creneaux de demo si l'API n'est pas encore configuree
        if (err.message.includes('Erreur serveur') || err.message.includes('Failed to fetch')) {
            currentSlots = generateFallbackSlots(monday);
            renderCalendar(currentSlots);
            if (typeof showToast === 'function') {
                showToast('Mode demonstration — Les disponibilites reelles seront affichees une fois l\'API configuree.');
            }
        } else {
            if (noSlots) {
                noSlots.querySelector('p').textContent = 'Erreur de chargement. Veuillez reessayer.';
                noSlots.style.display = 'flex';
            }
        }
    } finally {
        if (loading) loading.style.display = 'none';
        isLoadingSlots = false;
    }
}

/**
 * Creneaux de demonstration (utilises tant que l'API n'est pas configuree)
 */
function generateFallbackSlots(monday) {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const hours = [9, 10, 11, 14, 15, 16, 17];
    const slots = [];

    for (let d = 0; d < 5; d++) {
        const date = new Date(monday);
        date.setDate(date.getDate() + d);
        const dateStr = formatDate(date);

        for (const h of hours) {
            // Simuler ~70% de disponibilite
            if (Math.random() < 0.3) continue;

            // Ne pas proposer les creneaux passes
            const slotTime = new Date(date);
            slotTime.setHours(h, 0, 0, 0);
            if (slotTime <= new Date()) continue;

            slots.push({
                date: dateStr,
                day: days[d],
                time: String(h).padStart(2, '0') + ':00',
                datetime: dateStr + 'T' + String(h).padStart(2, '0') + ':00:00',
                employee: 'demo@axe-expertise.fr',
            });
        }
    }

    return slots;
}

/**
 * Affichage calendrier : grille jour par jour avec creneaux horaires
 */
function renderCalendar(slots) {
    const calendar = document.getElementById('rdvCalendar');
    const noSlots = document.getElementById('rdvNoSlots');

    if (!calendar) return;
    calendar.innerHTML = '';

    if (slots.length === 0) {
        if (noSlots) noSlots.style.display = 'flex';
        return;
    }
    if (noSlots) noSlots.style.display = 'none';

    // Grouper par jour
    const byDay = {};
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

    // Initialiser tous les jours (meme vides)
    const monday = getMonday(rdvData.weekOffset);
    for (let d = 0; d < 5; d++) {
        const date = new Date(monday);
        date.setDate(date.getDate() + d);
        const key = formatDate(date);
        byDay[key] = { day: days[d], date: key, slots: [] };
    }

    slots.forEach(slot => {
        if (byDay[slot.date]) {
            byDay[slot.date].slots.push(slot);
        }
    });

    // Creer la grille
    let index = 0;
    Object.values(byDay).forEach(dayData => {
        const dayCol = document.createElement('div');
        dayCol.className = 'rdv-day-col';

        // En-tete du jour
        const header = document.createElement('div');
        header.className = 'rdv-day-header';
        header.innerHTML = '<strong>' + dayData.day + '</strong><span>' + formatDateFR(dayData.date) + '</span>';
        dayCol.appendChild(header);

        // Creneaux
        if (dayData.slots.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'rdv-slot-empty';
            empty.textContent = 'Complet';
            dayCol.appendChild(empty);
        } else {
            dayData.slots.forEach(slot => {
                const btn = document.createElement('button');
                btn.className = 'rdv-slot-btn';
                btn.textContent = slot.time;
                btn.setAttribute('aria-label', slot.day + ' ' + formatDateFR(slot.date) + ' a ' + slot.time);

                btn.addEventListener('click', () => {
                    selectSlot(btn, slot);
                });

                // Animation entree
                btn.style.opacity = '0';
                btn.style.transform = 'translateY(6px)';
                dayCol.appendChild(btn);

                setTimeout(() => {
                    btn.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                    btn.style.opacity = '1';
                    btn.style.transform = 'translateY(0)';
                }, 30 + index * 25);
                index++;
            });
        }

        calendar.appendChild(dayCol);
    });
}

function selectSlot(btn, slot) {
    document.querySelectorAll('.rdv-slot-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    rdvData.slot = slot;

    const nextBtn = document.getElementById('rdvNext2');
    if (nextBtn) {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
    }
}

/* ========================================
   STEP 3: Resume + formulaire
   ======================================== */
function updateSummary() {
    const summary = document.getElementById('rdvSummary');
    if (!summary || !rdvData.slot) return;

    const modeLabel = rdvData.mode === 'visio' ? 'Visioconference (Teams)' : 'En cabinet — Paris';
    const modeIcon = rdvData.mode === 'visio'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';

    summary.innerHTML =
        '<div class="rdv-summary-row">'
        + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 1L1 7l11 6 11-6-11-6z"/><path d="M1 17l11 6 11-6"/></svg>'
        + '<span><strong>Service :</strong> ' + rdvData.service + '</span>'
        + '</div>'
        + '<div class="rdv-summary-row">'
        + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
        + '<span><strong>Date :</strong> ' + rdvData.slot.day + ' ' + formatDateFR(rdvData.slot.date) + ' a ' + rdvData.slot.time + '</span>'
        + '</div>'
        + '<div class="rdv-summary-row">'
        + modeIcon
        + '<span><strong>Mode :</strong> ' + modeLabel + '</span>'
        + '</div>';
}

/* ========================================
   NAVIGATION ENTRE ETAPES
   ======================================== */
function goToRdvStep(step) {
    ['rdvStep1', 'rdvStep2', 'rdvStep3', 'rdvConfirmation'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.style.display !== 'none') {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-10px)';
            setTimeout(() => { el.style.display = 'none'; }, 200);
        }
    });

    setTimeout(() => {
        const target = document.getElementById('rdvStep' + step);
        if (target) {
            target.style.display = 'block';
            target.style.opacity = '0';
            target.style.transform = 'translateY(20px) scale(0.98)';

            requestAnimationFrame(() => {
                target.classList.add('panel-enter');
                target.style.opacity = '';
                target.style.transform = '';
            });
        }

        // Update step indicators
        document.querySelectorAll('.rdv-step').forEach(s => {
            const sStep = parseInt(s.dataset.step);
            s.classList.remove('active', 'completed');
            if (sStep === step) s.classList.add('active');
            else if (sStep < step) s.classList.add('completed');
        });

        document.querySelectorAll('.rdv-step-connector').forEach((conn, i) => {
            conn.style.background = i < step - 1 ? 'var(--orange)' : 'var(--border-light)';
        });

        // Actions specifiques a chaque etape
        if (step === 2) {
            loadAvailability();
        }
        if (step === 3) {
            updateSummary();
        }

        // Scroll to top du container
        const container = document.querySelector('.rdv-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 250);
}

/* ========================================
   SOUMISSION DU RDV
   ======================================== */
async function submitRdv(e) {
    e.preventDefault();

    const name = document.getElementById('rdv-name')?.value?.trim();
    const email = document.getElementById('rdv-email')?.value?.trim();
    const phone = document.getElementById('rdv-phone')?.value?.trim();
    const company = document.getElementById('rdv-company')?.value?.trim();
    const message = document.getElementById('rdv-message')?.value?.trim();

    // Validation
    if (!name || !email || !phone) {
        if (typeof showToast === 'function') {
            showToast('Veuillez remplir tous les champs obligatoires.');
        }
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (typeof showToast === 'function') {
            showToast('Veuillez entrer une adresse email valide.');
        }
        return;
    }

    const btn = document.getElementById('rdvSubmitBtn');
    if (btn) {
        btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;">Reservation en cours... <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite;"><circle cx="12" cy="12" r="10" stroke-dasharray="30 60"/></svg></span>';
        btn.style.opacity = '0.7';
        btn.disabled = true;
    }

    try {
        const bookingData = {
            service: rdvData.service,
            datetime: rdvData.slot.datetime,
            employee: rdvData.slot.employee,
            name: name,
            email: email,
            phone: phone,
            company: company || '',
            message: message || '',
            mode: rdvData.mode,
        };

        const response = await fetch(RDV_API_BASE + '/book.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData),
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.code === 'SLOT_TAKEN') {
                if (typeof showToast === 'function') {
                    showToast('Ce creneau vient d\'etre pris. Veuillez en choisir un autre.');
                }
                goToRdvStep(2);
                return;
            }
            throw new Error(result.error || 'Erreur lors de la reservation');
        }

        // Succes — afficher confirmation
        showConfirmation(result);

    } catch (err) {
        console.error('Erreur reservation:', err);

        // Fallback demo mode
        if (err.message.includes('Failed to fetch') || err.message.includes('Erreur serveur')) {
            showConfirmation({
                success: true,
                booking: {
                    service: rdvData.service,
                    date: rdvData.slot.day + ' ' + formatDateFR(rdvData.slot.date),
                    time: rdvData.slot.time + ' - ' + (parseInt(rdvData.slot.time) + 1) + ':00',
                    mode: rdvData.mode === 'visio' ? 'Visioconference' : 'En cabinet',
                },
            });
            if (typeof showToast === 'function') {
                showToast('Mode demonstration — La reservation sera effective une fois l\'API configuree.');
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('Erreur: ' + err.message);
            }
            if (btn) {
                btn.innerHTML = 'Confirmer mon rendez-vous <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
                btn.style.opacity = '1';
                btn.disabled = false;
            }
        }
    }
}

function showConfirmation(result) {
    ['rdvStep1', 'rdvStep2', 'rdvStep3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const conf = document.getElementById('rdvConfirmation');
    if (conf) {
        conf.style.display = 'block';
        conf.classList.add('panel-enter');
    }

    // Afficher les details
    const details = document.getElementById('rdvConfirmDetails');
    if (details && result.booking) {
        details.innerHTML =
            '<p><strong>' + result.booking.service + '</strong></p>'
            + '<p>' + result.booking.date + ' de ' + result.booking.time + '</p>'
            + '<p>' + result.booking.mode + '</p>';
    }

    // Marquer toutes les etapes comme completees
    document.querySelectorAll('.rdv-step').forEach(s => {
        s.classList.remove('active');
        s.classList.add('completed');
    });
    document.querySelectorAll('.rdv-step-connector').forEach(conn => {
        conn.style.background = 'var(--orange)';
    });
}
