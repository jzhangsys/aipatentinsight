/**
 * 最小 d3 型別 declaration — 只覆蓋本專案 StreamChart 用到的 API。
 *
 * 想要完整型別跟編輯器自動補完,執行:
 *   npm install --save-dev @types/d3
 * 然後可以刪掉這個檔案。
 */

declare module "d3" {
  // ===== Stack =====
  export type SeriesPoint<Datum> = [number, number] & { data: Datum };
  export type Series<Datum, Key> = Array<SeriesPoint<Datum>> & {
    key: Key;
    index: number;
  };

  export interface Stack<Datum, Key> {
    keys(keys: readonly Key[]): this;
    value(fn: (d: Datum, key: Key) => number): this;
    offset(fn: unknown): this;
    order(fn: unknown): this;
    (data: readonly Datum[]): Array<Series<Datum, Key>>;
  }
  export function stack<Datum, Key = string>(): Stack<Datum, Key>;

  export const stackOffsetSilhouette: unknown;
  export const stackOrderInsideOut: unknown;

  // ===== Area =====
  export interface Area<Datum> {
    x(fn: (d: Datum, i: number) => number): this;
    y0(fn: (d: Datum, i: number) => number): this;
    y1(fn: (d: Datum, i: number) => number): this;
    curve(curve: unknown): this;
    (data: readonly Datum[]): string | null;
  }
  export function area<Datum>(): Area<Datum>;

  export const curveBasis: unknown;
  export const curveCatmullRom: unknown;
  export const curveMonotoneX: unknown;
}
