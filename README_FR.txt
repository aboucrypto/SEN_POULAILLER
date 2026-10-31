SADIKH SERVICES – GESTION POULAILLER
Version de préparation : PWA installable, saisie hors connexion et synchronisation Supabase.

CONTENU
- index.html : interface de l'application
- styles.css : affichage téléphone et ordinateur
- app.js : formulaires, stockage local, impression, export CSV et synchronisation
- sw.js : cache hors connexion
- manifest.webmanifest : installation comme application
- supabase_schema.sql : table et règles RLS à créer dans le nouveau projet Supabase
- assets/logo.jpg : logo fourni

INSTALLATION / TEST
1. Déployer tout le contenu de ce dossier sur un hébergement HTTPS (par exemple un nouveau site Netlify).
2. Ouvrir l'adresse du site dans Chrome sur Android.
3. Menu Chrome > Installer l'application ou Ajouter à l'écran d'accueil.
4. Ouvrir le menu Supabase dans l'application.
5. Saisir l'URL du projet SEN POULAILLER et la clé publique anon/publishable.
6. Dans Supabase > SQL Editor, exécuter supabase_schema.sql dans le NOUVEAU projet uniquement.
7. Dans l'application > Supabase, créer un compte ou se connecter.
8. Enregistrer des données : elles sont conservées localement et le bouton Synchroniser les envoie au cloud lorsque la connexion est disponible.

IMPORTANT
- Ce paquet est une application Web installable (PWA), pas encore un APK natif signé.
- Le premier chargement et la configuration Supabase nécessitent Internet.
- Le stockage hors connexion est local à chaque appareil. Pour partager les données entre appareils, chaque appareil doit se connecter au même projet et synchroniser.
- La synchronisation envoie les enregistrements locaux en attente vers Supabase puis récupère les enregistrements du compte connecté. Les conflits de modification simultanée du même enregistrement ne sont pas encore gérés : éviter de modifier la même fiche sur deux appareils en même temps.
- Les reçus et rapports s'impriment via la boîte d'impression du navigateur.
- Ne jamais saisir la clé service_role dans l'application. Utiliser uniquement la clé publique et garder RLS activé.
- Les données de l'ancien projet Poulailler QR ne sont pas modifiées.
