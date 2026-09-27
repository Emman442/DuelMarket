# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import genlayer as gl
from genlayer.types import *
from dataclasses import dataclass
from datetime import datetime, timezone
import json


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass
    class Write:
        pass


@allow_storage
@dataclass
class Bet:
    bet_id: str
    creator: str
    market_type: str            # "clean" | "vibe"
    question: str
    side_a_label: str
    side_b_label: str
    evidence_url: str
    evidence_url_fallback: str  # "" if none
    json_field_path: str        # clean markets only, e.g. "bitcoin.usd"
    comparison: str             # clean markets only: ">" ">=" "<" "<=" "=="
    target_value: str           # clean markets only, numeric as string
    resolution_criteria: str    # vibe markets only
    min_stake: i32
    side_a_total: i32
    side_b_total: i32
    status: str                 # "open"|"pending_appeal"|"appeal_resolved"|"finalized"|"voided"|"cancelled"
    winning_side: str           # ""|"A"|"B"|"void"
    resolution_reasoning: str
    resolution_value: str
    created_at: str
    resolve_at: i64             # lock time / earliest resolution time, unix ms
    resolved_at: str
    appeal_deadline: i64        # unix ms, valid once status == "pending_appeal"


@allow_storage
@dataclass
class Position:
    position_id: str
    bet_id: str
    backer: str
    side: str                   # "A" | "B"
    amount: i32                 # principal staked, in whole GEN
    claimed: bool
    payout_amount: i32          # 0 until finalize_payout runs
    joined_at: str


class DuelMarket(gl.contract.Contract):

    bets: TreeMap[str, Bet]
    bet_ids: DynArray[str]
    bet_counter: i32

    positions: TreeMap[str, Position]
    position_counter: i32

    # key: "{bet_id}|{wallet}" -> position_id. One position per wallet per bet.
    position_lookup: TreeMap[str, str]

    # key: bet_id -> comma separated list of position_ids for that bet.
    # Kept as a top-level TreeMap[str, str] rather than a DynArray field
    # nested inside the Bet dataclass, since a container nested inside a
    # stored dataclass needs extra allocation handling GenVM's schema
    # loader doesn't do for us automatically.
    bet_positions_csv: TreeMap[str, str]

    # key: bet_id -> True once that bet has used its one allowed appeal
    appeal_used: TreeMap[str, bool]

    admin: str
    treasury: str
    protocol_fee_bps: i32       # fee on the LOSING pool only, e.g. 200 = 2%
    appeal_window_ms: i64

    def __init__(
        self,
        admin_address: str,
        treasury_address: str,
        protocol_fee_bps: i32,
        appeal_window_ms: i64
    ):
        self.admin = admin_address
        self.treasury = treasury_address
        if int(protocol_fee_bps) < 0 or int(protocol_fee_bps) > 1000:
            raise gl.vm.UserError("Fee must be between 0 and 1000 bps (0-10%)")
        self.protocol_fee_bps = protocol_fee_bps
        if int(appeal_window_ms) < 0:
            raise gl.vm.UserError("appeal_window_ms must be non-negative")
        self.appeal_window_ms = appeal_window_ms
        self.bet_counter = i32(0)
        self.position_counter = i32(0)

    # ---------------------------------------------------------------------
    # internal helpers
    # ---------------------------------------------------------------------

    def _only_admin(self) -> None:
        if str(gl.message.sender_address) != self.admin:
            raise gl.vm.UserError("Only admin")

    def _position_key(self, bet_id: str, wallet: str) -> str:
        return bet_id + "|" + wallet

    def _bet_position_ids(self, bet_id: str) -> list:
        csv = self.bet_positions_csv[bet_id] if bet_id in self.bet_positions_csv else ""
        if csv == "":
            return []
        return csv.split(",")

    def _add_bet_position_id(self, bet_id: str, position_id: str) -> None:
        existing = self.bet_positions_csv[bet_id] if bet_id in self.bet_positions_csv else ""
        if existing == "":
            self.bet_positions_csv[bet_id] = position_id
        else:
            self.bet_positions_csv[bet_id] = existing + "," + position_id

    def _open_or_add_position(self, bet_id: str, wallet: str, side: str, amount_gen: int) -> str:
        key = self._position_key(bet_id, wallet)

        if key in self.position_lookup:
            existing_id = self.position_lookup[key]
            existing = self.positions[existing_id]
            if existing.side != side:
                raise gl.vm.UserError("Cannot back both sides of the same bet")
            self.positions[existing_id].amount += i32(amount_gen)
            position_id = existing_id
        else:
            self.position_counter += i32(1)
            position_id = f"pos_{self.position_counter}"
            self.positions[position_id] = Position(
                position_id=position_id,
                bet_id=bet_id,
                backer=wallet,
                side=side,
                amount=i32(amount_gen),
                claimed=False,
                payout_amount=i32(0),
                joined_at=gl.message_raw["datetime"]
            )
            self.position_lookup[key] = position_id
            self._add_bet_position_id(bet_id, position_id)

        if side == "A":
            self.bets[bet_id].side_a_total += i32(amount_gen)
        else:
            self.bets[bet_id].side_b_total += i32(amount_gen)

        return position_id

    def _refund_all_positions(self, bet_id: str) -> None:
        for pid in self._bet_position_ids(bet_id):
            pos = self.positions[pid]
            if pos.claimed:
                continue
            self.positions[pid].claimed = True
            self.positions[pid].payout_amount = pos.amount
            if int(pos.amount) > 0:
                refund_wei = u256(pos.amount) * u256(10**18)
                _Recipient(Address(pos.backer)).emit_transfer(value=refund_wei)

    def _finalize_resolution(self, bet_id: str, winning_side: str, reasoning: str, observed_value: str) -> None:
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        self.bets[bet_id].winning_side = winning_side
        self.bets[bet_id].resolution_reasoning = reasoning[:500]
        self.bets[bet_id].resolution_value = observed_value
        self.bets[bet_id].resolved_at = gl.message_raw["datetime"]
        self.bets[bet_id].appeal_deadline = i64(now + int(self.appeal_window_ms))
        self.bets[bet_id].status = "pending_appeal"

    # ---------------------------------------------------------------------
    # market creation
    # ---------------------------------------------------------------------

    @gl.public.write.payable
    def create_clean_market(
        self,
        question: str,
        side_a_label: str,
        side_b_label: str,
        evidence_url: str,
        evidence_url_fallback: str,
        json_field_path: str,
        comparison: str,
        target_value: str,
        creator_side: str,
        lock_minutes: i64,
        min_stake: i32
    ) -> str:
        """
        Side A wins if the value at json_field_path in the JSON returned by
        evidence_url satisfies `comparison target_value` (e.g. ">= 70000").
        Side B wins otherwise. Write side_a_label to describe the
        "condition true" outcome. evidence_url_fallback is tried only if
        the primary fetch fails, pass "" if you don't have one.
        """
        creator = str(gl.message.sender_address)

        if len(question) < 10:
            raise gl.vm.UserError("Question too short")
        if len(side_a_label) < 1 or len(side_b_label) < 1:
            raise gl.vm.UserError("Side labels required")
        if side_a_label == side_b_label:
            raise gl.vm.UserError("Side labels must be different")
        if not evidence_url.startswith("http"):
            raise gl.vm.UserError("Invalid evidence URL")
        if evidence_url_fallback != "" and not evidence_url_fallback.startswith("http"):
            raise gl.vm.UserError("Fallback evidence URL must be empty or a valid URL")
        if len(json_field_path) < 1:
            raise gl.vm.UserError("JSON field path required")
        if comparison not in [">", ">=", "<", "<=", "=="]:
            raise gl.vm.UserError("Invalid comparison operator")
        try:
            float(target_value)
        except ValueError:
            raise gl.vm.UserError("target_value must be numeric")
        if creator_side not in ["A", "B"]:
            raise gl.vm.UserError("creator_side must be 'A' or 'B'")
        if int(lock_minutes) < 5:
            raise gl.vm.UserError("Lock time must be at least 5 minutes out")
        if int(min_stake) < 1:
            raise gl.vm.UserError("min_stake must be at least 1")

        if int(gl.message.value) % (10**18) != 0:
            raise gl.vm.UserError("Stake must be a whole number of GEN")
        amount_gen = int(gl.message.value) // (10**18)
        if amount_gen < int(min_stake):
            raise gl.vm.UserError("Initial stake below min_stake")

        self.bet_counter += i32(1)
        bet_id = f"bet_{self.bet_counter}"
        now = int(datetime.now(timezone.utc).timestamp() * 1000)

        self.bets[bet_id] = Bet(
            bet_id=bet_id,
            creator=creator,
            market_type="clean",
            question=question,
            side_a_label=side_a_label,
            side_b_label=side_b_label,
            evidence_url=evidence_url,
            evidence_url_fallback=evidence_url_fallback,
            json_field_path=json_field_path,
            comparison=comparison,
            target_value=target_value,
            resolution_criteria="",
            min_stake=min_stake,
            side_a_total=i32(0),
            side_b_total=i32(0),
            status="open",
            winning_side="",
            resolution_reasoning="",
            resolution_value="",
            created_at=gl.message_raw["datetime"],
            resolve_at=i64(now + int(lock_minutes) * 60 * 1000),
            resolved_at="",
            appeal_deadline=i64(0)
        )

        self.bet_ids.append(bet_id)
        self.bet_positions_csv[bet_id] = ""
        self._open_or_add_position(bet_id, creator, creator_side, amount_gen)
        return bet_id

    @gl.public.write.payable
    def create_vibe_market(
        self,
        question: str,
        side_a_label: str,
        side_b_label: str,
        evidence_url: str,
        evidence_url_fallback: str,
        resolution_criteria: str,
        creator_side: str,
        lock_minutes: i64,
        min_stake: i32
    ) -> str:
        """
        The outcome is judged by AI validators from the content fetched at
        evidence_url against resolution_criteria. resolution_criteria is
        immutable once set, write it precisely, both sides should be able
        to read it before staking and know what "counts" as a win.
        """
        creator = str(gl.message.sender_address)

        if len(question) < 10:
            raise gl.vm.UserError("Question too short")
        if len(side_a_label) < 1 or len(side_b_label) < 1:
            raise gl.vm.UserError("Side labels required")
        if side_a_label == side_b_label:
            raise gl.vm.UserError("Side labels must be different")
        if not evidence_url.startswith("http"):
            raise gl.vm.UserError("Invalid evidence URL")
        if evidence_url_fallback != "" and not evidence_url_fallback.startswith("http"):
            raise gl.vm.UserError("Fallback evidence URL must be empty or a valid URL")
        if len(resolution_criteria) < 10:
            raise gl.vm.UserError("Resolution criteria too short")
        if creator_side not in ["A", "B"]:
            raise gl.vm.UserError("creator_side must be 'A' or 'B'")
        if int(lock_minutes) < 5:
            raise gl.vm.UserError("Lock time must be at least 5 minutes out")
        if int(min_stake) < 1:
            raise gl.vm.UserError("min_stake must be at least 1")

        if int(gl.message.value) % (10**18) != 0:
            raise gl.vm.UserError("Stake must be a whole number of GEN")
        amount_gen = int(gl.message.value) // (10**18)
        if amount_gen < int(min_stake):
            raise gl.vm.UserError("Initial stake below min_stake")

        self.bet_counter += i32(1)
        bet_id = f"bet_{self.bet_counter}"
        now = int(datetime.now(timezone.utc).timestamp() * 1000)

        self.bets[bet_id] = Bet(
            bet_id=bet_id,
            creator=creator,
            market_type="vibe",
            question=question,
            side_a_label=side_a_label,
            side_b_label=side_b_label,
            evidence_url=evidence_url,
            evidence_url_fallback=evidence_url_fallback,
            json_field_path="",
            comparison="",
            target_value="",
            resolution_criteria=resolution_criteria,
            min_stake=min_stake,
            side_a_total=i32(0),
            side_b_total=i32(0),
            status="open",
            winning_side="",
            resolution_reasoning="",
            resolution_value="",
            created_at=gl.message_raw["datetime"],
            resolve_at=i64(now + int(lock_minutes) * 60 * 1000),
            resolved_at="",
            appeal_deadline=i64(0)
        )

        self.bet_ids.append(bet_id)
        self.bet_positions_csv[bet_id] = ""
        self._open_or_add_position(bet_id, creator, creator_side, amount_gen)
        return bet_id

    # ---------------------------------------------------------------------
    # joining / cancelling
    # ---------------------------------------------------------------------

    @gl.public.write.payable
    def join_bet(self, bet_id: str, side: str) -> str:
        """
        Stake GEN on a side of an open bet. Calling this again on the same
        side you already hold tops up your position; calling it on the
        opposite side you already hold is rejected.
        """
        wallet = str(gl.message.sender_address)
        if bet_id not in self.bets:
            raise gl.vm.UserError("Bet not found")
        b = self.bets[bet_id]
        if b.status != "open":
            raise gl.vm.UserError("Bet is not open for new positions")

        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        if now >= int(b.resolve_at):
            raise gl.vm.UserError("Bet has already locked")
        if side not in ["A", "B"]:
            raise gl.vm.UserError("side must be 'A' or 'B'")

        if int(gl.message.value) % (10**18) != 0:
            raise gl.vm.UserError("Stake must be a whole number of GEN")
        amount_gen = int(gl.message.value) // (10**18)
        if amount_gen <= 0:
            raise gl.vm.UserError("Must send a positive amount of GEN")

        key = self._position_key(bet_id, wallet)
        if key not in self.position_lookup and amount_gen < int(b.min_stake):
            raise gl.vm.UserError("Stake below this bet's minimum")

        return self._open_or_add_position(bet_id, wallet, side, amount_gen)

    @gl.public.write
    def cancel_bet(self, bet_id: str) -> None:
        """
        Creator or admin can cancel and fully refund everyone while the
        bet is still open, as long as it never became a real two-sided
        bet (one side still has zero stake).
        """
        caller = str(gl.message.sender_address)
        if bet_id not in self.bets:
            raise gl.vm.UserError("Bet not found")
        b = self.bets[bet_id]
        if caller != b.creator and caller != self.admin:
            raise gl.vm.UserError("Only the creator or admin can cancel")
        if b.status != "open":
            raise gl.vm.UserError("Bet is no longer open")
        if int(b.side_a_total) != 0 and int(b.side_b_total) != 0:
            raise gl.vm.UserError("Cannot cancel once both sides have participants")

        self._refund_all_positions(bet_id)
        self.bets[bet_id].status = "cancelled"

    @gl.public.write
    def void_unmatched_bet(self, bet_id: str) -> None:
        """
        Anyone can call this after lock time if the bet never got a taker
        on the other side. Refunds everyone in full.
        """
        if bet_id not in self.bets:
            raise gl.vm.UserError("Bet not found")
        b = self.bets[bet_id]
        if b.status != "open":
            raise gl.vm.UserError("Bet is not open")

        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        if now < int(b.resolve_at):
            raise gl.vm.UserError("Bet has not reached its lock time yet")
        if int(b.side_a_total) != 0 and int(b.side_b_total) != 0:
            raise gl.vm.UserError("Bet has participants on both sides — call resolve_market instead")

        self._refund_all_positions(bet_id)
        self.bets[bet_id].status = "voided"

    # ---------------------------------------------------------------------
    # resolution
    # ---------------------------------------------------------------------

    @gl.public.write
    def resolve_market(self, bet_id: str) -> None:
        """
        Single entry point for resolution. Dispatches to the clean
        (numeric, strict-equality) or vibe (LLM-judged) path depending on
        how the market was created. Anyone can call this once the lock
        time has passed and both sides are funded.
        """
        if bet_id not in self.bets:
            raise gl.vm.UserError("Bet not found")
        b = self.bets[bet_id]
        if b.status != "open":
            raise gl.vm.UserError("Bet is not open")

        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        if now < int(b.resolve_at):
            raise gl.vm.UserError("Bet has not reached its lock time yet")
        if int(b.side_a_total) <= 0 or int(b.side_b_total) <= 0:
            raise gl.vm.UserError("Both sides need participants before resolving — call void_unmatched_bet instead")

        if b.market_type == "clean":
            self._resolve_clean(bet_id)
        else:
            self._resolve_vibe(bet_id)

    def _resolve_clean(self, bet_id: str) -> None:
        b = self.bets[bet_id]
        primary = b.evidence_url
        fallback = b.evidence_url_fallback
        field_path = b.json_field_path
        op = b.comparison
        target_str = b.target_value

        def fetch_and_evaluate() -> str:
            def extract_path(data, path):
                node = data
                for part in path.split("."):
                    if isinstance(node, dict) and part in node:
                        node = node[part]
                    else:
                        raise KeyError(part)
                return float(node)

            def compare(observed, target, operator):
                if operator == ">":
                    return observed > target
                elif operator == ">=":
                    return observed >= target
                elif operator == "<":
                    return observed < target
                elif operator == "<=":
                    return observed <= target
                elif operator == "==":
                    return observed == target
                else:
                    raise ValueError("bad operator")

            urls_to_try = [primary]
            if fallback.startswith("http"):
                urls_to_try.append(fallback)

            for url in urls_to_try:
                try:
                    raw = gl.nondet.web.render(url, mode="text")
                    data = json.loads(raw)
                    observed = extract_path(data, field_path)
                    target = float(target_str)
                    condition_true = compare(observed, target, op)
                    winning_side = "A" if condition_true else "B"
                    observed_rounded = round(observed, 6)
                    return json.dumps({
                        "winning_side": winning_side,
                        "observed_value": str(observed_rounded),
                        "status": "ok"
                    }, sort_keys=True, separators=(',', ':'))
                except Exception:
                    continue

            return json.dumps({
                "winning_side": "void",
                "observed_value": "",
                "status": "fetch_failed"
            }, sort_keys=True, separators=(',', ':'))

        # NOTE: strict_eq requires every validator's independent fetch to
        # agree byte-for-byte. For a market resolving exactly when the
        # live value is fluttering around the threshold, this can revert
        # rather than settle. That is intentional — it fails closed. Call
        # resolve_market again once the value has moved clearly past or
        # below the threshold.
        consensus_json = gl.eq_principle.strict_eq(fetch_and_evaluate)
        parsed = json.loads(consensus_json)

        winning_side = str(parsed.get("winning_side", "void"))
        if winning_side not in ["A", "B", "void"]:
            winning_side = "void"
        observed_value = str(parsed.get("observed_value", ""))
        status_note = str(parsed.get("status", ""))

        reasoning = (
            f"Resolved from {primary} using field '{field_path}' {op} {target_str}. "
            f"Observed: {observed_value}. status={status_note}"
        )

        self._finalize_resolution(bet_id, winning_side, reasoning, observed_value)

    def _resolve_vibe(self, bet_id: str) -> None:
        b = self.bets[bet_id]
        primary = b.evidence_url
        fallback = b.evidence_url_fallback
        question = b.question
        side_a = b.side_a_label
        side_b = b.side_b_label
        criteria = b.resolution_criteria

        def fetch_and_judge() -> str:
            urls_to_try = [primary]
            if fallback.startswith("http"):
                urls_to_try.append(fallback)

            body_text = ""
            fetched_url = ""
            fetched_ok = False
            for url in urls_to_try:
                try:
                    text = gl.nondet.web.render(url, mode="text")
                    if text and len(text) > 0:
                        body_text = text[:4000]
                        fetched_url = url
                        fetched_ok = True
                        break
                except Exception:
                    continue

            if not fetched_ok:
                return json.dumps({
                    "winning_side": "void",
                    "reasoning": "Could not fetch evidence from primary or fallback source"
                }, sort_keys=True, separators=(',', ':'))

            prompt = f"""You are settling a peer-to-peer prediction bet between two people.

Question: {question}
Side A is "{side_a}"
Side B is "{side_b}"

Resolution criteria set by the bet creator when the bet was made:
{criteria}

Evidence fetched from {fetched_url}:
---
{body_text}
---

Decide which side wins based only on the evidence above, judged against
the resolution criteria. If the evidence is insufficient, ambiguous, or
does not address the question, return "void" rather than guessing.

Return ONLY valid JSON:
{{"winning_side":"A","reasoning":"one or two sentences"}}

winning_side must be exactly one of: A, B, void
"""
            try:
                result = gl.nondet.exec_prompt(prompt).strip()
                cleaned = result.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(cleaned)
                verdict = str(parsed.get("winning_side", "void")).strip()
                if verdict not in ["A", "B", "void"]:
                    verdict = "void"
                return json.dumps({
                    "winning_side": verdict,
                    "reasoning": str(parsed.get("reasoning", ""))[:400]
                }, sort_keys=True, separators=(',', ':'))
            except Exception:
                return json.dumps({
                    "winning_side": "void",
                    "reasoning": "Could not parse model response"
                }, sort_keys=True, separators=(',', ':'))

        consensus_json = gl.eq_principle.prompt_non_comparative(
            fetch_and_judge,
            task="Determine which side of a peer-to-peer prediction bet wins based on fetched evidence and creator-defined resolution criteria",
            criteria="Return void if the evidence is missing, ambiguous, or does not clearly support one side over the other. Do not guess."
        )

        try:
            parsed = json.loads(consensus_json.strip())
            winning_side = str(parsed.get("winning_side", "void"))
            if winning_side not in ["A", "B", "void"]:
                winning_side = "void"
            reasoning = str(parsed.get("reasoning", ""))
        except Exception:
            winning_side = "void"
            reasoning = "Vibe market verdict could not be parsed"

        self._finalize_resolution(bet_id, winning_side, reasoning, "")

    # ---------------------------------------------------------------------
    # appeal
    # ---------------------------------------------------------------------

    @gl.public.write
    def dispute_resolution(self, bet_id: str, appeal_context: str) -> None:
        """
        Any participant in the bet (either side) can file exactly one
        appeal per bet, before the appeal window closes. AI validators
        re-review the case with fresh evidence and the appellant's
        context, and can uphold or overturn the original verdict.
        """
        caller = str(gl.message.sender_address)
        if bet_id not in self.bets:
            raise gl.vm.UserError("Bet not found")
        b = self.bets[bet_id]
        if b.status != "pending_appeal":
            raise gl.vm.UserError("Bet not eligible for appeal")

        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        if now >= int(b.appeal_deadline):
            raise gl.vm.UserError("Appeal window has closed")
        if bet_id in self.appeal_used:
            raise gl.vm.UserError("This bet has already been appealed once")

        key = self._position_key(bet_id, caller)
        if key not in self.position_lookup:
            raise gl.vm.UserError("Only a participant in this bet can appeal")
        if len(appeal_context) < 10:
            raise gl.vm.UserError("Please provide more context for the appeal")

        self.appeal_used[bet_id] = True

        primary = b.evidence_url
        fallback = b.evidence_url_fallback
        question = b.question
        side_a = b.side_a_label
        side_b = b.side_b_label
        original_verdict = b.winning_side
        original_reasoning = b.resolution_reasoning
        context = appeal_context
        criteria = b.resolution_criteria if b.market_type == "vibe" else \
            f"{b.json_field_path} {b.comparison} {b.target_value} (source: {b.evidence_url})"

        def review_appeal() -> str:
            urls_to_try = [primary]
            if fallback.startswith("http"):
                urls_to_try.append(fallback)

            body_text = ""
            fetched_ok = False
            for url in urls_to_try:
                try:
                    text = gl.nondet.web.render(url, mode="text")
                    if text and len(text) > 0:
                        body_text = text[:4000]
                        fetched_ok = True
                        break
                except Exception:
                    continue

            evidence_note = body_text if fetched_ok else "Could not re-fetch evidence at appeal time."

            prompt = f"""You are reviewing an appeal of a resolved peer-to-peer prediction bet.

Question: {question}
Side A: "{side_a}"
Side B: "{side_b}"
Resolution basis: {criteria}

Original verdict: {original_verdict}
Original reasoning: {original_reasoning}

Freshly fetched evidence:
---
{evidence_note}
---

Appellant's context and objection:
"{context}"

Re-review the case with fresh eyes. Uphold the original verdict if it was
correct, or overturn it if the appellant's context and the evidence show
it was wrong. Return void only if the matter is genuinely unresolvable.

Return ONLY valid JSON:
{{"winning_side":"A","reasoning":"2-3 sentences explaining the appeal decision"}}

winning_side must be exactly one of: A, B, void
"""
            try:
                result = gl.nondet.exec_prompt(prompt).strip()
                cleaned = result.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(cleaned)
                verdict = str(parsed.get("winning_side", "void")).strip()
                if verdict not in ["A", "B", "void"]:
                    verdict = "void"
                return json.dumps({
                    "winning_side": verdict,
                    "reasoning": str(parsed.get("reasoning", ""))[:400]
                }, sort_keys=True, separators=(',', ':'))
            except Exception:
                return json.dumps({
                    "winning_side": "void",
                    "reasoning": "Appeal could not be evaluated"
                }, sort_keys=True, separators=(',', ':'))

        consensus_json = gl.eq_principle.prompt_non_comparative(
            review_appeal,
            task="Review an appeal of a resolved peer-to-peer prediction bet using fresh evidence and the appellant's context",
            criteria="Uphold or overturn the original verdict based only on the evidence and the stated resolution basis. Use void only if genuinely unresolvable."
        )

        try:
            parsed = json.loads(consensus_json.strip())
            new_verdict = str(parsed.get("winning_side", "void"))
            if new_verdict not in ["A", "B", "void"]:
                new_verdict = "void"
            appeal_reasoning = str(parsed.get("reasoning", ""))
        except Exception:
            new_verdict = "void"
            appeal_reasoning = "Appeal verdict could not be parsed"

        self.bets[bet_id].winning_side = new_verdict
        self.bets[bet_id].resolution_reasoning = (
            f"[Appeal] {appeal_reasoning} (original verdict was {original_verdict})"
        )[:500]
        self.bets[bet_id].status = "appeal_resolved"

    # ---------------------------------------------------------------------
    # payout
    # ---------------------------------------------------------------------

    @gl.public.write
    def finalize_payout(self, bet_id: str) -> None:
        """
        Callable by anyone once the bet is resolved and, if unappealed,
        the appeal window has passed. Winners split the losing pool
        proportional to their stake; a protocol fee is taken from the
        losing pool only, never from principal. A "void" verdict refunds
        everyone in full instead.
        """
        if bet_id not in self.bets:
            raise gl.vm.UserError("Bet not found")
        b = self.bets[bet_id]
        if b.status not in ["pending_appeal", "appeal_resolved"]:
            raise gl.vm.UserError("Bet not ready for payout")

        if b.status == "pending_appeal":
            now = int(datetime.now(timezone.utc).timestamp() * 1000)
            if now < int(b.appeal_deadline):
                raise gl.vm.UserError("Appeal window still open")

        winning_side = b.winning_side
        if winning_side not in ["A", "B", "void"]:
            raise gl.vm.UserError("Bet has no valid verdict")

        if winning_side == "void":
            self._refund_all_positions(bet_id)
            self.bets[bet_id].status = "finalized"
            return

        winning_total = int(b.side_a_total) if winning_side == "A" else int(b.side_b_total)
        losing_total = int(b.side_b_total) if winning_side == "A" else int(b.side_a_total)
        if winning_total <= 0:
            raise gl.vm.UserError("No winning positions to pay out")

        fee_amount = (losing_total * int(self.protocol_fee_bps)) // 10000
        distributable = losing_total - fee_amount

        allocated = 0
        for pid in self._bet_position_ids(bet_id):
            pos = self.positions[pid]
            if pos.side == winning_side:
                share = (int(pos.amount) * distributable) // winning_total
                payout_amount = int(pos.amount) + share
                allocated += share

                self.positions[pid].claimed = True
                self.positions[pid].payout_amount = i32(payout_amount)

                if payout_amount > 0:
                    payout_wei = u256(payout_amount) * u256(10**18)
                    _Recipient(Address(pos.backer)).emit_transfer(value=payout_wei)
            else:
                self.positions[pid].claimed = True
                self.positions[pid].payout_amount = i32(0)

        dust = distributable - allocated
        treasury_amount = fee_amount + dust
        if treasury_amount > 0:
            treasury_wei = u256(treasury_amount) * u256(10**18)
            _Recipient(Address(self.treasury)).emit_transfer(value=treasury_wei)

        self.bets[bet_id].status = "finalized"

    # ---------------------------------------------------------------------
    # admin
    # ---------------------------------------------------------------------

    @gl.public.write
    def set_protocol_fee(self, new_fee_bps: i32) -> None:
        self._only_admin()
        if int(new_fee_bps) < 0 or int(new_fee_bps) > 1000:
            raise gl.vm.UserError("Fee must be between 0 and 1000 bps (0-10%)")
        self.protocol_fee_bps = new_fee_bps

    @gl.public.write
    def set_treasury(self, new_treasury: str) -> None:
        self._only_admin()
        if len(new_treasury) == 0:
            raise gl.vm.UserError("Invalid treasury address")
        self.treasury = new_treasury

    # ---------------------------------------------------------------------
    # views
    # ---------------------------------------------------------------------

    @gl.public.view
    def get_bet(self, bet_id: str) -> Bet:
        if bet_id not in self.bets:
            raise gl.vm.UserError("Bet not found")
        return gl.storage.copy_to_memory(self.bets[bet_id])

    @gl.public.view
    def get_all_bets(self) -> list[Bet]:
        result = []
        for bid in self.bet_ids:
            result.append(gl.storage.copy_to_memory(self.bets[bid]))
        return result

    @gl.public.view
    def get_open_bets(self) -> list[Bet]:
        result = []
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        for bid in self.bet_ids:
            b = self.bets[bid]
            if b.status == "open" and now < int(b.resolve_at):
                result.append(gl.storage.copy_to_memory(b))
        return result

    @gl.public.view
    def get_position(self, position_id: str) -> Position:
        if position_id not in self.positions:
            raise gl.vm.UserError("Position not found")
        return gl.storage.copy_to_memory(self.positions[position_id])

    @gl.public.view
    def get_bet_positions(self, bet_id: str) -> list[Position]:
        if bet_id not in self.bets:
            raise gl.vm.UserError("Bet not found")
        result = []
        for pid in self._bet_position_ids(bet_id):
            result.append(gl.storage.copy_to_memory(self.positions[pid]))
        return result

    @gl.public.view
    def get_wallet_position(self, bet_id: str, wallet: str) -> Position:
        key = self._position_key(bet_id, wallet)
        if key not in self.position_lookup:
            raise gl.vm.UserError("No position found for this wallet on this bet")
        pid = self.position_lookup[key]
        return gl.storage.copy_to_memory(self.positions[pid])

    @gl.public.view
    def has_position(self, bet_id: str, wallet: str) -> bool:
        key = self._position_key(bet_id, wallet)
        return key in self.position_lookup

    @gl.public.view
    def has_been_appealed(self, bet_id: str) -> bool:
        return bet_id in self.appeal_used

    @gl.public.view
    def get_total_bets(self) -> i32:
        return self.bet_counter

    @gl.public.view
    def get_total_positions(self) -> i32:
        return self.position_counter