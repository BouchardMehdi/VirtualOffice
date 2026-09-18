# VirtualOffice

VirtualOffice est un prototype scolaire de bureau virtuel 2D : se connecter,
retrouver ses collègues, se déplacer et discuter en s'approchant d'un groupe.

**Les parties 1 à 6 sont implémentées** : socle Docker, base PostgreSQL,
authentification, bureau 2D multijoueur et chat textuel de proximité sur une carte
de test, puis finitions et validation de la démo. Le nom du projet est **VirtualOffice**.

## Périmètre de la V1

Une seule carte créée par l'équipe avec Tiled, des déplacements ZQSD/flèches,
des collisions, la présence en temps réel et un chat textuel de proximité en groupe.
Les comptes sont prédéfinis ; USER et ADMIN ont les mêmes droits dans cette V1.

L'inscription, l'audio, la vidéo, l'édition de carte par l'admin et l'historique
permanent des messages sont hors périmètre.

## Stack

- Client : React, TypeScript, Vite, React Router et Phaser 3.90.
- Serveur : Node.js, Express, TypeScript, JWT et bcrypt.
- Base de données : PostgreSQL 17 et Prisma 7.
- Environnement local : Docker et Docker Compose.
- Carte : format JSON Tiled avec tileset intégré.
- Temps réel : Socket.IO 4 pour la présence et les déplacements.

## Démarrage

Prérequis : Docker Desktop démarré avec les conteneurs Linux. Les ports 5173 et
4000 doivent être libres. Le port PostgreSQL publié est configurable.

Depuis la racine, préparer `.env` avec Node.js (aucune installation npm nécessaire) :

```sh
npm run setup
```

Le script crée `.env` si nécessaire, génère un secret JWT aléatoire et ajoute le
mot de passe de démonstration. Les valeurs déjà renseignées sont conservées,
notamment le port PostgreSQL choisi en partie 1. Cette commande met aussi à jour
une installation existante de la partie 1.

Sans Node.js installé, exécuter le même script avec Docker, depuis PowerShell,
bash ou zsh :

```sh
docker run --rm -v "${PWD}:/workspace" -w /workspace node:22-bookworm-slim node scripts/setup-env.mjs
```

Puis lancer les services :

```sh
docker compose up --build
```

- Connexion : http://localhost:5173/login
- Espace protégé : http://localhost:5173/workspace
- Contrôle de l'API et de PostgreSQL : http://localhost:4000/api/health

Le backend applique les migrations puis exécute le seed avant de démarrer.
Compose attend que PostgreSQL soit prêt, puis que le backend soit prêt, avant
de lancer l'interface. Les ports sont accessibles uniquement sur la machine locale.
Le client utilise Vite pour cette démonstration, sans infrastructure de production.

```sh
docker compose ps
docker compose logs -f
docker compose down
```

`docker compose down` conserve les données dans le volume `postgres_data`.
Après une modification du code, relancer `docker compose up --build`.

Si Docker renvoie `invalid file request Dockerfile` dans un dossier OneDrive,
utiliser `npm run demo:start` (Node.js et Git nécessaires). Cette commande copie
les sources courantes dans un dossier temporaire hors du dépôt, construit les
images puis lance les mêmes services Compose. Les fichiers `.env` ne sont pas
copiés ; Compose utilise la configuration du dépôt. La copie est nettoyée à la fin.

## Comptes de démonstration

Mot de passe initial commun : **`VirtualOffice2026!`** (`DEMO_PASSWORD` dans
`.env.example`). Ces identifiants sont publics et réservés à la démo locale.
Si cette variable est personnalisée avant le premier seed, utiliser sa valeur.

| Utilisateur | Email | Rôle |
| --- | --- | --- |
| Alice Martin | `alice@virtualoffice.test` | USER |
| Thomas Bernard | `thomas@virtualoffice.test` | USER |
| Julie Dupont | `julie@virtualoffice.test` | USER |
| Emma Leroy | `emma@virtualoffice.test` | USER |
| Paul Admin | `admin@virtualoffice.test` | ADMIN |

Le seed ajoute uniquement les comptes absents. Il ne réinitialise ni les mots
de passe ni les autres informations des comptes existants. Modifier
`DEMO_PASSWORD` après leur création ne change donc pas les mots de passe en base.

## Authentification

- `POST /api/auth/login` reçoit un email et un mot de passe. Il renvoie `token`,
  `expiresAt` (date d'expiration en millisecondes Unix) et le profil public `user`.
- `GET /api/auth/me` attend `Authorization: Bearer <token>` et renvoie le profil
  public lu en base ainsi que `expiresAt`.
- Les mots de passe sont hashés avec bcrypt. Les hashes ne sont jamais renvoyés.
- Les JWT expirent après une heure. Le serveur vérifie leur signature, leur
  algorithme, leur émetteur, leur audience et leur expiration, puis retrouve
  l'utilisateur en base. Le client ne choisit pas son identité ou son rôle.
- Le JWT est stocké dans `sessionStorage`, par onglet. Le client vérifie `/me`
  après un rafraîchissement et bloque l'espace tant que la session n'est pas
  validée. La déconnexion et l'expiration effacent la session de l'onglet.
- Pour tester plusieurs comptes, ouvrir des onglets séparés. Un onglet dupliqué
  peut hériter de la session initiale ; se déconnecter dans cet onglet permet de
  choisir un autre compte.
- Les erreurs d'identifiants et de connexion sont affichées dans l'interface.
  Une panne pendant la restauration d'une session permet de réessayer.

Pour ce POC, il n'y a ni renouvellement automatique ni liste de révocation des
JWT : un jeton copié avant la déconnexion reste valide jusqu'à son expiration.
Le stockage par onglet est accessible au JavaScript de l'application.
Il n'existe pas de route ni de page d'inscription.

La limite des mots de passe respecte les
[72 octets traités par bcrypt](https://github.com/kelektiv/node.bcrypt.js/).
La vérification des JWT utilise les options de
[jsonwebtoken](https://github.com/auth0/node-jsonwebtoken).

## Bureau 2D — partie 3

Après connexion à `/workspace`, le personnage apparaît dans l'espace
détente avec le prénom et le nom du compte. La carte contient aussi un open space
et une salle de réunion. Les sols, murs, portes, meubles et décorations utilisent
le nouveau pack fourni. Le personnage 32 × 48 est animé dans les quatre directions ;
un repère vert à ses pieds permet d'identifier son propre avatar.

- Déplacement : **ZQSD** ou **flèches directionnelles**.
- Cliquer dans le bureau pour lui donner le focus ; **Tab** permet d'en sortir.
- Le bouton **Plein écran** agrandit le bureau en conservant les commandes visibles ;
  il devient **Quitter le plein écran**. Avec le focus dans le bureau, **F** bascule
  entre les deux modes et **Échap** quitte le plein écran. Ces raccourcis ignorent
  les champs de saisie. Le bouton est désactivé si le navigateur ne permet pas
  le plein écran ([API Fullscreen](https://fullscreen.spec.whatwg.org/)).
- Les murs et le mobilier bloquent le joueur. Les portes ouvertes laissent
  passer. La vitesse est identique en ligne droite et en diagonale.
- Les touches n'agissent plus sur l'avatar lorsqu'un autre élément a le focus,
  lorsque la fenêtre perd le focus ou lorsque l'onglet devient masqué.
- Le lieu affiché change avec la pièce. Le canvas s'adapte à son espace
  d'affichage ; la cible reste l'ordinateur avec clavier.
- Un échec de chargement de la carte ou de son image permet de réessayer.
- Phaser est chargé à l'entrée du bureau et détruit à la déconnexion. Un
  rafraîchissement replace l'avatar au point de départ.

Le bureau est maintenant partagé en temps réel (partie 4 ci-dessous).
Le panneau de chat permet de discuter avec les collègues à proximité (partie 5).

### Assets et carte Tiled

- Carte de test : `client/public/assets/maps/office-test.json`.
- Pack graphique (tileset, mobilier, décorations et personnage) : `client/public/assets/custom/`.
- Provenance du pack fourni : [CREDITS.md](CREDITS.md).
- Chemins de chargement et vitesse : `client/src/game/config/office.ts`.

La carte est un **exemple technique**, généré pour vérifier l'intégration.
Elle s'ouvre directement dans Tiled ; la carte finale sera réalisée par l'équipe.
`node scripts/create-test-map.mjs` régénère et **écrase `office-test.json`**.
Cette commande n'est jamais exécutée automatiquement au démarrage ou au build.

Pour remplacer cette carte dans Tiled :

1. Utiliser une carte orthogonale finie, avec une grille 32 × 32.
2. Ajouter le tileset puis l'intégrer à la carte (« Embed Tileset ») avant l'export
   JSON. Le `.tsx` fourni est une description Tiled, pas un composant React.
   Le chargeur actuel utilise un seul tileset nommé `virtualoffice_custom_tiles`.
3. Créer les calques de tuiles `Floor`, `Walls` et `Doors`, exportés en tableaux
   JSON non compressés.
4. Ajouter les rectangles non pivotés des murs et meubles solides dans le calque
   d'objets `Collision`. Les portes ouvertes ne doivent pas avoir de collision.
   Les tuiles de debug ne créent pas d'obstacle par elles-mêmes.
   Nommer les murs `wall`, ou ajouter la propriété booléenne `blocksChat = true`,
   pour bloquer aussi le chat à travers eux. Les meubles bloquent le déplacement,
   mais pas la conversation.
5. Ajouter dans le calque d'objets `Spawn` un point `spawn_lounge` dans l'espace
   détente, hors de tout obstacle.
6. Facultativement, ajouter des rectangles dans le calque d'objets `Zones`, avec
   une propriété texte `label`. Les rectangles du calque d'objets `Furniture`
   affichent les meubles du pack selon leur type : `desk`, `sofa` ou `table`.
   Leurs obstacles doivent figurer dans `Collision`. Le calque facultatif `Decor`
   affiche les types `picture`, `clock` et `plant`, sans créer d'obstacle.
7. Placer le JSON dans `public/assets/maps/`, les images dans `public/assets/custom/`
   et adapter `game/config/office.ts` si les chemins ou le nom du tileset changent.
   Le serveur lit la même carte via `server/src/realtime/map.ts` : adapter aussi
   ce chemin si le fichier est renommé, puis redémarrer/reconstruire le backend.
   La vitesse et le rayon du joueur doivent rester identiques côté client et serveur.

Les collisions sont distinctes du rendu : modifier une décoration ne modifie
pas automatiquement les obstacles. L'intégration utilise Arcade Physics et le
[chargeur de tilemaps Phaser](https://docs.phaser.io/api-documentation/class/loader-loaderplugin).

## Multijoueur — partie 4

Ouvrir deux onglets sur http://localhost:5173 et connecter **Alice** dans l'un,
**Thomas** dans l'autre. Chaque personne voit son repère et son nom en vert,
ceux des autres en bleu. Le compteur inclut sa propre présence. Les avatars ne
se bloquent pas entre eux ; les murs et meubles restent solides.

- Les arrivées, positions et départs sont partagés dans un bureau unique.
- Le JWT est envoyé dans `auth.token` à la connexion Socket.IO. Le serveur vérifie
  sa validité et retrouve le nom dans PostgreSQL ; il ne prend pas l'identité
  fournie par le navigateur. Une session expirée est déconnectée, même si le
  socket était déjà ouvert. Voir les [middlewares Socket.IO](https://socket.io/docs/v4/middlewares/).
- Une fermeture, déconnexion ou expiration retire la présence. Une coupure
  brutale est détectée par les échanges ping/pong (5 s + 5 s de délai).
- Le client affiche la perte de connexion, bloque les déplacements dès qu'il
  la détecte et réessaie automatiquement. Au retour, il reçoit la liste actuelle
  et réapparaît près du départ ; les anciennes positions ne sont pas rejouées.
- Pour cette démo, **chaque onglet représente un avatar**, même avec le même
  compte. Le compteur indique donc les sessions présentes, pas les comptes uniques.
- Les présences et positions restent en mémoire ; elles ne sont pas enregistrées
  dans PostgreSQL. Un redémarrage du backend replace tout le monde au départ.

Le mouvement local reste immédiat grâce à Phaser. Le client transmet au plus
20 positions par seconde et le serveur diffuse les changements au plus 10 fois
par seconde, en plus des arrivées/départs. Les avatars distants interpolent ces
positions. Le serveur contrôle les nombres, les limites, les murs/meubles sur le
trajet et un budget de distance à 160 px/s avec 48 px de tolérance réseau. Une
position refusée provoque une correction locale. Cela convient au POC : ce n'est
pas une simulation physique complète côté serveur, ni une protection anti-triche
de jeu compétitif.

Le contrat des événements et les distances de proximité sont dans
`server/src/realtime/protocol.ts`, partagé avec le client sans dépendance serveur.
Vite relaie `/socket.io` (HTTP et WebSocket)
vers le même backend que `/api` ; aucun port supplémentaire n'est nécessaire.
Le bureau, ses écouteurs et son socket sont détruits lorsqu'on quitte la page.

## Chat de proximité — partie 5

Le panneau à droite du bureau affiche les participants et les messages du groupe.
Il reste disponible en plein écran et passe sous la carte sur un écran étroit.
Se rapprocher d'un collègue ouvre automatiquement la conversation ; s'éloigner
de tout le groupe désactive la saisie. **Entrée** ou **Envoyer** envoie le message.
ZQSD, les flèches et F n'agissent pas sur le jeu pendant la saisie.

Un cercle discret montre le rayon de discussion autour de son avatar. Lorsqu'un
groupe est confirmé par le serveur, ses membres ont un anneau doré aux pieds et
leur propre cercle de portée. Les cercles gardent leur taille individuelle ;
les pointillés indiquent la marge de sortie à 120 px. Ces distances sont
indicatives : un mur peut toujours empêcher la discussion. Les autres groupes
ne sont pas marqués. Les repères disparaissent pendant une coupure réseau.

- Entrée à **96 px** d'au moins un participant ; un lien existant subsiste jusqu'à
  **120 px**, tant qu'aucun mur ne coupe la ligne entre les deux avatars.
- Les groupes sont les composantes connexes de ces liens : A près de B et B près
  de C forment un groupe, sans agrandir le rayon individuel.
- Le serveur calcule les groupes, vérifie l'appartenance à chaque envoi et impose
  l'auteur et l'heure. Le client ne peut pas choisir les destinataires.
- Chaque composition de groupe a son historique propre. Une arrivée, une fusion
  ou une séparation ouvre/restaure l'historique correspondant ; les anciens
  messages ne sont pas copiés vers de nouveaux participants.
- Une conversation devient inactive dès que cette composition ne forme plus un
  groupe. Son historique reste en mémoire **5 minutes après cette séparation**.
  Si les mêmes sessions se retrouvent avant le délai, elles le récupèrent.
  Un groupe actif n'expire pas au bout de cinq minutes.
- Un rafraîchissement ou une reconnexion crée une nouvelle session : l'ancien
  historique n'est pas récupéré. Un redémarrage du serveur efface tous les chats.
- Limites de démo : **500 caractères**, un envoi toutes les **600 ms** par session
  et les **100 derniers messages** par conversation. Le texte est affiché sans
  interpréter le HTML. Aucun message n'est stocké dans PostgreSQL.

Les règles et limites sont dans `server/src/realtime/chat.ts`. Les événements
`chat:state` et `chat:send` passent par la connexion Socket.IO déjà authentifiée.
Un accusé de réception confirme l'envoi ; en cas d'incertitude, l'interface signale
le problème sans renvoyer automatiquement le texte. Voir les
[accusés de réception Socket.IO](https://socket.io/docs/v4/emitting-events/#acknowledgements).

Pour la démo : connecter Alice et Thomas dans deux onglets, écrire un message,
éloigner Thomas puis le faire revenir pour retrouver l'historique. Connecter
Julie ouvre une conversation à trois avec un historique distinct. Le départ de
Julie restaure la conversation à deux si elle date de moins de cinq minutes.

## Finalisation de la démo — partie 6

Le chat annonce les arrivées et départs avec les noms des participants. Il affiche
le dernier changement observé dans cet onglet, séparément des messages échangés.
Ces annonces ne sont pas ajoutées aux historiques et ne révèlent aucun message
d'un autre groupe. Elles sont effacées lors d'une coupure réseau.

Le [guide de démonstration](docs/DEMO.md) propose un parcours à trois comptes,
les commandes de lancement et les solutions aux problèmes courants.
Le [compte rendu de validation](docs/VALIDATION.md) détaille les résultats et leur périmètre.
La suite de validation couvre aussi les erreurs de connexion, la restauration
et l'expiration des sessions, plusieurs comptes dans un même navigateur, deux
groupes distincts, les assets manquants et les tailles d'écran desktop.

Pour lancer toutes les vérifications du code dans l'ordre :

```sh
npm run verify
```

Cette commande vérifie TypeScript et Prisma, lance les tests serveur et navigateur,
puis compile les deux applications. Elle nécessite les mêmes prérequis que les
tests ci-dessous : `.env`, base migrée et initialisée, dépendances npm et Chromium.
Le contrôle Docker reste distinct : `docker compose config --quiet`, puis
`docker compose up --build -d --wait`.

## Développer en local

Prérequis supplémentaires : Node.js 22.12+ sur la branche 22, ou Node.js 24+,
et npm. Depuis la racine :

```sh
npm install
npm run setup
npm run prisma:generate
docker compose up -d database
npm run prisma:migrate
npm run prisma:seed
```

Dans deux terminaux distincts :

```sh
npm run dev:server
```

```sh
npm run dev:client
```

Ne pas lancer les services frontend/backend Docker sur les mêmes ports que les
serveurs locaux. Si nécessaire : `docker compose stop frontend backend`.
Sous PowerShell, si `npm.ps1` est bloqué par la politique d'exécution, utiliser
`npm.cmd` à la place de `npm`.

## Migrations, seed et vérifications

La migration versionnée `20260917000000_create_users` ajoute User et l'enum Role.
Pour relancer explicitement les opérations dans Docker :

```sh
docker compose exec backend npm run prisma:migrate --workspace @virtualoffice/server
docker compose exec backend npm run prisma:seed --workspace @virtualoffice/server
```

Hors Docker, utiliser `npm run prisma:migrate` et `npm run prisma:seed`.
Le seed est configuré dans `server/prisma.config.ts` et peut être répété.

```sh
npm run typecheck
npm run build
npm run prisma:validate
npm test
docker compose config --quiet
```

`npm test` lance des serveurs temporaires sur des ports libres et vérifie
l'authentification HTTP et les connexions Socket.IO. PostgreSQL doit être accessible via `.env`, avec migration et seed
exécutés. Les tests contrôlent les comptes, les hashes, le login, `/me`, les
profils publics, les entrées invalides, les jetons expirés ou altérés et l'absence
d'inscription. Ils ne modifient ni ne suppriment les comptes.
Les tests réseau vérifient aussi les présences, les identités, les positions
refusées, les collisions serveur, les onglets multiples et l'expiration des JWT.
Les tests du chat couvrent les chaînes, les murs et portes, l'hystérésis, les
changements de groupe, les droits d'envoi et la rétention. Une horloge contrôlée
vérifie la purge à cinq minutes sans attendre cinq minutes réellement.

Les tests du bureau utilisent Chromium via Playwright. Après `npm install`,
avec `.env` préparé, le client Prisma généré et la base accessible, migrée et
initialisée (par exemple après le démarrage Docker) :

```sh
npm exec --workspace @virtualoffice/client -- playwright install chromium
npm run test:game
```

Playwright démarre son propre backend sur **4001** et son client sur **5174** ;
ces deux ports doivent être libres. Ce bureau de test est séparé de la démo sur 4000.
Il utilise Alice, Thomas, Julie et Paul parmi les cinq comptes de démonstration,
avec le mot de passe `DEMO_PASSWORD` de `.env`. Les quinze scénarios
vérifient la connexion et le démontage du jeu, les touches et diagonales, les
murs et portes, le mobilier et le focus, les limites, puis la reprise après une
erreur de chargement, ainsi que deux sessions avec déplacement, rafraîchissement,
coupure réseau et reconnexion. Le scénario de chat vérifie les échanges à deux
et à trois, la saisie sans mouvement, l'affichage du HTML comme texte, la reprise
après séparation, les annonces de groupe et le plein écran. Les scénarios de
finalisation vérifient les erreurs de login et de restauration, l'expiration
côté interface (délai accéléré), les sessions indépendantes dans un même navigateur,
les raccourcis plein écran, trois tailles de fenêtre, un asset manquant et
l'isolation des messages de deux groupes formés dans quatre onglets.
Les résultats et captures sont dans `client/test-results/`
(ignoré par Git). La lecture des coordonnées de l'avatar est exposée uniquement
en mode Vite `test`.

Pour une vérification manuelle : se connecter, essayer les huit touches, longer
un mur puis franchir les deux portes, heurter un meuble et cliquer hors du jeu
avant d'y revenir. Se déconnecter puis se reconnecter doit afficher un seul
bureau, avec le bon nom et l'avatar au départ.
Avec deux comptes, déplacer Alice et vérifier le résultat chez Thomas, puis
fermer/recharger son onglet. Couper et rétablir le réseau doit permettre de revenir
sans ajouter une présence permanente en double.

La route `/api/health` interroge réellement PostgreSQL via Prisma : HTTP 200
avec `status: "ok"` et `database: "connected"`, ou HTTP 503 avec
`database: "unavailable"`. L'espace connecté permet de refaire cette vérification.

## Configuration

`.env` est ignoré par Git et exclu des images Docker. `.env.example` contient
uniquement la configuration d'exemple de cette démonstration locale.

| Variable | Usage |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Initialisation de PostgreSQL et connexion du backend Docker. |
| `POSTGRES_PORT` | Port PostgreSQL publié sur la machine ; 5432 par défaut. |
| `DATABASE_URL` | Connexion Prisma hors Docker avec `localhost` comme hôte. |
| `PORT` | Port du serveur hors Docker ; 4000 par défaut. |
| `CLIENT_ORIGIN` | Origine CORS ; `http://localhost:5173` par défaut. |
| `JWT_SECRET` | Secret aléatoire généré par le script setup, au moins 32 octets. |
| `DEMO_PASSWORD` | Mot de passe des comptes absents lors du seed. |
| `API_PROXY_TARGET` | Cible du proxy Vite hors Docker ; `http://localhost:4000`. |

Docker fixe les ports internes et utilise `database` comme hôte PostgreSQL et
`backend` comme cible du proxy. Le navigateur appelle `/api` sur l'origine du
client ; aucune donnée de connexion PostgreSQL ni secret JWT ne lui est envoyé.

Si le port 5432 est déjà occupé, choisir `POSTGRES_PORT=55432` et remplacer
`localhost:5432` par `localhost:55432` dans `DATABASE_URL`. Le port interne reste
5432. Si les identifiants changent, adapter aussi l'URL locale ; encoder les
caractères réservés dans les URL de connexion.

Les variables d'initialisation PostgreSQL s'appliquent à un volume neuf ; changer
`.env` ne change pas les comptes PostgreSQL déjà créés.

## Structure

```text
VirtualOffice/
├── client/
│   ├── public/assets/            # carte JSON et tileset fourni
│   ├── src/
│   │   ├── auth/AuthProvider.tsx
│   │   ├── components/ConnectionStatus.tsx
│   │   ├── components/OfficeGame.tsx
│   │   ├── components/ChatPanel.tsx
│   │   ├── game/                 # scène Phaser, carte, avatar et clavier
│   │   ├── pages/Login/
│   │   ├── pages/Workspace/
│   │   ├── services/
│   │   ├── types/auth.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/                   # bureau, chat et scénarios de démonstration
│   ├── playwright.config.ts
│   ├── Dockerfile
│   └── vite.config.ts
├── server/
│   ├── prisma/                  # schéma, migration et seed
│   ├── src/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── realtime/            # JWT, présences, carte et contrat réseau
│   │   ├── routes/              # auth et health
│   │   ├── services/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── index.ts
│   ├── tests/auth.test.ts
│   ├── tests/realtime.test.ts
│   ├── tests/chat.test.ts
│   ├── Dockerfile
│   └── prisma.config.ts
├── scripts/setup-env.mjs
├── scripts/start-demo.mjs
├── scripts/create-test-map.mjs
├── docs/DEMO.md
├── CREDITS.md
├── .env.example
├── docker-compose.yml
├── package.json
└── package-lock.json
```

Les applications utilisent les workspaces npm et un verrou de dépendances commun.
Prisma génère son client dans `server/src/generated/prisma`, ignoré par Git et
régénéré à la compilation. La configuration suit la
[documentation Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/introduction).
Les versions transitives `deepmerge-ts` et `mysql2` sont fixées avec `overrides`
pour corriger les alertes de dépendances identifiées en partie 1.
L'ordre de démarrage utilise les
[contrôles de santé Compose](https://docs.docker.com/compose/how-tos/startup-order/).

## Règles de fonctionnement retenues

### Proximité et conversations de groupe

Chaque avatar possède un rayon de proximité configurable. Deux utilisateurs
suffisamment proches peuvent démarrer automatiquement une conversation.
Une personne peut ensuite rejoindre une conversation de groupe en entrant
dans sa zone de proximité.

La zone du groupe est l'union des zones individuelles de ses participants.
Le rayon individuel ne grandit pas avec le nombre de membres : une personne
rejoint le groupe lorsqu'elle est suffisamment proche d'au moins un participant,
sous réserve de la règle sur les murs ci-dessous.

Cette règle autorise les groupes en chaîne : si Alice est proche de Thomas et
Thomas proche de Julie, les trois peuvent discuter ensemble, même si Alice et
Julie ne sont pas directement à portée l'une de l'autre. Une composition différente
utilise un historique distinct, selon les règles de la partie 5 ci-dessus.

Un mur entre deux avatars empêche leur proximité de déclencher une conversation,
même si la distance entre eux est faible. Cette règle s'applique aussi à l'entrée
dans un groupe. Le serveur teste l'intersection du segment entre les avatars avec
les rectangles des murs ; les passages ouverts ne coupent pas ce segment.

Une marge entre la distance d'entrée et la distance de sortie doit éviter
les entrées et sorties répétées lorsqu'un avatar reste à la limite de la zone.
La distance de sortie est de 120 px, contre 96 px à l'entrée. Ces valeurs sont
configurables dans `CHAT_PROXIMITY`, dans `server/src/realtime/protocol.ts`,
pour conserver les mêmes distances côté serveur et côté affichage.

### Conservation temporaire

Une conversation active ne doit pas être interrompue au bout de cinq minutes.
Le délai de conservation est de cinq minutes après son passage à l'état inactif,
via une constante configurable `CONVERSATION_TTL_MS = 5 * 60 * 1000`.
L'inactivité commence quand le groupe exact de sessions cesse d'exister. Il peut
reprendre avant le délai si ces mêmes sessions forment à nouveau un groupe.

Les conversations et leurs messages sont conservés temporairement en mémoire
côté serveur, sans historique permanent dans PostgreSQL.

### Saisie et connexions

Lorsque le champ de saisie du chat a le focus, les touches de déplacement
ne doivent pas faire bouger l'avatar.

Le rafraîchissement, la perte de connexion et la reconnexion sont pris en charge
en partie 4. Un même compte ouvert dans plusieurs onglets a une présence distincte
par onglet ; chaque présence disparaît à la fermeture ou à la détection de la coupure.

## Première étape de démonstration

Deux comptes peuvent se connecter, se voir et se déplacer sur une carte minimale
de test, puis échanger un message lorsqu'ils se rapprochent. La carte définitive
reste à réaliser par l'équipe dans Tiled.
