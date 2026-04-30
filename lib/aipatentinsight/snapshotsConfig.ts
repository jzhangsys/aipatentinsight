/**
 * snapshotsConfig.ts — 多 snapshot 時間軸配置
 *
 * EXPECTED_SNAPSHOT_DATES 列出「預期會有的 6 個時間點」(YYYY-MM-DD 格式)。
 * 公司頁時間軸會把這幾個日期都畫成節點:
 *   - 已有對應 JSON 檔的:紅點、可點(由 build 時產生的 snapshots.json 反映)
 *   - 還沒有 JSON 檔的:灰點、不可點(占位)
 *
 * 要新增 snapshot:
 *   1. 把處理好的 JSON 放到 public/data/insights-YYYY-MM-DD.json
 *   2. 確保這個日期在下面 EXPECTED_SNAPSHOT_DATES 裡(沒有就補)
 *   3. 跑 npm run build,prebuild 腳本會自動更新 snapshots.json
 */

export const EXPECTED_SNAPSHOT_DATES: string[] = [
  "2023-08-15",
  "2023-11-15",
  "2024-02-15",
  "2024-05-15",
  "2024-11-15",
  "2025-02-15",
];
