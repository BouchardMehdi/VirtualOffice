# VirtualOffice

VirtualOffice est un prototype scolaire de bureau virtuel 2D. Les utilisateurs
se connectent avec un compte existant, se déplacent dans un bureau vu du dessus
et discutent par messages lorsqu'ils sont suffisamment proches.

La partie 1 est en place : client React, API Express, connexion PostgreSQL via
Prisma et orchestration Docker Compose. La connexion aux comptes, le bureau 2D
et le chat ne sont pas encore implémentés.
Le nom retenu est **VirtualOffice** dans le code, la documentation et l'interface.

## Périmètre de la V1

- Une seule carte, créée par l'équipe avec Tiled.
- Des avatars contrôlés avec ZQSD ou les flèches, avec collisions sur les murs
  et les meubles configurés comme obstacles.
- La présence et les déplacements des autres utilisateurs en temps réel.
- Un chat textuel automatique, y compris en groupe.
- Des comptes prédéfinis, avec les rôles USER et ADMIN et les mêmes droits en V1.
- Un lancement local avec Docker Compose.

L'audio, la vidéo, l'inscription, l'édition de la carte par l'admin et l'historique
permanent des messages sont hors du périmètre de la V1.

## Stack prévue

- Interface : React, TypeScript et Vite.
- Bureau 2D : Phaser et une carte Tiled exportée en JSON.
- Serveur : Node.js, Express, TypeScript et Socket.IO.
- Utilisateurs : PostgreSQL et Prisma.
- Authentification : JWT et mots de passe hashés avec bcrypt.
- Environnement local : Docker et Docker Compose.

## Lancer la partie 1

Prérequis : Docker Desktop démarré avec les conteneurs Linux. Les ports locaux
5173, 4000 et 5432 doivent être libres (le port PostgreSQL est configurable).
Node.js et PostgreSQL n'ont pas besoin
d'être installés sur la machine pour ce lancement.

Depuis la racine du dépôt, créer le fichier de configuration une seule fois :

```powershell
Copy-Item .env.example .env
```

Sur macOS ou Linux, utiliser `cp .env.example .env` à la place.
Si `.env` existe déjà, conserver ses valeurs.

```sh
docker compose up --build
```

- Interface : http://localhost:5173
- Contrôle de l'API et de PostgreSQL : http://localhost:4000/api/health

La page affiche « Les services sont disponibles. » lorsque le serveur peut
interroger PostgreSQL via Prisma. La route de contrôle renvoie HTTP 200 avec :

```json
{"status":"ok","service":"virtualoffice-api","database":"connected"}
```

Si la base est inaccessible, cette route renvoie HTTP 503 et
`"database":"unavailable"`. Le bouton de la page permet de refaire la vérification.

Compose attend que PostgreSQL soit prêt avant de lancer le serveur, puis que
le serveur soit prêt avant de lancer l'interface. Le client utilise le serveur
Vite pour cette démo locale. Les ports publiés sont limités à la machine locale.

Commandes utiles :

```sh
docker compose ps
docker compose logs -f
docker compose down
```

`docker compose down` conserve les données dans le volume `postgres_data`.
Après une modification du code, relancer `docker compose up --build`.
Pour le rechargement automatique pendant le développement, utiliser le mode
local ci-dessous.

## Développer en local

Prérequis supplémentaires : Node.js 22.12 ou plus récent sur la branche 22,
ou Node.js 24 ou plus récent, avec npm. Le fichier `.env` doit être présent.

```sh
npm install
npm run prisma:generate
docker compose up -d database
```

Dans deux terminaux distincts, depuis la racine :

```sh
npm run dev:server
```

```sh
npm run dev:client
```

Ne pas lancer simultanément les services frontend/backend Docker et leurs
équivalents locaux sur les mêmes ports. Si nécessaire, les arrêter avec
`docker compose stop frontend backend` avant de lancer les commandes locales.

Sous PowerShell, si la politique d'exécution bloque `npm.ps1`, utiliser
`npm.cmd` à la place de `npm`.

Vérifications :

```sh
npm run typecheck
npm run build
npm run prisma:validate
docker compose config --quiet
```

## Configuration

Le fichier `.env` est ignoré par Git et exclu des images Docker.
Les valeurs de `.env.example` sont réservées à la démonstration locale.

| Variable | Usage |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Initialisation du conteneur PostgreSQL et connexion du backend Docker. |
| `POSTGRES_PORT` | Port PostgreSQL publié sur la machine ; 5432 par défaut. |
| `DATABASE_URL` | Connexion Prisma hors Docker, avec `localhost` comme hôte. |
| `PORT` | Port du serveur hors Docker ; 4000 par défaut. |
| `CLIENT_ORIGIN` | Origine autorisée par CORS ; `http://localhost:5173` par défaut. |
| `API_PROXY_TARGET` | Adresse du backend pour le proxy Vite hors Docker. |

Docker Compose fixe les ports internes et utilise `database` comme hôte
PostgreSQL et `backend` comme cible du proxy. Le navigateur appelle `/api` sur
l'origine de l'interface ; aucune donnée de connexion PostgreSQL ne lui est envoyée.
Si les identifiants PostgreSQL changent, adapter aussi `DATABASE_URL` pour le
mode local. Utiliser des valeurs compatibles avec une URL ou encoder les
caractères réservés dans l'URL de connexion.

Les variables d'initialisation PostgreSQL s'appliquent à un volume neuf ; modifier
le fichier `.env` ne change pas les comptes d'une base déjà initialisée.

Si une autre installation PostgreSQL occupe déjà le port 5432, définir
`POSTGRES_PORT=55432` et remplacer `localhost:5432` par `localhost:55432` dans
`DATABASE_URL`. Le serveur Docker continue d'utiliser le port interne 5432.

## Structure actuelle

```text
VirtualOffice/
├── client/
│   ├── src/
│   │   ├── services/api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── Dockerfile
│   └── vite.config.ts
├── server/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── config/env.ts
│   │   ├── routes/health.ts
│   │   ├── services/prisma.ts
│   │   ├── app.ts
│   │   └── index.ts
│   ├── Dockerfile
│   └── prisma.config.ts
├── .env.example
├── docker-compose.yml
├── package.json
└── package-lock.json
```

Les deux applications utilisent les workspaces npm et un verrou de dépendances
commun. Prisma 7 génère son client dans `server/src/generated/prisma`, ignoré par
Git et régénéré pendant la compilation. La configuration suit la
[documentation Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/introduction).
Deux versions transitives de l'outillage Prisma (`deepmerge-ts` et `mysql2`) sont
fixées via `overrides` à la racine pour corriger les alertes de dépendances
signalées lors de l'installation.
L'ordre de démarrage utilise les
[contrôles de santé Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/).

Le schéma ne contient pas encore de modèle métier : la route de contrôle exécute
seulement `SELECT 1`. Le modèle User, la première migration, le seed et les
identifiants de démonstration seront ajoutés en partie 2. Il n'y a donc aucune
migration ni aucun seed à exécuter à cette étape.

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
