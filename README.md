# VirtualOffice

VirtualOffice est un prototype scolaire de bureau virtuel 2D : se connecter,
retrouver ses collègues, se déplacer et discuter en s'approchant d'un groupe.

**Les parties 1 et 2 sont implémentées** : socle Docker, base PostgreSQL,
authentification et espace protégé. La carte 2D, les déplacements et le chat
viendront aux étapes suivantes. Le nom du projet est **VirtualOffice**.

## Périmètre de la V1

Une seule carte créée par l'équipe avec Tiled, des déplacements ZQSD/flèches,
des collisions, la présence en temps réel et un chat textuel de proximité en groupe.
Les comptes sont prédéfinis ; USER et ADMIN ont les mêmes droits dans cette V1.

L'inscription, l'audio, la vidéo, l'édition de carte par l'admin et l'historique
permanent des messages sont hors périmètre.

## Stack

- Client : React, TypeScript, Vite et React Router.
- Serveur : Node.js, Express, TypeScript, JWT et bcrypt.
- Base de données : PostgreSQL 17 et Prisma 7.
- Environnement local : Docker et Docker Compose.
- Étapes suivantes : Phaser, Tiled et Socket.IO.

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

## Comptes de démonstration

Mot de passe initial commun : **`VirtualOffice2026!`** (`DEMO_PASSWORD` dans
`.env.example`). Ces identifiants sont publics et réservés à la démo locale.
Si cette variable est personnalisée avant le premier seed, utiliser sa valeur.

| Utilisateur | Email | Rôle |
| --- | --- | --- |
| Alice Martin | `alice@virtualoffice.test` | USER |
| Thomas Bernard | `thomas@virtualoffice.test` | USER |
| Julie Dupont | `julie@virtualoffice.test` | USER |
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

`npm test` lance une API temporaire sur un port libre et vérifie l'authentification
par HTTP. PostgreSQL doit être accessible via `.env`, avec migration et seed
exécutés. Les tests contrôlent les comptes, les hashes, le login, `/me`, les
profils publics, les entrées invalides, les jetons expirés ou altérés et l'absence
d'inscription. Ils ne modifient ni ne suppriment les comptes.

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
│   ├── src/
│   │   ├── auth/AuthProvider.tsx
│   │   ├── components/ConnectionStatus.tsx
│   │   ├── pages/Login/
│   │   ├── pages/Workspace/
│   │   ├── services/
│   │   ├── types/auth.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── vite.config.ts
├── server/
│   ├── prisma/                  # schéma, migration et seed
│   ├── src/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/              # auth et health
│   │   ├── services/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── index.ts
│   ├── tests/auth.test.ts
│   ├── Dockerfile
│   └── prisma.config.ts
├── scripts/setup-env.mjs
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
Julie ne sont pas directement à portée l'une de l'autre. Les règles de séparation
et de fusion des conversations, ainsi que le devenir des messages dans ces cas,
restent à préciser.

Un mur entre deux avatars empêche leur proximité de déclencher une conversation,
même si la distance entre eux est faible. Cette règle s'applique aussi à l'entrée
dans un groupe. La méthode de prise en compte des murs et des portes reste à
définir lors de l'intégration de la carte.

Une marge entre la distance d'entrée et la distance de sortie doit éviter
les entrées et sorties répétées lorsqu'un avatar reste à la limite de la zone.
La distance de sortie sera supérieure à celle d'entrée ; les valeurs seront
ajustées avec la carte de test.

### Conservation temporaire

Une conversation active ne doit pas être interrompue au bout de cinq minutes.
Le délai de conservation est de cinq minutes après son passage à l'état inactif,
via une constante configurable `CONVERSATION_TTL_MS = 5 * 60 * 1000`.
La définition exacte de l'inactivité et les règles de reprise restent à préciser.

Les conversations et leurs messages sont conservés temporairement en mémoire
côté serveur, sans historique permanent dans PostgreSQL.

### Saisie et connexions

Lorsque le champ de saisie du chat a le focus, les touches de déplacement
ne doivent pas faire bouger l'avatar.

Le rafraîchissement de la page, la perte de connexion et la reconnexion doivent
être pris en compte pour éviter les présences fantômes. Le comportement d'un
même compte ouvert dans plusieurs onglets reste à définir.

## Première étape de démonstration

Deux comptes peuvent se connecter, se voir et se déplacer sur une carte minimale
de test, puis échanger un message lorsqu'ils se rapprochent. La carte définitive
reste à réaliser par l'équipe dans Tiled.
