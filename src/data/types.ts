// 数据贡献者只需要维护 [名称, 开始年份, 结束年份]。
// 负数年份表示公元前，例如 -221 表示公元前 221 年。
export type Period = [name: string, start: number, end: number];
