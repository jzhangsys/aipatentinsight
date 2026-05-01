/**
 * snapshotsConfig.ts — 多 snapshot 時間軸配置
 *
 * EXPECTED_SNAPSHOT_DATES 列出「預期會有的時間點」(YYYY-MM-DD 格式)。
 * 公司頁時間軸會把這幾個日期都畫成節點:
 *   - 已有對應 JSON 檔的:紅點、可點(由 build 時產生的 snapshots.json 反映)
 *   - 還沒有 JSON 檔的:灰點、不可點(占位)
 *
 * 16 個實際 snapshot 已經透過 import-csv-snapshots.mjs 從 data_update/ 匯入。
 * Build 時 prebuild 腳本會自動掃 public/data/insights-*.json 把實際存在的全部加入,
 * EXPECTED_SNAPSHOT_DATES 用來「預告」未來日期(會以灰點顯示)。
 *
 * 要新增 snapshot:
 *   1. 把新 CSV 丟進 data_update/(檔名 YYYYMMDD.csv)
 *   2. 跑 npm run import:snapshots(或 npm run build,prebuild 會做)
 *   3. 對應 -light / -abstracts 衍生檔自動產出
 */

export const EXPECTED_SNAPSHOT_DATES: string[] = [
  // 16 個實際 snapshot 已從 data_update/ 匯入,無須再列(prebuild 自動偵測)。
  // 若想在 timeline 上預告未來日期(灰點 placeholder),把日期加在這裡。
];
