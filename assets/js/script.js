/* ========================================
   PAGE TRANSITION SYSTEM
   ======================================== */
(function () {
    const overlay = document.getElementById('pageTransition');
    if (!overlay) return;

    // On page load: ensure overlay is hidden
    window.addEventListener('load', () => {
        overlay.classList.remove('active');
    });

    // Fix browser back/forward button (bfcache)
    window.addEventListener('pageshow', (e) => {
        if (overlay) overlay.classList.remove('active');
    });

    // Intercept all internal links for smooth page transition
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Only intercept local .html links
        if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        if (!href.endsWith('.html')) return;

        // Don't transition to same page
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (href === currentPage) return;

        e.preventDefault();

        overlay.classList.add('active');

        setTimeout(() => {
            window.location.href = href;
        }, 400);
    });
})();

/* ========================================
   NAVIGATION & UI
   ======================================== */
const navbar = document.getElementById('navbar');
let lastScrollY = 0;

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    if (navbar) {
        navbar.classList.toggle('scrolled', scrollY > 80);
    }

    // Back to top button
    const btn = document.getElementById('backToTop');
    if (btn) {
        btn.classList.toggle('visible', scrollY > 400);
    }

    lastScrollY = scrollY;
}, { passive: true });

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Close mobile menu when clicking outside or on a link
document.addEventListener('click', (e) => {
    const navLinks = document.querySelector('.nav-links');
    const hamburger = document.querySelector('.hamburger');

    if (navLinks && navLinks.classList.contains('open')) {
        if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
            navLinks.classList.remove('open');
            if (hamburger) hamburger.classList.remove('active');
        }
        if (e.target.closest('.nav-links a')) {
            navLinks.classList.remove('open');
            if (hamburger) hamburger.classList.remove('active');
        }
    }
});

// Highlight active link
function highlightCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '') || 'index';

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href && !link.classList.contains('nav-btn')) {
            if (href === path || href.includes(page + '.html') || (page === 'index' && href === 'index.html')) {
                link.classList.add('active');
            }
        }
    });
}

/* ========================================
   SCROLL REVEAL ANIMATIONS
   ======================================== */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.06,
        rootMargin: '0px 0px -60px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                entry.target.classList.add('revealed');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-up, .reveal').forEach(el => {
        observer.observe(el);
    });
}

/* ========================================
   SMOOTH PARALLAX (subtle)
   ======================================== */
function initParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const heroContent = hero.querySelector('.hero-content');
    if (!heroContent) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                const heroHeight = hero.offsetHeight;

                if (scrollY < heroHeight) {
                    const progress = scrollY / heroHeight;
                    heroContent.style.transform = `translateY(${scrollY * 0.15}px)`;
                    heroContent.style.opacity = 1 - progress * 0.6;
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

/* ========================================
   CONTACT FORM
   ======================================== */
function handleContactSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('.submit-btn') || e.target.querySelector('button[type="submit"]');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;">Envoi en cours... <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite;"><circle cx="12" cy="12" r="10" stroke-dasharray="30 60"/></svg></span>';
        btn.style.opacity = '0.7';
        btn.disabled = true;

        setTimeout(() => {
            showToast('Message envoye avec succes. Nous vous repondrons sous 24h.');
            e.target.reset();
            btn.innerHTML = originalText;
            btn.style.opacity = '1';
            btn.disabled = false;
        }, 1200);
    }
}

/* ========================================
   CLIENT LOGIN
   ======================================== */
function handleClientLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('.submit-btn');
    if (btn) {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = 'Connexion en cours...';
        btn.style.opacity = '0.7';
        btn.disabled = true;

        setTimeout(() => {
            showToast('Espace client en cours de mise en place. Revenez bientot.');
            btn.innerHTML = originalHTML;
            btn.style.opacity = '1';
            btn.disabled = false;
        }, 1200);
    }
}

/* ========================================
   RDV SYSTEM
   Le systeme RDV est maintenant dans rdv.js
   Les fonctions ci-dessous sont des fallbacks
   au cas ou rdv.js n'est pas charge (pages hors rdv.html)
   ======================================== */
if (typeof selectService === 'undefined') {
    function selectService() {}
    function goToRdvStep() {}
    function submitRdv(e) { e.preventDefault(); }
}

/* ========================================
   TOAST NOTIFICATION
   ======================================== */
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.remove('visible');
    void toast.offsetHeight;
    toast.classList.add('visible');

    clearTimeout(toast._hideTimeout);
    toast._hideTimeout = setTimeout(() => {
        toast.classList.remove('visible');
    }, 3500);
}

/* ========================================
   CSS ANIMATION KEYFRAMES (injected)
   ======================================== */
const styleEl = document.createElement('style');
styleEl.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    @keyframes pulseOnce {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(styleEl);

/* ========================================
   FEE SIMULATION CALCULATOR
   ======================================== */
function calculateSimulation(e) {
    e.preventDefault();

    const statut = document.getElementById('simStatut').value;
    const ca = document.getElementById('simCA').value;
    const salaries = document.getElementById('simSalaries').value;
    const services = document.getElementById('simServices').value;

    if (!statut || !ca) return;

    // Base price by legal structure (monthly HT)
    const basePrices = {
        'auto': 69,
        'eurl': 150,
        'sas': 180,
        'sci': 120,
        'asso': 110
    };

    // Revenue multiplier
    const caMultipliers = {
        '50k': 1,
        '150k': 1.4,
        '500k': 1.9,
        '1m': 2.5,
        '1m+': 3.2
    };

    // Employee surcharge
    const salariesExtra = {
        '0': 0,
        '5': 80,
        '20': 220,
        '50': 450,
        '50+': 750
    };

    // Service multiplier
    const serviceMultipliers = {
        'compta': 1,
        'compta-social': 1.35,
        'compta-juridique': 1.3,
        'integral': 1.6
    };

    let price = basePrices[statut] || 150;
    price *= caMultipliers[ca] || 1;
    price += salariesExtra[salaries] || 0;
    price *= serviceMultipliers[services] || 1;

    // Round to nearest 10
    price = Math.round(price / 10) * 10;

    // Display low-high range
    const low = Math.round(price * 0.85 / 10) * 10;
    const high = Math.round(price * 1.15 / 10) * 10;

    document.getElementById('simPrice').textContent = low + ' \u20AC - ' + high + ' \u20AC';

    const resultEl = document.getElementById('simResult');
    resultEl.classList.add('visible');
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ========================================
   FAQ ACCORDION
   ======================================== */
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const isOpen = item.classList.contains('open');

            // Close all
            document.querySelectorAll('.faq-item.open').forEach(openItem => {
                openItem.classList.remove('open');
                openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });

            // Toggle current
            if (!isOpen) {
                item.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

/* ========================================
   COOKIE BANNER (RGPD)
   ======================================== */
function initCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    if (!banner) return;

    if (!localStorage.getItem('axe_cookies_consent')) {
        setTimeout(() => {
            banner.classList.add('visible');
        }, 1500);
    }
}

function acceptCookies() {
    localStorage.setItem('axe_cookies_consent', 'accepted');
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.classList.remove('visible');
}

function declineCookies() {
    localStorage.setItem('axe_cookies_consent', 'declined');
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.classList.remove('visible');
}

/* ========================================
   FLOATING CTA
   ======================================== */
function initFloatingCta() {
    const cta = document.getElementById('floatingCta');
    if (!cta) return;

    window.addEventListener('scroll', () => {
        cta.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
}

/* ========================================
   HAMBURGER ARIA
   ======================================== */
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    const hamburger = document.querySelector('.hamburger');
    if (navLinks) {
        const isOpen = navLinks.classList.toggle('open');
        if (hamburger) {
            hamburger.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            hamburger.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
        }
    }
}

/* ========================================
   INIT
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    highlightCurrentPage();
    initParallax();
    initFAQ();
    initCookieBanner();
    initFloatingCta();
});
