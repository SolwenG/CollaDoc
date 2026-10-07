# API admin

Endpoints de gestion des comptes, tous montés sous `/admin`. L'authentification et la vérification du rôle `ADMIN` sont gérées en amont par le middleware d'auth (hors périmètre de ce module).

L'admin connecté est lu via `getCurrentUser(res)` (`src/auth/current-user.ts`), qui attend `res.locals.user = { id, role }`.

## Format d'un utilisateur (`AdminUserView`)

```json
{
  "id": 12,
  "username": "alice",
  "displayName": "Alice",
  "role": "USER",
  "mustChangePassword": false,
  "blockedAt": null,
  "blockedBy": null,
  "createdAt": "2026-10-07 13:09:40.166+00",
  "mfaEnabled": false
}
```

`blockedBy` vaut `{ id, username, displayName }` quand le compte est bloqué. `passwordHash` et `totpSecret` ne sont jamais exposés.

## Endpoints

### `GET /admin/users`

Liste paginée (offset), triée par `createdAt` croissant.

| Query | Défaut | Règle |
|---|---|---|
| `page` | `1` | entier ≥ 1 |
| `pageSize` | `20` | entier entre 1 et 100 |
| `search` | – | sous-chaîne insensible à la casse sur `username` et `displayName` |

Réponse `200` : `{ users: AdminUserView[], page, pageSize, total }`.

### `POST /admin/users`

Body (strict) : `{ "username": "alice", "role": "USER" | "ADMIN" }`, `role` optionnel (`USER` par défaut).

- `displayName` = username normalisé (trim + minuscules).
- Mot de passe temporaire de 16 caractères généré par le serveur, `mustChangePassword = true`, `createdById` = admin connecté.

Réponse `201` : `{ user, temporaryPassword }`. **Le mot de passe temporaire n'est renvoyé qu'ici**, il n'est stocké qu'en hash.

Erreurs : `409 USERNAME_TAKEN`, `400 VALIDATION_ERROR`.

### `POST /admin/users/:id/block`

Sans body. Renseigne `blockedAt` / `blockedById` et supprime toutes les sessions du compte dans la même transaction (déconnexion immédiate). Idempotent : un compte déjà bloqué est renvoyé tel quel, `blockedAt` d'origine conservé.

Réponse `200` : `{ user: AdminUserView }`.

### `POST /admin/users/:id/unblock`

Sans body. Remet `blockedAt` / `blockedById` à `null`. Idempotent.

Réponse `200` : `{ user: AdminUserView }`.

Erreurs communes à block/unblock :

- `403 CANNOT_BLOCK_SELF` : un admin ne peut ni se bloquer ni se débloquer lui-même (il peut en revanche bloquer un autre admin).
- `404 USER_NOT_FOUND`
- `400 VALIDATION_ERROR` : id non numérique.

## À synchroniser

### Auth (collègue en charge de l'auth)

- [ ] Confirmer que le middleware d'auth expose `res.locals.user = { id, role }`, sinon adapter `getCurrentUser` (`// TODO(auth)`).
- [ ] Protéger tout le préfixe `/admin` (session valide + MFA vérifiée + rôle `ADMIN`).
- [ ] Le login doit refuser les comptes avec `blockedAt` non null (le blocage supprime déjà les sessions existantes).
- [ ] Le login doit forcer le changement de mot de passe quand `mustChangePassword = true`.

### Front (`feat/pages-profil-admin`)

- [ ] `GET /admin` → `GET /admin/users`, réponse paginée `{ users, page, pageSize, total }`.
- [ ] `POST /admin/create` → `POST /admin/users` avec `{ username, role }` uniquement : retirer le champ mot de passe du formulaire et afficher le `temporaryPassword` renvoyé.
- [ ] `POST /users/:id/block` avec body → `POST /admin/users/:id/block` ou `/unblock`, sans body.

### Évolutions possibles

- [ ] Endpoint de regénération d'un mot de passe temporaire (mot de passe perdu par l'admin ou oublié par l'utilisateur).
