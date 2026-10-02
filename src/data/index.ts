import type { Period } from './types';

// Vite 在构建时收集数据文件，文件名就是分组名。
const modules = import.meta.glob<{ items: Period[] }>('./groups/*.ts', { eager: true });
const knownGroups: Record<string, string> = {
  中国: 'china', 日本: 'japan', 欧洲: 'europe', 美国: 'america',
};
const regions = ['中国', '日本', '欧洲', '美国'];
const categories = ['朝代', '人物', '事件'];
const order = regions.flatMap((region) => categories.map((category) => `${region}${category}`));

export const historyGroups = Object.entries(modules).map(([path, module]) => {
  const name = path.slice('./groups/'.length, -3);
  const region = regions.find((region) => name.startsWith(region));
  return {
    id: name,
    name,
    items: module.items,
    className: '',
    itemClassName: `dynasty-${region ? knownGroups[region] : name}`,
  };
}).sort((a, b) => {
  const rank = (name: string) => order.includes(name) ? order.indexOf(name) : order.length;
  return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'zh-CN');
});
