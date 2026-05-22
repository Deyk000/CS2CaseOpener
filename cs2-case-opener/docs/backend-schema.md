# Backend Schema Reference

This project is currently offline-first. The schema below documents the intended backend shape for future integration.

## Tables

- `users(id uuid pk, name, email unique, password_hash, created_at, last_login, is_banned)`
- `sessions(id uuid pk, user_id fk, token_hash, expires_at, ip, user_agent)`
- `wallets(user_id pk fk, balance int, updated_at)`
- `wallet_transactions(id uuid pk, user_id fk, amount int, reason, balance_after, created_at)`
- `inventory_items(uid uuid pk, user_id fk, item_id, case_name, name, weapon, finish, rarity, wear, float_val, stat_trak bool, stat_trak_count int, is_favorite bool, is_listed bool, list_price int, equipped_slot, opened_at, seed, created_at)`
- `open_log(id uuid pk, user_id fk, case_id, item_id, rarity, float_val, stat_trak bool, seed, server_seed_hash, client_seed, created_at)`
- `progression(user_id pk fk, xp int, level int, streak int, last_daily_claim date)`
- `missions(id uuid pk, user_id fk, type, label, target int, progress int, reward_coins int, reward_xp int, completed bool, expires_at)`

## Indexes

- `user_id` on all tables
- `(user_id, rarity)` on `inventory_items`
- `created_at` on `open_log`

## Provably Fair Scheme

- The server generates `server_seed` and stores `SHA256(server_seed)` in `open_log` when the request is created.
- The client sends `client_seed`.
- The result is derived from `HMAC-SHA256(server_seed, client_seed)` and mapped to an item.
- After reveal, the server publishes `server_seed` so the client can verify the outcome.
