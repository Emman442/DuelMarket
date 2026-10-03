import test from "node:test";
import assert from "node:assert/strict";

function unwrap(input) {
  return input?.params ?? input;
}

function cleanArgs(params) {
  return [
    params.question,
    params.sideALabel,
    params.sideBLabel,
    params.evidenceUrl,
    params.evidenceUrlFallback ?? "",
    params.jsonFieldPath,
    params.comparison,
    params.targetValue,
    params.creatorSide,
    params.lockMinutes,
    params.minStake,
  ];
}

function vibeArgs(params) {
  return [
    params.question,
    params.sideALabel,
    params.sideBLabel,
    params.evidenceUrl,
    params.evidenceUrlFallback ?? "",
    params.resolutionCriteria,
    params.creatorSide,
    params.lockMinutes,
    params.minStake,
  ];
}

const clean = {
  params: {
    question: "Will BTC be at least 70000?",
    sideALabel: "Yes",
    sideBLabel: "No",
    evidenceUrl: "https://data.example/btc",
    evidenceUrlFallback: "",
    jsonFieldPath: "bitcoin.usd",
    comparison: ">=",
    targetValue: "70000",
    creatorSide: "A",
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
    creatorSide: "A",
    lockMinutes: 5,
    minStake: 1,
    stakeGen: 5,
  },
};

test("clean modal payload unwraps arguments and stake", () => {
  const params = unwrap(clean);
  assert.equal(params.params, undefined);
  assert.deepEqual(cleanArgs(params), [
    "Will BTC be at least 70000?",
    "Yes",
    "No",
    "https://data.example/btc",
    "",
    "bitcoin.usd",
    ">=",
    "70000",
    "A",
    5,
    1,
  ]);
  assert.equal(String(params.stakeGen), "5");
});

test("vibe modal payload unwraps arguments and stake", () => {
  const params = unwrap(vibe);
  assert.equal(params.params, undefined);
  assert.equal(vibeArgs(params)[5], vibe.params.resolutionCriteria);
  assert.equal(vibeArgs(params)[8], 1);
  assert.equal(String(params.stakeGen), "5");
});