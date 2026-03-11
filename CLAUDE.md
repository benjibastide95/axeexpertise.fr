# AXE Expertise & Associes — Instructions pour Claude

## Projet
Site internet vitrine du cabinet d'expertise comptable **AXE Expertise & Associes**, base a Paris.
- **URL de production :** https://www.axe-expertise.fr
- **Repo GitHub :** https://github.com/benjibastide95/axeexpertise.fr
- **Type :** Site statique HTML/CSS/JS (pas de framework, pas de build)

## Architecture du Site

```
/
├── index.html                  # Page d'accueil (hero, services, temoignages, FAQ, contact)
├── 404.html                    # Page d'erreur 404
├── robots.txt                  # Directives SEO
├── sitemap.xml                 # Plan du site (16 URLs)
├── assets/
│   ├── css/style.css           # Feuille de style unique (~65KB)
│   ├── js/script.js            # Script principal (~537 lignes)
│   └── img/logo-axe.png        # Logo du cabinet
└── pages/
    ├── services.html           # Vue d'ensemble des 4 poles
    ├── comptabilite.html       # Detail pole comptable
    ├── social.html             # Detail pole social & paie
    ├── juridique.html          # Detail pole juridique
    ├── creation-entreprise.html # Detail creation d'entreprise
    ├── equipe.html             # Presentation de l'equipe (7 membres)
    ├── blog.html               # Liste des articles
    ├── blog/                   # Articles de blog individuels
    │   ├── loi-finances-2025.html
    │   ├── facturation-electronique-2026.html
    │   └── creer-son-entreprise-guide.html
    ├── rdv.html                # Systeme de prise de RDV (3 etapes)
    ├── simulation.html         # Simulateur d'honoraires
    ├── espace-client.html      # Portail client (login)
    ├── mentions.html           # Mentions legales
    └── confidentialite.html    # Politique de confidentialite RGPD
```

## Stack Technique

- **HTML5** semantique avec accessibilite (ARIA, skip-to-content)
- **CSS3** avec variables CSS (custom properties) — pas de preprocesseur
- **JavaScript** vanilla (ES6+) — pas de framework/librairie
- **Fonts :** Google Fonts (Montserrat pour les titres, Open Sans pour le corps)
- **Icones :** SVG inline (pas de librairie d'icones)
- **SEO :** Schema.org JSON-LD, Open Graph, meta descriptions, sitemap XML

## Design & Charte Graphique

### Couleurs (variables CSS)
- `--navy` : Bleu marine fonce (couleur principale)
- `--navy-light` : Bleu marine clair
- `--orange` : Orange (couleur d'accent, CTA, badges)
- `--blue-accent` : Bleu accent
- `--bg-light` : Fond clair des sections alternees
- `--text-primary` / `--text-secondary` : Couleurs de texte

### Typographie
- **Titres :** Montserrat (600-900 weight)
- **Corps :** Open Sans (400-600 weight)

### Composants Recurrents
- `.service-card` : Carte de service avec badge colore, icone SVG, titre, description, lien
- `.fade-up` : Classe d'animation au scroll (Intersection Observer)
- `.section-header` + `.section-title` + `.section-subtitle` : En-tete de section standard
- `.submit-btn` / `.hero-cta` : Boutons d'action principaux
- `.faq-item` : Accordeon FAQ avec `aria-expanded`
- `.testimonial-card` : Carte de temoignage avec etoiles et avatar

## Fonctionnalites JavaScript (script.js)

1. **Transitions de page** : Overlay fade entre les pages internes (400ms)
2. **Navbar sticky** : Apparition au scroll (seuil 80px) + hamburger mobile
3. **Animations scroll** : Intersection Observer pour les elements `.fade-up`
4. **Parallaxe** : Effet sur le hero au scroll
5. **Formulaire contact** : Soumission avec spinner + toast de confirmation
6. **Prise de RDV** : Wizard 3 etapes (service > creneau > coordonnees)
7. **Simulateur** : Calcul d'honoraires selon forme juridique, CA, salaries, services
8. **FAQ accordion** : Toggle avec `aria-expanded`
9. **Cookie banner** : Gestion RGPD avec localStorage
10. **Floating CTA** : Bouton "Prendre RDV" apparait apres 600px de scroll
11. **Toast notifications** : `showToast()` pour feedback utilisateur

## Equipe du Cabinet (page equipe.html)

- Albert BASTIDE — Associe fondateur, Expert-Comptable
- Gabriel BASTIAN — Pole Juridique
- Nivart — Pole Social & Paie
- Sumeye — Pole Comptabilite
- Sevim — Pole Comptabilite
- Ibra — Pole Social & Paie
- Fatiha — Pole Comptabilite

## Regles de Developpement

### Standards
- **Langue du contenu** : Francais (lang="fr")
- **Accessibilite** : Toujours inclure les attributs ARIA, alt text, roles semantiques
- **SEO** : Maintenir les balises meta, Schema.org, et le sitemap a jour
- **Responsive** : Tester mobile (< 768px), tablette, desktop
- **Performance** : Pas de librairies externes inutiles, SVG inline, images optimisees

### Conventions de Code
- Indentation : 4 espaces
- Commentaires en francais pour le HTML, anglais acceptable pour le JS
- Nommage CSS : kebab-case (`.service-card`, `.hero-content`)
- Nommage JS : camelCase (`toggleMenu`, `handleContactSubmit`)

### Workflow Git
- Commits en **Conventional Commits** : `feat:`, `fix:`, `docs:`, `refactor:`
- Branche principale : `master`
- Creer une branche pour les modifications importantes

### Ce qu'il ne faut PAS faire
- Ne pas ajouter de framework JS (React, Vue, etc.)
- Ne pas ajouter de preprocesseur CSS (Sass, Less)
- Ne pas modifier la structure des URLs (impact SEO)
- Ne pas supprimer les balises Schema.org ou Open Graph
- Ne pas mettre de secrets ou donnees sensibles dans le code

## Taches Courantes

### Ajouter un article de blog
1. Creer `pages/blog/nom-article.html` en suivant le template des articles existants
2. Ajouter l'article dans la liste de `pages/blog.html`
3. Mettre a jour la section "Actualites" de `index.html` si pertinent
4. Ajouter l'URL dans `sitemap.xml`

### Modifier un service
1. Modifier la carte dans `pages/services.html`
2. Modifier la page de detail correspondante (`pages/comptabilite.html`, etc.)
3. Verifier la coherence avec `index.html` (section services)

### Ajouter un membre d'equipe
1. Ajouter une carte dans `pages/equipe.html` en suivant le format existant

### Modifier les informations de contact
1. Mettre a jour dans `index.html` (footer + formulaire)
2. Mettre a jour dans `pages/mentions.html`
3. Mettre a jour le Schema.org JSON-LD dans `index.html`
