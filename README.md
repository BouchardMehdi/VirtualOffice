# VirtualOffice

VirtualOffice est un prototype scolaire de bureau virtuel 2D. Les utilisateurs
se connectent avec un compte existant, se déplacent dans un bureau vu du dessus
et discutent par messages lorsqu'ils sont suffisamment proches.

Le projet est en phase de cadrage : l'application n'est pas encore implémentée.
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
