export default function Disclaimer() {
  return (
    <section className="mt-14 border-t border-[var(--brand-line)] pt-12">
      <p className="brand-kicker">Disclaimer</p>
      <h2 className="mt-2 text-2xl font-semibold brand-title">研究說明與免責聲明</h2>
      <div className="mt-5 space-y-5">
        <p className="text-base leading-8 text-[var(--brand-text-soft)]">
          本站內容僅供技術研究、產業觀察與資訊整理之用途，不構成任何形式之投資建議、證券推薦、投資邀約、財務建議或交易建議。
        </p>
        <p className="text-base leading-8 text-[var(--brand-text-soft)]">
          文中提及之公司、技術、專利或產業案例，僅作為技術地圖與產業結構說明之示例，不代表任何投資立場或報酬承諾。
        </p>
        <p className="text-base leading-8 text-[var(--brand-text-soft)]">
          任何投資決策均應由讀者自行判斷，並建議於必要時諮詢具資格之專業顧問。本站與作者不對任何依據本文內容所採取之投資行為及其結果負責。
        </p>
        <p className="text-base leading-8 text-[var(--brand-text-soft)]">
          本站所載研究方法與分析框架，旨在協助理解技術演化與產業結構，並非對未來市場、公司表現或技術走向之確定預測。
        </p>
      </div>
    </section>
  );
}
