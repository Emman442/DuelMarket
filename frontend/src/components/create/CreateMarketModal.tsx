import React, { useState } from 'react';
import { useMarkets } from '../../context/MarketContext';
import { MarketType, MarketSide, Market } from '../../types/market';

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarketCreated: (newMarketId: string) => void;
}

export const CreateMarketModal: React.FC<CreateMarketModalProps> = ({
  isOpen,
  onClose,
  onMarketCreated,
}) => {
  const { userBalance, isWalletConnected, connectWallet, createMarket } = useMarkets();

  // Multi-step flow: 1: Question & Sides, 2: Resolution Rule, 3: Stake & Lock, 4: Review
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [marketType, setMarketType] = useState<MarketType>('clean');

  // Step 1: Question and Sides
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('Crypto');
  const [sideALabel, setSideALabel] = useState('Yes / True');
  const [sideBLabel, setSideBLabel] = useState('No / False');

  // Step 2: Clean parameters
  const [cleanSourceName, setCleanSourceName] = useState('Binance / CoinGecko Median Feed');
  const [cleanSourceUrl, setCleanSourceUrl] = useState('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
  const [cleanMetricKey, setCleanMetricKey] = useState('BTCUSDT.price_close_utc');
  const [cleanOperator, setCleanOperator] = useState<'>=' | '<=' | '==' | '>' | '<'>('>=');
  const [cleanThreshold, setCleanThreshold] = useState('100000');

  // Step 2: Vibe parameters
  const [vibeCriteria, setVibeCriteria] = useState(
    'Resolution requires an official announcement or public filing published by the organization before the resolution deadline. Uncorroborated social media rumors and speculative opinion pieces do not constitute valid proof.'
  );
  const [vibeDomains, setVibeDomains] = useState('bloomberg.com, reuters.com, wsj.com');

  // Step 3: Stake & Lock
  const [creatorSide, setCreatorSide] = useState<MarketSide>('A');
  const [creatorStake, setCreatorStake] = useState('200');
  const [lockDurationDays, setLockDurationDays] = useState('7');

  if (!isOpen) return null;

  const parsedStake = parseFloat(creatorStake) || 0;
  const lockTimestamp = Date.now() + parseInt(lockDurationDays) * 24 * 3600 * 1000;
  const resolutionDeadline = lockTimestamp + 7 * 24 * 3600 * 1000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWalletConnected) {
      connectWallet();
      return;
    }
    if (parsedStake > userBalance) {
      alert(`Insufficient GEN balance for initial stake. You have ${userBalance} GEN.`);
      return;
    }

    const marketPayload: Partial<Market> = {
      type: marketType,
      question: question.trim(),
      category,
      sideA: { label: sideALabel.trim() },
      sideB: { label: sideBLabel.trim() },
      creatorSide,
      creatorStake: parsedStake,
      lockTimestamp,
      resolutionDeadline,
      cleanRule:
        marketType === 'clean'
          ? {
              dataSourceName: cleanSourceName,
              dataSourceUrl: cleanSourceUrl,
              metricIdentifier: cleanMetricKey,
              targetOperator: cleanOperator,
              thresholdValue: parseFloat(cleanThreshold) || 0,
              formattedTarget: `${cleanOperator} ${cleanThreshold}`,
            }
          : undefined,
      vibeRule:
        marketType === 'vibe'
          ? {
              resolutionCriteria: vibeCriteria.trim(),
              evidenceDomains: vibeDomains
                .split(',')
                .map((d) => d.trim().replace(/^https?:\/\//, ''))
                .filter(Boolean),
              evaluatorModel: 'DuelArbitrator v1.4 (Public Evidence Grounding)',
            }
          : undefined,
    };

    const newId = createMarket(marketPayload);
    onMarketCreated(newId);
    onClose();
  };

  const isStep1Valid = question.trim().length >= 10 && sideALabel.trim() && sideBLabel.trim();
  const isStep2Valid =
    marketType === 'clean'
      ? cleanSourceName.trim() && cleanMetricKey.trim() && cleanThreshold.trim()
      : vibeCriteria.trim().length >= 20;
  const isStep3Valid = parsedStake > 0 && parsedStake <= userBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#DCD6CC] rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header with Type Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E0DAD0] pb-5">
          <div className="space-y-1">
            <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#736B63]">
              Step 0{currentStep} of 04 · Deploy Protocol Duel
            </div>
            <h2 className="text-2xl font-bold text-[#1E1B18]">
              Create New Prediction Market
            </h2>
          </div>

          {/* Clean vs Vibe Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-[#EAE5DC] rounded-full self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMarketType('clean')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                marketType === 'clean'
                  ? 'bg-white text-[#1E1B18] shadow-xs'
                  : 'text-[#6B645C] hover:text-[#1E1B18]'
              }`}
            >
              Clean (Oracle)
            </button>
            <button
              type="button"
              onClick={() => setMarketType('vibe')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                marketType === 'vibe'
                  ? 'bg-white text-[#1E1B18] shadow-xs'
                  : 'text-[#6B645C] hover:text-[#1E1B18]'
              }`}
            >
              Vibe (Evidence)
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2 text-xs border-b border-[#EAE4D9] pb-4">
          <div
            className={`font-semibold ${
              currentStep >= 1 ? 'text-[#BA401B]' : 'text-[#8C8479]'
            }`}
          >
            1. Question & Sides
          </div>
          <div
            className={`font-semibold ${
              currentStep >= 2 ? 'text-[#BA401B]' : 'text-[#8C8479]'
            }`}
          >
            2. Resolution Rule
          </div>
          <div
            className={`font-semibold ${
              currentStep >= 3 ? 'text-[#BA401B]' : 'text-[#8C8479]'
            }`}
          >
            3. Stake & Lock
          </div>
          <div
            className={`font-semibold ${
              currentStep >= 4 ? 'text-[#BA401B]' : 'text-[#8C8479]'
            }`}
          >
            4. Review
          </div>
        </div>

        {/* Multi-step Form Content */}
        <div>
          {/* STEP 1: Question and Sides */}
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
                  State the proposition clearly without subjective vagueness.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-4 py-2.5 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none cursor-pointer"
                >
                  <option value="Crypto">Crypto</option>
                  <option value="Macroeconomics">Macroeconomics</option>
                  <option value="Technology">Technology</option>
                  <option value="Policy & Law">Policy & Law</option>
                  <option value="Aerospace & Science">Aerospace & Science</option>
                  <option value="Culture">Culture</option>
                </select>
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

          {/* STEP 2: Evidence Source & Resolution Rule */}
          {currentStep === 2 && (
            <div className="space-y-5">
              {marketType === 'clean' ? (
                <div className="space-y-4">
                  <div className="p-3 bg-[#F4EFE6] rounded-xl border border-[#E5DFD4] text-xs text-[#524B42]">
                    <strong>Clean Resolution:</strong> Sourced directly from a public API endpoint or on-chain feed. No human intervention or arbitrator discretion.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                        Data Source Name
                      </label>
                      <input
                        type="text"
                        value={cleanSourceName}
                        onChange={(e) => setCleanSourceName(e.target.value)}
                        className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-medium text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                        Metric Identifier Key
                      </label>
                      <input
                        type="text"
                        value={cleanMetricKey}
                        onChange={(e) => setCleanMetricKey(e.target.value)}
                        className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-mono text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                      Oracle API Endpoint
                    </label>
                    <input
                      type="url"
                      value={cleanSourceUrl}
                      onChange={(e) => setCleanSourceUrl(e.target.value)}
                      className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-medium text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                        Comparison Operator
                      </label>
                      <select
                        value={cleanOperator}
                        onChange={(e) => setCleanOperator(e.target.value as any)}
                        className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none cursor-pointer"
                      >
                        <option value=">=">&gt;= (Greater or Equal)</option>
                        <option value="<=">&lt;= (Less or Equal)</option>
                        <option value=">">&gt; (Strictly Greater)</option>
                        <option value="<">&lt; (Strictly Less)</option>
                        <option value="==">== (Exact Equality)</option>
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
                    <strong>Vibe Resolution:</strong> Evaluated strictly against the plain text criteria you provide, referencing public journalistic records and primary source publications.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                      Resolution Criteria (Plain English)
                    </label>
                    <textarea
                      rows={5}
                      value={vibeCriteria}
                      onChange={(e) => setVibeCriteria(e.target.value)}
                      placeholder="Specify what constitutes valid proof, cutoff times, and explicit disqualifiers..."
                      className="w-full bg-white border border-[#DCD6CC] rounded-xl p-3 text-xs leading-relaxed text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                    />
                    <span className="text-[11px] text-[#7A7369]">
                      Both participants read this criteria prior to staking. Ambiguity harms your appeal chances.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                      Permitted Evidence Domains (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={vibeDomains}
                      onChange={(e) => setVibeDomains(e.target.value)}
                      className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-mono text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                    />
                    <span className="text-[11px] text-[#7A7369]">
                      e.g. bloomberg.com, reuters.com, justice.gov, press.org
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Initial Stake & Lock Time */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                  Choose Your Staked Side
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreatorSide('A')}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      creatorSide === 'A'
                        ? 'border-[#BA401B] bg-[#FAF3F0] text-[#BA401B] ring-1 ring-[#BA401B]'
                        : 'border-[#DCD6CC] bg-white text-[#1E1B18]'
                    }`}
                  >
                    <span className="text-[10px] font-bold block uppercase tracking-wider">Side A</span>
                    <span className="font-bold text-sm block mt-0.5">{sideALabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreatorSide('B')}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      creatorSide === 'B'
                        ? 'border-[#1E1B18] bg-[#F5F2ED] text-[#1E1B18] ring-1 ring-[#1E1B18]'
                        : 'border-[#DCD6CC] bg-white text-[#1E1B18]'
                    }`}
                  >
                    <span className="text-[10px] font-bold block uppercase tracking-wider text-[#7A7369]">Side B</span>
                    <span className="font-bold text-sm block mt-0.5">{sideBLabel}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-[#1E1B18] uppercase tracking-wider">
                    Initial Deposit Stake (GEN)
                  </label>
                  <span className="text-[#7A7369]">
                    Balance: <strong className="font-mono text-[#1E1B18]">{userBalance.toLocaleString()} GEN</strong>
                  </span>
                </div>
                <input
                  type="number"
                  min="10"
                  max={userBalance}
                  value={creatorStake}
                  onChange={(e) => setCreatorStake(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-4 py-2.5 text-base font-semibold text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                  Lock Duration (Time to Freeze Staking)
                </label>
                <select
                  value={lockDurationDays}
                  onChange={(e) => setLockDurationDays(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-4 py-2 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none cursor-pointer"
                >
                  <option value="1">24 Hours (Fast duel)</option>
                  <option value="3">3 Days</option>
                  <option value="7">7 Days (1 Week standard)</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 4: Review Step */}
          {currentStep === 4 && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#F5F1EB] rounded-xl border border-[#E5DFD4] space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7369] block">Claim</span>
                  <p className="text-sm font-bold text-[#1E1B18] mt-0.5">{question}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E8E2D7]">
                  <div>
                    <span className="text-[10px] uppercase text-[#7A7369] block">Type</span>
                    <span className="font-semibold text-[#1E1B18] capitalize">{marketType} Market</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#7A7369] block">Category</span>
                    <span className="font-semibold text-[#1E1B18]">{category}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E8E2D7]">
                  <div>
                    <span className="text-[10px] uppercase text-[#7A7369] block">Side A</span>
                    <span className="font-semibold text-[#BA401B]">{sideALabel}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#7A7369] block">Side B</span>
                    <span className="font-semibold text-[#1E1B18]">{sideBLabel}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8E2D7]">
                  <span className="text-[10px] uppercase text-[#7A7369] block">
                    {marketType === 'clean' ? 'Oracle Rule' : 'Resolution Criteria'}
                  </span>
                  <p className="text-[#3E3832] font-mono text-[11px] mt-0.5">
                    {marketType === 'clean'
                      ? `${cleanSourceName} -> ${cleanOperator} ${cleanThreshold}`
                      : vibeCriteria.slice(0, 140) + '...'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E8E2D7]">
                  <div>
                    <span className="text-[10px] uppercase text-[#7A7369] block">Your Initial Stake</span>
                    <span className="font-bold text-[#1E1B18] font-mono text-sm">
                      {parsedStake} GEN on Side {creatorSide}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#7A7369] block">Locks On</span>
                    <span className="font-medium text-[#1E1B18]">
                      {new Date(lockTimestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#7A7369] leading-relaxed">
                By deploying this contract, {parsedStake} GEN will be escrowed. Counter-parties can immediately stake against you to form the reciprocal pool.
              </p>
            </div>
          )}
        </div>

        {/* Step Navigation Buttons */}
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
              onClick={onClose}
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
              onClick={handleSubmit}
              className="px-7 py-3 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-xs font-bold tracking-wide transition-all shadow-none hover:-translate-y-0.5 cursor-pointer"
            >
              Deploy Duel & Escrow {parsedStake} GEN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
