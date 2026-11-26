# Checklist de mise en ligne (cochez au fur et à mesure)

## Préparation
- [ ] Comptes créés : GitHub, Vercel, Supabase (plan Pro), KPrimePay, boîte d'envoi (Gmail + mot de passe d'application)
- [ ] Noms de domaine et accès DNS prêts (si domaine personnalisé)

## Supabase
- [ ] Projet créé, mot de passe de base de données conservé
- [ ] `01-installation-nouvelle-base.sql` exécuté sans erreur (ou migrations si base existante)
- [ ] 11 tables présentes + bucket `avatars`
- [ ] Anonymous sign-ins ACTIVÉ ; Confirm email ACTIVÉ ; mot de passe minimum 8
- [ ] Site URL et Redirect URLs = adresse du site
- [ ] Modèle « Reset password » contient `{{ .Token }}`
- [ ] SMTP personnalisé actif ; CAPTCHA actif
- [ ] 8 fonctions déployées ; `kprimepay-webhook` SANS Verify JWT, les 7 autres AVEC
- [ ] Tous les secrets saisis ; `preflight.js` sans FAIL
- [ ] 3 tests de fumée (guide, section 6) conformes

## Site
- [ ] `config.js` rempli (URL + clé anon, jamais la clé service_role) ; `preflight.js` sans FAIL
- [ ] Fichiers à la racine du dépôt GitHub ; déploiement Vercel réussi ; domaine branché
- [ ] Le site s'ouvre : démarrage 2 s, bienvenue 1 s, page d'introduction, bouton Continuer

## KPrimePay
- [ ] Clé de TEST + mode 1 ; adresse de webhook enregistrée avec le jeton
- [ ] Carte en USD (Visa, Mastercard, Amex) confirmée ; comportement des relances webhook demandé
- [ ] Paiement test réussi, abonnement activé

## Administrateur
- [ ] Compte créé, ligne ajoutée dans `admins`, double authentification activée
- [ ] Console : tableau de bord, vérification, prestataires, remise à zéro, suppression/bannissement testés

## Tests d'acceptation (clé de test)
- [ ] Client sans compte : villes, domaines, favoris (5 max), signalement reçu par e-mail
- [ ] Prestataire : inscription, 24 h gratuites, validation, visibilité, flou après expiration, paiement, abonnement non résiliable
- [ ] 3 erreurs de mot de passe : blocage 5 minutes avec compte à rebours ; 3 de plus : suppression ; autre e-mail OK
- [ ] Déconnexion automatique du prestataire à la date anniversaire mensuelle
- [ ] E-mail de réinitialisation avec code à 6 chiffres reçu et accepté
- [ ] Politique de confidentialité, cookies et conditions affichées ; relues par un juriste

## Passage en réel
- [ ] Clé `kpp_lk_` + `KPRIMEPAY_MODE=2` ; données de test supprimées
- [ ] Un vrai paiement minimal effectué avec votre carte et vérifié
- [ ] Sauvegardes Supabase actives ; alertes de journaux consultées
