import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Inputs = {
  rentMonthly: string;
  rentMgmtMonthly: string;
  rentRenewalFee: string;
  purchasePrice: string;
  purchaseFeeRatePct: string;
  downPayment: string;
  annualInterestRatePct: string;
  loanYears: string;
  ownershipMonthlyFee: string;
  propertyTaxAnnual: string;
  fireInsurancePer5Years: string;
  saleCostRatePct: string;
  baseRatePct: string;
  projectionYears: string;
};

type Row = {
  year: number;
  cumulativeRent: number;
  cumulativePurchaseCash: number;
  remainingBalance: number;
  salePriceAfterCost: number;
  finalNetProceeds: number;
  housingCost: number;
  averageAnnualHousingCost: number;
  cumulativeDifferenceVsRent: number;
  annualDifferenceVsRent: number;
};

const defaultInputs: Inputs = {
  rentMonthly: '72000',
  rentMgmtMonthly: '2000',
  rentRenewalFee: '72000',
  purchasePrice: '32800000',
  purchaseFeeRatePct: '10',
  downPayment: '15000000',
  annualInterestRatePct: '0.60',
  loanYears: '35',
  ownershipMonthlyFee: '39000',
  propertyTaxAnnual: '100000',
  fireInsurancePer5Years: '100000',
  saleCostRatePct: '4',
  baseRatePct: '-0.5',
  projectionYears: '35',
};

function fmtYen(value: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function fmtPct(value: number) {
  return `${value.toFixed(2)}%`;
}

function valueClass(value: number) {
  return value < 0 ? 'negative' : '';
}

function diffLabel(value: number) {
  if (value > 0) return '賃貸有利';
  if (value < 0) return '購入有利';
  return 'トントン';
}

function parseNumber(value: string) {
  const cleaned = value.replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function pmt(rate: number, nper: number, pv: number) {
  if (nper <= 0) return 0;
  if (rate === 0) return -(pv / nper);
  return -(rate * pv * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
}

function fv(rate: number, nper: number, payment: number, pv: number) {
  if (rate === 0) return -(pv + payment * nper);
  return -(pv * Math.pow(1 + rate, nper) + payment * ((Math.pow(1 + rate, nper) - 1) / rate));
}

function App() {
  const [inputs, setInputs] = useState<Inputs>(defaultInputs);

  const update = (key: keyof Inputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const result = useMemo(() => {
    const rentMonthly = parseNumber(inputs.rentMonthly);
    const rentMgmtMonthly = parseNumber(inputs.rentMgmtMonthly);
    const rentRenewalFee = parseNumber(inputs.rentRenewalFee);
    const purchasePrice = parseNumber(inputs.purchasePrice);
    const purchaseFeeRate = parseNumber(inputs.purchaseFeeRatePct) / 100;
    const downPayment = parseNumber(inputs.downPayment);
    const annualInterestRate = parseNumber(inputs.annualInterestRatePct) / 100;
    const loanYears = parseNumber(inputs.loanYears);
    const ownershipMonthlyFee = parseNumber(inputs.ownershipMonthlyFee);
    const propertyTaxAnnual = parseNumber(inputs.propertyTaxAnnual);
    const fireInsurancePer5Years = parseNumber(inputs.fireInsurancePer5Years);
    const saleCostRate = parseNumber(inputs.saleCostRatePct) / 100;
    const projectionYears = Math.max(1, Math.floor(parseNumber(inputs.projectionYears)));
    const baseRate = parseNumber(inputs.baseRatePct) / 100;

    const purchaseFees = purchasePrice * purchaseFeeRate;
    const loanPrincipal = Math.max(0, purchasePrice + purchaseFees - downPayment);
    const monthlyRate = annualInterestRate / 12;
    const totalMonths = loanYears * 12;
    const monthlyLoanPayment = loanPrincipal > 0 ? -pmt(monthlyRate, totalMonths, loanPrincipal) : 0;
    const annualLoanPayment = monthlyLoanPayment * 12;

    const rentAnnual = (rentMonthly + rentMgmtMonthly) * 12 + rentRenewalFee / 2;
    const purchaseAnnualCash =
      annualLoanPayment + ownershipMonthlyFee * 12 + propertyTaxAnnual + fireInsurancePer5Years / 5;
    const monthlyHousingCash =
      monthlyLoanPayment + ownershipMonthlyFee + propertyTaxAnnual / 12 + fireInsurancePer5Years / 60;

    const rows: Row[] = Array.from({ length: projectionYears }, (_, idx) => {
      const year = idx + 1;
      const monthsElapsed = Math.min(year * 12, totalMonths);
      const remainingBalance =
        loanPrincipal > 0 ? Math.max(0, -fv(monthlyRate, monthsElapsed, -monthlyLoanPayment, loanPrincipal)) : 0;
      const cumulativeRent = rentAnnual * year;
      const cumulativePurchaseCash = purchaseAnnualCash * year;
      const salePriceAfterCost = purchasePrice * Math.pow(1 + baseRate, year) * (1 - saleCostRate);
      const finalNetProceeds = salePriceAfterCost - remainingBalance;
      const housingCost = downPayment + purchaseFees + cumulativePurchaseCash - finalNetProceeds;
      const averageAnnualHousingCost = housingCost / year;
      const cumulativeDifferenceVsRent = housingCost - cumulativeRent;
      const annualDifferenceVsRent = averageAnnualHousingCost - rentAnnual;

      return {
        year,
        cumulativeRent,
        cumulativePurchaseCash,
        remainingBalance,
        salePriceAfterCost,
        finalNetProceeds,
        housingCost,
        averageAnnualHousingCost,
        cumulativeDifferenceVsRent,
        annualDifferenceVsRent,
      };
    });

    const summary = rows[Math.min(9, rows.length - 1)];
    const focusYears = [5, 10, 15, 20, 35].filter((year) => year <= rows.length);
    const focusRows = focusYears.map((year) => rows[year - 1]);

    return {
      purchaseFees,
      loanPrincipal,
      monthlyLoanPayment,
      annualLoanPayment,
      rentAnnual,
      purchaseAnnualCash,
      monthlyHousingCash,
      rows,
      summary,
      focusRows,
    };
  }, [inputs]);

  const chartData = result.rows.map((r) => ({
    year: `${r.year}`,
    残債: Math.round(r.remainingBalance),
    賃貸累計: Math.round(r.cumulativeRent),
    購入住居コスト: Math.round(r.housingCost),
    売却後手残り: Math.round(r.finalNetProceeds),
    累計差額: Math.round(r.cumulativeDifferenceVsRent),
  }));

  const defaultVisibleYears = Math.min(parseNumber(inputs.projectionYears), 20);
  const visibleChartData = chartData.slice(0, Math.max(1, defaultVisibleYears));
  const milestoneYears = [10, 15, 20].filter((year) => year <= visibleChartData.length);
  const summary = result.summary;

  return (
    <div className="app-shell">
      <div className="container">
        <header className="page-header">
          <h1>住居コスト比較シミュレーター</h1>
          <p>
            普通シナリオ一本で、単年キャッシュ負担と売却込みの実質コストを分けて見る版。スマホでも見やすい構成。
          </p>
        </header>

        <section className="section-grid inputs-grid">
          <Panel title="賃貸条件" desc="今の家とぶつける前提">
            <Field label="家賃 / 月" hint="目安: 現在の家賃そのまま" value={inputs.rentMonthly} onChange={(v) => update('rentMonthly', v)} />
            <Field label="管理費 / 月" hint="目安: 共益費込みなら 0 でもOK" value={inputs.rentMgmtMonthly} onChange={(v) => update('rentMgmtMonthly', v)} />
            <Field label="更新料 / 2年" hint="目安: 家賃1か月分が多い" value={inputs.rentRenewalFee} onChange={(v) => update('rentRenewalFee', v)} />
          </Panel>

          <Panel title="購入条件" desc="物件価格・借入・ランニングコスト" wide>
            <div className="field-grid">
              <Field label="購入価格" hint="目安: 物件価格そのまま" value={inputs.purchasePrice} onChange={(v) => update('purchasePrice', v)} />
              <Field label="諸費用率 %" hint="目安: 7〜10%" value={inputs.purchaseFeeRatePct} onChange={(v) => update('purchaseFeeRatePct', v)} />
              <Field label="頭金" hint="目安: 0〜1500万くらいで比較" value={inputs.downPayment} onChange={(v) => update('downPayment', v)} />
              <Field label="年利 %" hint="目安: 変動 0.6〜1.2% くらい" value={inputs.annualInterestRatePct} onChange={(v) => update('annualInterestRatePct', v)} />
              <Field label="ローン年数" hint="目安: 35年が基準" value={inputs.loanYears} onChange={(v) => update('loanYears', v)} />
              <Field label="管理費等 / 月" hint="目安: 管理費+修繕積立金の合計" value={inputs.ownershipMonthlyFee} onChange={(v) => update('ownershipMonthlyFee', v)} />
              <Field label="固定資産税 / 年" hint="目安: 8万〜15万くらい" value={inputs.propertyTaxAnnual} onChange={(v) => update('propertyTaxAnnual', v)} />
              <Field label="火災保険 / 5年" hint="目安: 5万〜15万くらい" value={inputs.fireInsurancePer5Years} onChange={(v) => update('fireInsurancePer5Years', v)} />
              <Field label="売却コスト率 %" hint="目安: 4% 前後" value={inputs.saleCostRatePct} onChange={(v) => update('saleCostRatePct', v)} />
            </div>
          </Panel>

          <Panel title="売却前提" desc="相場が横ばい〜やや弱めなら 0% 〜 -0.5% くらいが置きやすい。" full>
            <div className="field-grid two-col">
              <Field label="価格変動率 % / 年" hint="目安: 0% 〜 -0.5%、厳しめなら -1%" value={inputs.baseRatePct} onChange={(v) => update('baseRatePct', v)} />
              <Field label="表示年数" hint="目安: 10年、15年、20年、35年" value={inputs.projectionYears} onChange={(v) => update('projectionYears', v)} />
            </div>
          </Panel>
        </section>

        <section className="section-grid metrics-grid">
          <MetricCard title="借入額" value={fmtYen(result.loanPrincipal)} number={result.loanPrincipal} sub="諸費用込み" />
          <MetricCard title="ローン返済 / 月" value={fmtYen(result.monthlyLoanPayment)} number={result.monthlyLoanPayment} sub={`${fmtPct(parseNumber(inputs.annualInterestRatePct))} / ${inputs.loanYears}年`} />
          <MetricCard title="購入の単年キャッシュ負担" value={fmtYen(result.monthlyHousingCash)} number={result.monthlyHousingCash} sub="月平均（ローン+管理費等+税+保険月割）" />
          <MetricCard title="賃貸の単年キャッシュ負担" value={fmtYen(result.rentAnnual / 12)} number={result.rentAnnual / 12} sub="月平均（家賃+管理費+更新料月割）" />
        </section>

        <Panel title="まず見る要点" desc="10年時点の普通シナリオ。スマホではここだけでも判断しやすい。">
          <div className="summary-grid">
            <SummaryCard label="10年後 残債" value={fmtYen(summary.remainingBalance)} number={summary.remainingBalance} />
            <SummaryCard label="10年後 売却後手残り" value={fmtYen(summary.finalNetProceeds)} number={summary.finalNetProceeds} />
            <SummaryCard label="10年後 純粋な住居コスト" value={fmtYen(summary.housingCost)} number={summary.housingCost} />
            <SummaryCard label="10年後 年平均実質負担" value={fmtYen(summary.averageAnnualHousingCost)} number={summary.averageAnnualHousingCost} />
            <SummaryCard label="10年後 賃貸との差額（累計）" value={fmtYen(summary.cumulativeDifferenceVsRent)} number={summary.cumulativeDifferenceVsRent} />
            <SummaryCard label="10年後 判定" value={diffLabel(summary.cumulativeDifferenceVsRent)} number={summary.cumulativeDifferenceVsRent} />
          </div>
        </Panel>

        <Panel title="年数別の早見表" desc="5年・10年・15年・20年・35年だけ抜き出し。">
          <div className="focus-grid">
            {result.focusRows.map((row) => (
              <div key={row.year} className="focus-card">
                <div className="focus-head">
                  <strong>{row.year}年目</strong>
                  <span className={`chip ${row.cumulativeDifferenceVsRent < 0 ? 'chip-negative' : 'chip-neutral'}`}>{diffLabel(row.cumulativeDifferenceVsRent)}</span>
                </div>
                <DataLine label="累計差額" value={fmtYen(row.cumulativeDifferenceVsRent)} number={row.cumulativeDifferenceVsRent} />
                <DataLine label="売却後手残り" value={fmtYen(row.finalNetProceeds)} number={row.finalNetProceeds} />
                <DataLine label="残債" value={fmtYen(row.remainingBalance)} number={row.remainingBalance} />
                <DataLine label="年平均実質負担" value={fmtYen(row.averageAnnualHousingCost)} number={row.averageAnnualHousingCost} />
              </div>
            ))}
          </div>
        </Panel>

        <div className="charts-grid charts-grid-top">
          <Panel title="差額グラフ" desc="0円より上は賃貸有利、下は購入有利。まずここを見る。">
            <ChartWrap>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visibleChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(Number(v) / 10000)}万`} width={52} />
                  <Tooltip formatter={(value: number) => fmtYen(Number(value))} />
                  <ReferenceLine y={0} stroke="#111827" strokeWidth={2} />
                  {milestoneYears.map((year) => (
                    <ReferenceLine key={year} x={`${year}`} stroke="#94a3b8" strokeDasharray="4 4" />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="累計差額" name="累計差額" stroke="#dc2626" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartWrap>
          </Panel>

          <Panel title="コスト比較グラフ" desc="賃貸累計と購入住居コストの差を見る。表示はまず20年まで。">
            <ChartWrap>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visibleChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(Number(v) / 10000)}万`} width={52} />
                  <Tooltip formatter={(value: number) => fmtYen(Number(value))} />
                  {milestoneYears.map((year) => (
                    <ReferenceLine key={year} x={`${year}`} stroke="#94a3b8" strokeDasharray="4 4" />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="賃貸累計" name="賃貸累計" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="購入住居コスト" name="購入住居コスト" stroke="#16a34a" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartWrap>
          </Panel>
        </div>

        <Panel title="資産・負債グラフ" desc="売れる状態になっていくかを見る。残債と売却後手残りを分けて表示。">
          <ChartWrap>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visibleChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(Number(v) / 10000)}万`} width={52} />
                <Tooltip formatter={(value: number) => fmtYen(Number(value))} />
                <ReferenceLine y={0} stroke="#111827" strokeWidth={1.5} />
                {milestoneYears.map((year) => (
                  <ReferenceLine key={year} x={`${year}`} stroke="#94a3b8" strokeDasharray="4 4" />
                ))}
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="残債" name="残債" stroke="#0f172a" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="売却後手残り" name="売却後手残り" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrap>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  desc,
  children,
  wide,
  full,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  wide?: boolean;
  full?: boolean;
}) {
  const classes = ['panel'];
  if (wide) classes.push('span-2');
  if (full) classes.push('span-3');

  return (
    <section className={classes.join(' ')}>
      <div className="panel-header">
        <h2>{title}</h2>
        {desc ? <p>{desc}</p> : null}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {hint ? <span className="field-hint">{hint}</span> : null}
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" />
    </label>
  );
}

function MetricCard({ title, value, sub, number }: { title: string; value: string; sub: string; number?: number }) {
  return (
    <div className="metric-card">
      <div className="metric-title">{title}</div>
      <div className={`metric-value ${number !== undefined ? valueClass(number) : ''}`}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

function SummaryCard({ label, value, number }: { label: string; value: string; number?: number }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className={`summary-value ${number !== undefined ? valueClass(number) : ''}`}>{value}</div>
    </div>
  );
}

function DataLine({ label, value, number }: { label: string; value: string; number?: number }) {
  return (
    <div className="data-line">
      <span className="data-label">{label}</span>
      <span className={`data-value ${number !== undefined ? valueClass(number) : ''}`}>{value}</span>
    </div>
  );
}

function ChartWrap({ children }: { children: React.ReactNode }) {
  return <div className="chart-wrap">{children}</div>;
}

export default App;
