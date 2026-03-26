<?php
/**
 * Configuration du systeme de prise de RDV — AXE Expertise
 *
 * INSTRUCTIONS DE CONFIGURATION :
 * ================================
 * 1. Aller sur https://entra.microsoft.com (Azure AD)
 * 2. "Inscriptions d'applications" > "Nouvelle inscription"
 *    - Nom : "AXE Expertise RDV"
 *    - Type de compte : "Comptes dans cet annuaire uniquement"
 * 3. Apres creation, copier :
 *    - ID d'application (client) → MICROSOFT_CLIENT_ID
 *    - ID de l'annuaire (locataire) → MICROSOFT_TENANT_ID
 * 4. "Certificats & secrets" > "Nouveau secret client" → MICROSOFT_CLIENT_SECRET
 * 5. "Autorisations API" > "Ajouter une autorisation" > "Microsoft Graph" :
 *    - Autorisations d'application (PAS deleguees) :
 *      • Calendars.ReadWrite
 *      • User.Read.All
 *    - Cliquer "Accorder le consentement de l'administrateur"
 */

// === MICROSOFT GRAPH API ===
define('MICROSOFT_TENANT_ID',     'VOTRE_TENANT_ID');
define('MICROSOFT_CLIENT_ID',     'VOTRE_CLIENT_ID');
define('MICROSOFT_CLIENT_SECRET', 'VOTRE_CLIENT_SECRET');

// === MAPPING SERVICE → EMPLOYES ===
// Chaque service est associe a un ou plusieurs salaries (emails Outlook 365)
// Le systeme verifiera la disponibilite de TOUS les salaries du service
// et proposera les creneaux ou au moins un salarie est libre.
define('SERVICE_EMPLOYEES', json_encode([
    'Juridique' => [
        'collaborateur.juridique@axe-expertise.fr',
    ],
    'Social' => [
        'collaborateur.social1@axe-expertise.fr',
        'collaborateur.social2@axe-expertise.fr',
    ],
    'Comptabilite' => [
        'collaborateur.compta1@axe-expertise.fr',
        'collaborateur.compta2@axe-expertise.fr',
    ],
    'Fiscalite' => [
        'collaborateur.compta1@axe-expertise.fr',
        'collaborateur.compta2@axe-expertise.fr',
    ],
    'Creation' => [
        'collaborateur.juridique@axe-expertise.fr',
    ],
    'Autre' => [
        'contact@axe-expertise.fr',
    ],
]));

// === PARAMETRES RDV ===
define('RDV_DURATION_MINUTES', 60);       // Duree d'un RDV en minutes
define('RDV_START_HOUR', 9);              // Heure de debut (9h)
define('RDV_END_HOUR', 18);              // Heure de fin (18h)
define('RDV_LUNCH_START', 12);           // Debut pause dejeuner
define('RDV_LUNCH_END', 14);             // Fin pause dejeuner
define('RDV_WEEKS_AHEAD', 3);            // Nombre de semaines affichees
define('RDV_TIMEZONE', 'Europe/Paris');

// === EMAIL DE NOTIFICATION ===
define('NOTIFICATION_EMAIL', 'contact@axe-expertise.fr');

// === SECURITE ===
// Cle secrete pour les requetes API (protection anti-spam basique)
define('API_SECRET', bin2hex(random_bytes(16)));

// CORS — domaines autorises
define('ALLOWED_ORIGINS', json_encode([
    'https://www.axe-expertise.fr',
    'https://axe-expertise.fr',
    'http://localhost',
]));
