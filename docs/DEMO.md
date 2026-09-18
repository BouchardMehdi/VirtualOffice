# Présenter VirtualOffice

Le prototype se présente en environ cinq minutes avec trois onglets d'un même
navigateur. Chaque onglet conserve son compte. Utiliser des onglets ouverts
depuis le bouton « + », puis saisir l'adresse ; un onglet dupliqué peut hériter
de la session de celui d'origine.

## Avant la présentation

1. Démarrer Docker Desktop.
2. À la racine du projet : `npm run setup`, puis
   `docker compose up --build -d --wait`.
3. Vérifier `docker compose ps` : les trois services doivent être `healthy`.
4. Ouvrir http://localhost:5173 dans trois onglets. Prévoir Alice, Thomas et Julie.
   Les emails sont `alice@virtualoffice.test`, `thomas@virtualoffice.test` et
   `julie@virtualoffice.test`. Mot de passe initial : `VirtualOffice2026!`, sauf
   personnalisation de `DEMO_PASSWORD` avant la création des comptes.
5. Faire les vérifications complètes avant la présentation avec `npm run verify`.
   Installer les dépendances avec `npm install` et Chromium avec
   `npm exec --workspace @virtualoffice/client -- playwright install chromium`
   si nécessaire. Les ports de test 4001 et 5174 doivent être libres.

Les tests utilisent la base locale et les comptes existants. Ils n'effacent
ni les comptes ni le volume PostgreSQL. Leur bureau est séparé de celui de la démo.

## Parcours de présentation

| Moment | Action | Résultat à montrer |
| --- | --- | --- |
| 0:00 | Connecter Alice. | Arrivée dans l'espace détente, nom visible et avatar animé. |
| 0:30 | Utiliser ZQSD ou les flèches, heurter un meuble et longer un mur. | Déplacement fluide et obstacles solides. |
| 1:00 | Appuyer sur F dans le bureau, puis Échap. | Plein écran avec le chat et retour à l'affichage normal. |
| 1:30 | Revenir près du point de départ et connecter Thomas dans le deuxième onglet. | Deux avatars et ouverture automatique du chat. |
| 2:00 | Envoyer un message depuis Alice, répondre depuis Thomas. | Réception en temps réel, noms et heures ; la saisie ne déplace pas l'avatar. |
| 2:30 | Avec Thomas, descendre vers le bas de la détente, puis revenir près d'Alice. | Le chat se ferme à distance, puis l'historique à deux réapparaît. |
| 3:00 | Connecter Julie dans le troisième onglet, près des deux autres. | Annonce d'arrivée et conversation à trois ; les messages privés précédents n'y figurent pas. |
| 3:30 | Envoyer un message à trois, puis déconnecter Julie. | Annonce de départ et retour à l'historique à deux. Le message à trois reste dans son groupe. |
| 4:00 | Franchir une porte avec Alice, montrer l'open space et la salle de réunion. | Les portes sont ouvertes et le nom du lieu change. |
| 4:30 | Déconnecter Thomas. | Son avatar disparaît et le compteur baisse. |

Un clic dans la carte lui donne le focus clavier. Après un changement d'onglet,
cliquer dans le bureau avant de déplacer l'avatar. **Tab** permet d'en sortir.
Pour retrouver l'historique après séparation, conserver les mêmes onglets sans
les recharger et se rapprocher dans les cinq minutes.

## Points à expliquer

- La zone d'un groupe réunit les zones de ses participants : un groupe peut
  former une chaîne. Les murs coupent la proximité directe, les meubles non.
- Les messages sont envoyés uniquement aux membres du groupe concerné. Une
  composition différente possède un historique distinct.
- Les messages restent en mémoire serveur et sont supprimés cinq minutes après
  l'inactivité du groupe. Un groupe actif ne disparaît pas après cinq minutes.
- Un rafraîchissement ou une reconnexion crée une nouvelle présence ; un
  redémarrage du backend efface tous les historiques temporaires.
- Il s'agit d'une démo desktop sur une carte de test : pas d'audio, de vidéo,
  d'inscription, d'édition de carte ou de garantie de charge à 50 utilisateurs.
- Les vérifications navigateur automatisées utilisent Chromium. Elles ne
  constituent pas une certification pour tous les navigateurs ou appareils.

## En cas de problème

| Symptôme | Action |
| --- | --- |
| Les anciens graphismes s'affichent. | Après reconstruction Docker, actualiser avec Ctrl + F5. |
| L'avatar ne bouge pas. | Cliquer dans la carte ; vérifier que le bureau est connecté et que le chat n'a pas le focus. |
| Le même compte apparaît dans deux onglets. | Se déconnecter dans l'onglet à changer, puis choisir le bon compte. |
| « Connexion interrompue ». | Vérifier `docker compose ps`, puis cliquer sur Réessayer. |
| Un service est arrêté. | Relancer `docker compose up -d --wait` ; consulter `docker compose logs --tail 50` si nécessaire. |
| Docker affiche `invalid file request Dockerfile` dans OneDrive. | Lancer `npm run demo:start` pour construire depuis une copie temporaire des sources et démarrer la démo. Node.js et Git sont nécessaires. |
| Le chat est désactivé. | Se rapprocher d'un collègue sans mur entre les avatars et vérifier la connexion. |
| La session a expiré. | Se reconnecter ; les sessions durent 12 heures par défaut. Modifier `JWT_TTL_HOURS` dans `.env`, relancer les services et se reconnecter pour appliquer une autre durée. |
| Le port PostgreSQL est occupé. | Suivre la configuration `POSTGRES_PORT` et `DATABASE_URL` du README. |

Pour arrêter : `docker compose down`. Cette commande conserve les données.
Éviter l'option `-v`, qui supprimerait le volume de la base.
