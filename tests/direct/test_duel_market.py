"""Direct-mode tests for DuelMarket. Web and LLM are mocked."""

import json

import pytest

CONTRACT = "contracts/duel_market.py"
ONE_GEN = 10**18


def deploy(direct_vm, direct_deploy, admin):
    direct_vm.sender = admin
    direct_vm.value = 0
    return direct_deploy(
        CONTRACT,
        str(admin),
        str(admin),
        200,
        60 * 60 * 1000,
        sdk_version="v0.2.16",
    )


def stake(direct_vm, amount_gen):
    direct_vm.value = amount_gen * ONE_GEN


def open_clean(contract, direct_vm):
    stake(direct_vm, 5)
    return contract.create_clean_market(
        "Will BTC be at least 70000?",
        "Yes, at least 70000",
        "No, below 70000",
        "https://data.example/btc",
        "",
        "bitcoin.usd",
        ">=",
        "70000",
        "A",
        5,
        1,
    )


def rejects(match):
    return pytest.raises(AssertionError, match=match)


def test_constructor_rejects_bad_fee(direct_vm, direct_deploy, direct_owner):
    direct_vm.sender = direct_owner
    with rejects("Fee must be between 0 and 1000"):
        direct_deploy(CONTRACT, str(direct_owner), str(direct_owner), 1001, 0, sdk_version="v0.2.16")


def test_create_clean_market_and_views(direct_vm, direct_deploy, direct_owner):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    bet_id = open_clean(contract, direct_vm)

    bet = contract.get_bet(bet_id)
    assert bet_id == "bet_1"
    assert bet.market_type == "clean"
    assert bet.status == "open"
    assert bet.creator.startswith("0x")
    assert int(bet.side_a_total) == 5
    assert int(bet.side_b_total) == 0
    assert int(contract.get_total_bets()) == 1
    assert contract.has_position(bet_id, bet.creator) is True


def test_create_clean_market_rejects_bad_inputs(direct_vm, direct_deploy, direct_owner):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    stake(direct_vm, 5)

    with rejects("Question too short"):
        contract.create_clean_market("short", "A", "B", "https://data.example/btc", "", "bitcoin.usd", ">=", "1", "A", 5, 1)
    with rejects("Invalid comparison operator"):
        contract.create_clean_market("Will BTC be at least 70000?", "A", "B", "https://data.example/btc", "", "bitcoin.usd", "!=", "1", "A", 5, 1)
    with rejects("target_value must be numeric"):
        contract.create_clean_market("Will BTC be at least 70000?", "A", "B", "https://data.example/btc", "", "bitcoin.usd", ">=", "high", "A", 5, 1)
    with rejects("Lock time must be at least 5"):
        contract.create_clean_market("Will BTC be at least 70000?", "A", "B", "https://data.example/btc", "", "bitcoin.usd", ">=", "1", "A", 4, 1)


def test_join_then_stranger_cannot_appeal(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    bet_id = open_clean(contract, direct_vm)

    direct_vm.sender = direct_alice
    stake(direct_vm, 5)
    contract.join_bet(bet_id, "B")
    assert int(contract.get_bet(bet_id).side_b_total) == 5

    direct_vm.warp("2099-01-01T00:00:00Z")
    direct_vm.mock_web(r"data\.example/btc", {"status": 200, "body": json.dumps({"bitcoin": {"usd": 71000}})})
    contract.resolve_market(bet_id)
    bet = contract.get_bet(bet_id)
    assert bet.status == "pending_appeal"
    assert bet.winning_side == "A"

    direct_vm.sender = direct_bob
    with rejects("Only a participant in this bet can appeal"):
        contract.dispute_resolution(bet_id, "Bob was not in this market")

    assert contract.has_been_appealed(bet_id) is False
    assert contract.get_bet(bet_id).winning_side == "A"


def test_participant_can_appeal_once(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    bet_id = open_clean(contract, direct_vm)
    direct_vm.sender = direct_alice
    stake(direct_vm, 5)
    contract.join_bet(bet_id, "B")

    direct_vm.warp("2099-01-01T00:00:00Z")
    direct_vm.mock_web(r"data\.example/btc", {"status": 200, "body": json.dumps({"bitcoin": {"usd": 71000}})})
    contract.resolve_market(bet_id)

    direct_vm.clear_mocks()
    direct_vm.mock_web(r"data\.example/btc", {"status": 200, "body": json.dumps({"bitcoin": {"usd": 69000}})})
    direct_vm.mock_llm(r"reviewing an appeal", json.dumps({"winning_side": "B", "reasoning": "fresh read says below threshold"}))
    contract.dispute_resolution(bet_id, "The published price was below the line")

    assert contract.has_been_appealed(bet_id) is True
    assert contract.get_bet(bet_id).status == "appeal_resolved"
    with rejects("Bet not eligible for appeal"):
        contract.dispute_resolution(bet_id, "A second appeal must fail")


def test_cancel_only_while_one_sided(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    bet_id = open_clean(contract, direct_vm)

    direct_vm.sender = direct_bob
    with rejects("Only the creator or admin can cancel"):
        contract.cancel_bet(bet_id)

    direct_vm.sender = direct_alice
    stake(direct_vm, 5)
    contract.join_bet(bet_id, "B")
    direct_vm.sender = direct_owner
    with rejects("both sides have participants"):
        contract.cancel_bet(bet_id)