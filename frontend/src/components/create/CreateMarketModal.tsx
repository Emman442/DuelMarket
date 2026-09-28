import React, { useState } from "react";
import { useWallet } from "@/lib/genlayer/wallet";
import {
  useCreateCleanMarket,
  useCreateVibeMarket,
} from "@/lib/hooks/useDuelMarket";
import type { BetSide, ComparisonOp, MarketType } from "@/lib/contracts/types";
import { toast } from "sonner";

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateMarketModal: React.FC<CreateMarketModalProps> = ({
  isOpen,
  onClose,
}) => {
  const userBalance = 1000;
  const { address, connectWallet } = useWallet();
  const isWalletConnected = Boolean(address);

  const { createCleanMarketAsync, isCreating: isCreatingClean } =
    useCreateCleanMarket();
  const { createVibeMarketAsync, isCreating: isCreatingVibe } =
    useCreateVibeMarket();
  const isSubmitting = isCreatingClean || isCreatingVibe;

  const [currentStep, setCurrentStep] = useState(1);
  const [marketType, setMarketType] = useState<MarketType>("clean");

  const [question, setQuestion] = useState("");
  const [sideALabel, setSideALabel] = useState("Yes / True");
  const [sideBLabel, setSideBLabel] = useState("No / False");

  const [cleanSourceUrl, setCleanSourceUrl] = useState(
    "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
  );
  const [cleanFallbackUrl, setCleanFallbackUrl] = useState("");
  const [cleanMetricKey, setCleanMetricKey] = useState("price");
  const [cleanOperator, setCleanOperator] = useState<ComparisonOp>(">=");
  const [cleanThreshold, setCleanThreshold] = useState("100000");

  const [vibeCriteria, setVibeCriteria] = useState(
    "Resolution requires an official announcement or public filing published by the organization before the resolution deadline. Uncorroborated social media rumors and speculative opinion pieces do not constitute valid proof."
  );
  const [vibeEvidenceUrl, setVibeEvidenceUrl] = useState("");
  const [vibeFallbackUrl, setVibeFallbackUrl] = useState("");

  const [creatorSide, setCreatorSide] = useState<BetSide>("A");
  const [creatorStake, setCreatorStake] = useState("200");
  const [lockDurationDays, setLockDurationDays] = useState("7");
  const [minStake, setMinStake] = useState("1");

  if (!isOpen) return null;

  const parsedStake = Math.floor(parseFloat(creatorStake) || 0);
  const parsedMinStake = Math.max(1, Math.floor(parseFloat(minStake) || 1));
  const lockMinutes = Math.max(5, parseInt(lockDurationDays, 10) * 24 * 60);
  const lockTimestamp = Date.now() + lockMinutes * 60 * 1000;

  const resetAndClose = () => {
    setCurrentStep(1);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isWalletConnected) {
      connectWallet?.();
      toast.error("Connect your wallet to deploy a market.");
      return;
    }
    if (parsedStake < parsedMinStake) {
      toast.error(`Stake must be at least ${parsedMinStake} GEN.`);
      return;
    }
    if (parsedStake > userBalance) {
      toast.error(`Insufficient GEN. You have ${userBalance} GEN.`);
      return;
    }

    try {
      if (marketType === "clean") {
        await createCleanMarketAsync({
          params: {
            question: question.trim(),
            sideALabel: sideALabel.trim(),
            sideBLabel: sideBLabel.trim(),
            evidenceUrl: cleanSourceUrl.trim(),
            evidenceUrlFallback: cleanFallbackUrl.trim(),
            jsonFieldPath: cleanMetricKey.trim(),
            comparison: cleanOperator,
            targetValue: cleanThreshold.trim(),
            creatorSide,
            lockMinutes,
            minStake: parsedMinStake,
            stakeGen: parsedStake,
          },
        });
      } else {
        await createVibeMarketAsync({
          params: {
            question: question.trim(),
            sideALabel: sideALabel.trim(),
            sideBLabel: sideBLabel.trim(),
            evidenceUrl: vibeEvidenceUrl.trim(),
            evidenceUrlFallback: vibeFallbackUrl.trim(),
            resolutionCriteria: vibeCriteria.trim(),
            creatorSide,
            lockMinutes,
            minStake: parsedMinStake,
            stakeGen: parsedStake,
          },
        });
      }
      resetAndClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create market");
    }
  };

  const isStep1Valid =
    question.trim().length >= 10 &&
    sideALabel.trim().length >= 1 &&
    sideBLabel.trim().length >= 1 &&
    sideALabel.trim() !== sideBLabel.trim();

  const isStep2Valid =
    marketType === "clean"
      ? cleanSourceUrl.startsWith("http") &&
        cleanMetricKey.trim().length >= 1 &&
        cleanThreshold.trim().length >= 1 &&
        (cleanFallbackUrl === "" || cleanFallbackUrl.startsWith("http"))
      : vibeCriteria.trim().length >= 10 &&
        vibeEvidenceUrl.startsWith("http") &&
        (vibeFallbackUrl === "" || vibeFallbackUrl.startsWith("http"));

  const isStep3Valid =
    parsedStake >= parsedMinStake && parsedStake <= userBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#DCD6CC] rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E0DAD0] pb-5">
          <div className="space-y-1">
            <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#736B63]">
              Step 0{currentStep} of 04 · Deploy Protocol Duel
            </div>
            <h2 className="text-2xl font-bold text-[#1E1B18]">
              Create New Prediction Market
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#EAE5DC] rounded-full self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMarketType("clean")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                marketType === "clean"
                  ? "bg-white text-[#1E1B18] shadow-xs"
                  : "text-[#6B645C] hover:text-[#1E1B18]"
              }`}
            >
              Clean (Oracle)
            </button>
            <button
              type="button"
              onClick={() => setMarketType("vibe")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                marketType === "vibe"
                  ? "bg-white text-[#1E1B18] shadow-xs"
                  : "text-[#6B645C] hover:text-[#1E1B18]"
              }`}
            >
              Vibe (Evidence)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs border-b border-[#EAE4D9] pb-4">
          {["1. Question & Sides", "2. Resolution Rule", "3. Stake & Lock", "4. Review"].map(
            (label, index) => (
              <div
                key={label}
                className={`font-semibold ${
                  currentStep >= index + 1 ? "text-[#BA401B]" : "text-[#8C8479]"
                }`}
              >
                {label}
              </div>
            )
          )}
        </div>

        <div>
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                  Market Question / Claim
                </label>
                <input
                  type="text"
                  placeholder="e.g., Will Bitcoin exceed $120,000 USD before December 31, 2026?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-4 py-2.5 text-sm font-medium text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
                <span className="text-[11px] text-[#7A7369]">
                  At least 10 characters. This is stored on-chain as-is.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#BA401B] uppercase tracking-wider block">
                    Side A Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Yes / Exceeds"
                    value={sideALabel}
                    onChange={(e) => setSideALabel(e.target.value)}
                    className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-medium text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#423C35] uppercase tracking-wider block">
                    Side B Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. No / Fails to Exceed"
                    value={sideBLabel}
                    onChange={(e) => setSideBLabel(e.target.value)}
                    className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-medium text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              {marketType === "clean" ? (
                <div className="space-y-4">
                  <div className="p-3 bg-[#F4EFE6] rounded-xl border border-[#E5DFD4] text-xs text-[#524B42]">
                    <strong>Clean Resolution:</strong> Side A wins if the JSON
                    field at the evidence URL satisfies the comparison.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                      Evidence URL
                    </label>
                    <input
                      type="url"
                      value={cleanSourceUrl}
                      onChange={(e) => setCleanSourceUrl(e.target.value)}
                      className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-medium text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                      Fallback URL (optional)
                    </label>
                    <input
                      type="url"
                      value={cleanFallbackUrl}
                      onChange={(e) => setCleanFallbackUrl(e.target.value)}
                      className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-medium text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                      JSON Field Path
                    </label>
                    <input
                      type="text"
                      value={cleanMetricKey}
                      onChange={(e) => setCleanMetricKey(e.target.value)}
                      placeholder="e.g. bitcoin.usd or price"
                      className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-mono text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                        Comparison
                      </label>
                      <select
                        value={cleanOperator}
                        onChange={(e) =>
                          setCleanOperator(e.target.value as ComparisonOp)
                        }
                        className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none cursor-pointer"
                      >
                        <option value=">=">&gt;=</option>
                        <option value="<=">&lt;=</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value="==">==</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                        Target Value
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={cleanThreshold}
                        onChange={(e) => setCleanThreshold(e.target.value)}
                        className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-mono text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-[#F4EFE6] rounded-xl border border-[#E5DFD4] text-xs text-[#524B42]">
                    <strong>Vibe Resolution:</strong> Validators fetch the
                    evidence URL and judge it against your criteria.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                      Evidence URL
                    </label>
                    <input
                      type="url"
                      value={vibeEvidenceUrl}
                      onChange={(e) => setVibeEvidenceUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-medium text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                      Fallback URL (optional)
                    </label>
                    <input
                      type="url"
                      value={vibeFallbackUrl}
                      onChange={(e) => setVibeFallbackUrl(e.target.value)}
                      className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-medium text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                      Resolution Criteria
                    </label>
                    <textarea
                      rows={5}
                      value={vibeCriteria}
                      onChange={(e) => setVibeCriteria(e.target.value)}
                      className="w-full bg-white border border-[#DCD6CC] rounded-xl p-3 text-xs leading-relaxed text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                  Choose Your Staked Side
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreatorSide("A")}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      creatorSide === "A"
                        ? "border-[#BA401B] bg-[#FAF3F0] text-[#BA401B] ring-1 ring-[#BA401B]"
                        : "border-[#DCD6CC] bg-white text-[#1E1B18]"
                    }`}
                  >
                    <span className="text-[10px] font-bold block uppercase tracking-wider">
                      Side A
                    </span>
                    <span className="font-bold text-sm block mt-0.5">
                      {sideALabel}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatorSide("B")}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      creatorSide === "B"
                        ? "border-[#1E1B18] bg-[#F5F2ED] text-[#1E1B18] ring-1 ring-[#1E1B18]"
                        : "border-[#DCD6CC] bg-white text-[#1E1B18]"
                    }`}
                  >
                    <span className="text-[10px] font-bold block uppercase tracking-wider text-[#7A7369]">
                      Side B
                    </span>
                    <span className="font-bold text-sm block mt-0.5">
                      {sideBLabel}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-[#1E1B18] uppercase tracking-wider">
                    Initial Stake (whole GEN)
                  </label>
                  <span className="text-[#7A7369]">
                    Balance:{" "}
                    <strong className="font-mono text-[#1E1B18]">
                      {userBalance.toLocaleString()} GEN
                    </strong>
                  </span>
                </div>
                <input
                  type="number"
                  min={parsedMinStake}
                  step="1"
                  max={userBalance}
                  value={creatorStake}
                  onChange={(e) => setCreatorStake(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-4 py-2.5 text-base font-semibold text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                  Minimum Stake For Joiners (GEN)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={minStake}
                  onChange={(e) => setMinStake(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                  Lock Duration
                </label>
                <select
                  value={lockDurationDays}
                  onChange={(e) => setLockDurationDays(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-4 py-2 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none cursor-pointer"
                >
                  <option value="1">24 Hours</option>
                  <option value="3">3 Days</option>
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#F5F1EB] rounded-xl border border-[#E5DFD4] space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7369] block">
                    Claim
                  </span>
                  <p className="text-sm font-bold text-[#1E1B18] mt-0.5">
                    {question}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E8E2D7]">
                  <div>
                    <span className="text-[10px] uppercase text-[#7A7369] block">
                      Type
                    </span>
                    <span className="font-semibold text-[#1E1B18] capitalize">
                      {marketType} market
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#7A7369] block">
                      Locks
                    </span>
                    <span className="font-semibold text-[#1E1B18]">
                      {new Date(lockTimestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E8E2D7]">
                  <div>
                    <span className="text-[10px] uppercase text-[#7A7369] block">
                      Side A
                    </span>
                    <span className="font-semibold text-[#BA401B]">
                      {sideALabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#7A7369] block">
                      Side B
                    </span>
                    <span className="font-semibold text-[#1E1B18]">
                      {sideBLabel}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#E8E2D7]">
                  <span className="text-[10px] uppercase text-[#7A7369] block">
                    {marketType === "clean" ? "Oracle rule" : "Criteria"}
                  </span>
                  <p className="text-[#3E3832] font-mono text-[11px] mt-0.5">
                    {marketType === "clean"
                      ? `${cleanMetricKey} ${cleanOperator} ${cleanThreshold}`
                      : vibeCriteria.slice(0, 140)}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#E8E2D7]">
                  <span className="text-[10px] uppercase text-[#7A7369] block">
                    Your stake
                  </span>
                  <span className="font-bold text-[#1E1B18] font-mono text-sm">
                    {parsedStake} GEN on Side {creatorSide}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#E0DAD0]">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-5 py-2.5 rounded-full border border-[#DCD6CC] text-xs font-semibold text-[#6B645C] hover:text-[#1E1B18] transition-colors cursor-pointer"
            >
              ← Back
            </button>
          ) : (
            <button
              type="button"
              onClick={resetAndClose}
              className="px-5 py-2.5 text-xs font-semibold text-[#6B645C] hover:text-[#1E1B18] cursor-pointer"
            >
              Cancel
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              disabled={
                (currentStep === 1 && !isStep1Valid) ||
                (currentStep === 2 && !isStep2Valid) ||
                (currentStep === 3 && !isStep3Valid)
              }
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-6 py-2.5 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-xs font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Continue to Step 0{currentStep + 1} →
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-7 py-3 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-xs font-bold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting
                ? "Deploying..."
                : `Deploy Duel & Escrow ${parsedStake} GEN`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};