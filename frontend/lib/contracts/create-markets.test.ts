import test from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "viem";
import DuelMarket from "./DuelMarket";

const clean = {
  params: {
    question: "Will BTC be at least 70000?",
    sideALabel: "Yes",
    sideBLabel: "No",
    evidenceUrl: "https://data.example/btc",
    evidenceUrlFallback: "",
    jsonFieldPath: "bitcoin.usd",
    comparison: ">=" as const,
    targetValue: "70000",
    creatorSide: "A" as const,
    lockMinutes: 5,
    minStake: 1,
    stakeGen: 5,
  },
};

const vibe = {
  params: {
    question: "Did the cited page say the match ended in a draw?",
    sideALabel: "Yes",
    sideBLabel: "No",
    evidenceUrl: "https://www.bbc.com/sport",
    evidenceUrlFallback: "",
    resolutionCriteria: "Side A wins only if the page explicitly says draw.",
    creatorSide: "A" as const,
    lockMinutes: 5,
    minStake: 1,
    stakeGen: 5,
  },
};

function capture(market: DuelMarket) {
  const calls: any[] = [];
  (market as any).write = async (...args: any[]) => {
    calls.push(args);
    return {};
  };
  return calls;
}

test("createCleanMarket sends the unwrapped fields and stake", async () => {
  const market = new DuelMarket("0x1111111111111111111111111111111111111111");
  const calls = capture(market);

  await market.createCleanMarket(clean);

  assert.equal(calls[0][0], "create_clean_market");
  assert.deepEqual(calls[0][1], [
    clean.params.question,
    clean.params.sideALabel,
    clean.params.sideBLabel,
    clean.params.evidenceUrl,
    "",
    clean.params.jsonFieldPath,
    clean.params.comparison,
    clean.params.targetValue,
    clean.params.creatorSide,
    clean.params.lockMinutes,
    clean.params.minStake,
  ]);
  assert.equal(calls[0][2], parseEther("5"));
});

test("createVibeMarket sends the unwrapped fields and stake", async () => {
  const market = new DuelMarket("0x1111111111111111111111111111111111111111");
  const calls = capture(market);

  await market.createVibeMarket(vibe);

  assert.equal(calls[0][0], "create_vibe_market");
  assert.equal(calls[0][1][5], vibe.params.resolutionCriteria);
  assert.equal(calls[0][1][8], vibe.params.minStake);
  assert.equal(calls[0][2], parseEther("5"));
});