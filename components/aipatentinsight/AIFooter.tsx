/**
 * AIFooter — 全站底部
 *
 * - Copyright notice
 * - 免責聲明:資料來源、不構成投資建議、爬取資料的取捨
 *
 * 在 app/layout.tsx 或各 page.tsx 的最末位置 mount。
 */

const SITE_NAME = "AIPatentInsight";

export default function AIFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="ai-footer">
      <div className="ai-footer-inner">
        <div className="ai-footer-copy">
          © {year} {SITE_NAME}. All rights reserved.
        </div>
        <aside className="ai-footer-disclaimer-box" aria-label="免責聲明">
          <span className="ai-footer-disclaimer-title">免責聲明 / Disclaimer</span>
          <p>
            本網站所提供之專利圖譜、產業趨勢、市場訊號等資訊,
            均為公開資料整理與自動化分析之結果,僅供學術研究與資訊參考,
            <strong>不構成任何投資建議、證券買賣勸誘或決策依據</strong>。
            分析結果可能因資料覆蓋、分類精度、來源時效性而存在誤差,
            使用者應自行查證並承擔所有操作風險,本站對使用者依本資料所為之
            任何投資、商業或其他決策不負任何責任。
          </p>
          <p>
            本站不販售、不轉載原始新聞內容,
            僅以彙總指標方式呈現公開資料的整理結果。
            專利資料來源:中華民國經濟部智慧財產局公開公告。
          </p>
        </aside>
      </div>
    </footer>
  );
}
