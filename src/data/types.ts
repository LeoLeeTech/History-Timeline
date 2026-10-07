// 数字表示年份（负数为公元前），YYYY-MM-DD 字符串表示精确日期。
export type HistoricalDate = number | string;
export type Period = [name: string, start: HistoricalDate, end: HistoricalDate];
