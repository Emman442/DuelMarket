
# Duel Market

Peer-to-peer prediction markets on GenLayer. Two sides stake GEN on a question. After the lock time, validators settle it from a public URL. Winners split the losing pool. A void refunds everyone.

## Markets

Clean. Side A wins if a number at a JSON path meets a fixed comparison. Example: bitcoin.usd >= 70000. Side B wins otherwise. Resolution uses strict_eq, so every validator must read the same value. If the live number is sitting on the threshold and fetches disagree, the call reverts. Call resolve_market again once the value is clearly past the line.

Vibe. Validators fetch the evidence URL and judge it against the resolution criteria written at creation. Those criteria are immutable. If the evidence is missing or does not settle the question, the verdict is void.

Both types take a primary evidence URL and an optional fallback. The fallback is used only if the primary fetch fails.

## Rules

- The creator stakes on A or B when opening the market. The stake must be a whole number of GEN, at least min_stake.
- Lock time is at least 5 minutes. No new stakes after resolve_at.
- One position per wallet per bet. Staking again on the same side tops up. Staking the other side reverts.
- Anyone can resolve once the lock has passed and both sides have stake.
- The result enters pending_appeal for appeal_window_ms. One participant may appeal once before that deadline. A second appeal reverts.
- Anyone can call finalize_payout after the window, or immediately after an appeal. Winners receive their principal plus a share of the losing pool. The protocol fee (0–1000 bps, 0–10%) is taken from the losing pool only. Dust goes to the treasury.
- A void verdict refunds every position in full.
- The creator or admin can cancel while the bet is open and one side still has zero stake. After lock, anyone can void an unmatched bet. Both refund in full.

## Contract

File: contracts/duel_market.py
SDK: v0.2.16
Depends: py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6

Constructor:

DuelMarket(admin_address, treasury_address, protocol_fee_bps, appeal_window_ms)

Writes:

- create_clean_market: payable. Open a numeric market and stake.
- create_vibe_market: payable. Open a criteria market and stake.
- join_bet(bet_id, side): payable. Stake or top up A or B.
- cancel_bet(bet_id): creator or admin. Refund a one-sided open bet.
- void_unmatched_bet(bet_id): anyone. Refund a one-sided bet after lock.
- resolve_market(bet_id): anyone. Settle a funded bet after lock.
- dispute_resolution(bet_id, context): a participant. One appeal before the deadline.
- finalize_payout(bet_id): anyone. Pay winners or refund a void.
- set_protocol_fee / set_treasury: admin. Fee must stay in 0–1000 bps.

Views:

get_bet, get_all_bets, get_open_bets, get_position, get_bet_positions, get_wallet_position, has_position, has_been_appealed, get_total_bets, get_total_positions.

Status:

open to pending_appeal to finalized.
open to pending_appeal to appeal_resolved to finalized.
Cancel ends at cancelled. Unmatched void ends at voided.

## Tests

Direct mode, with web and LLM mocked. From the repo root, with genlayer-test installed:

pytest tests/direct/test_duel_market.py -v

The suite checks market creation, input rejection, a stranger being blocked from appeal, a single participant appeal, and cancel being limited to one-sided bets. The first run downloads the v0.2.16 runner.
