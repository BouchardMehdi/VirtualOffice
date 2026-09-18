# Validation de la partie 6

Campagne terminée le 18 septembre 2026 sur Windows, Docker Desktop et Chromium.

| Contrôle | Résultat |
| --- | --- |
| TypeScript client et serveur | Réussi |
| Validation du schéma Prisma | Réussie |
| Tests serveur : authentification, déplacements, proximité et chat | 25 réussis |
| Tests navigateur : bureau, sessions, chat, erreurs et plein écran | 15 réussis |
| Compilation client et serveur | Réussie |
| Configuration Docker Compose | Valide |
| Construction et lancement avec `npm run demo:start` | Trois services sains |
| Coupure réelle de PostgreSQL | Health et login renvoient HTTP 503 |
| Reprise de PostgreSQL | API et proxy en HTTP 200 ; les quatre comptes restent identiques et connectables |
| Contrôle navigateur sur la démo Docker, port 5173 | Connexion, carte, socket, plein écran et déconnexion réussis ; aucune erreur JavaScript |

`npm run verify` a exécuté la suite complète et les compilations avec succès.
Après la correction du panneau de chat sur fenêtre étroite, les deux scénarios
concernés (tailles d'écran et chat en plein écran) ont été rejoués avec succès,
puis les images Docker ont été reconstruites avec le code final.

Les tests vérifient notamment deux comptes dans les onglets d'un même navigateur,
deux groupes distincts dans quatre onglets sans échange de messages entre groupes,
les annonces d'arrivée et de départ, et les historiques distincts selon les membres.
Les tailles de fenêtre contrôlées sont 1920 × 1080, 1280 × 720 et 800 × 700.
Les captures du bureau étroit et du chat en plein écran ont été examinées.

La rétention de cinq minutes est testée avec une horloge contrôlée côté serveur.
Le test d'expiration côté interface accélère le délai annoncé ; les tests serveur
vérifient séparément les JWT expirés et la déconnexion à leur expiration réelle.

La construction directe depuis OneDrive a rencontré `invalid file request Dockerfile`.
`npm run demo:start` a permis de construire depuis une copie temporaire des sources,
puis de lancer les mêmes services avec la configuration du dépôt.
Vite signale toujours la taille du module Phaser supérieure à 500 ko ; la compilation réussit.

Les vérifications navigateur portent sur Chromium et sur une démo locale, sans
test de charge à 50 utilisateurs ni validation exhaustive de tous les navigateurs.
Les captures et traces se trouvent dans `client/test-results/`, ignoré par Git.
