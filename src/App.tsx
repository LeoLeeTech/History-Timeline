// useRef 保存 Timeline 要挂载的 DOM 节点，useEffect 负责在组件挂载后初始化第三方实例。
import { useEffect, useRef } from 'react';
// DataSet 是 vis-data 提供的数据集合。Timeline 可以直接订阅它的增删改事件，
// 以后调用 items.add/update/remove 时，时间轴会自动同步；普通数组没有这些能力。
import { DataSet } from 'vis-data';
import type { DataGroup, DataItem, TimelineOptions } from 'vis-timeline';
import { Timeline } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import './App.css';

import { historyGroups } from './data';
import type { Period } from './data/types';

/**
 * 将历史年份转换成 Date。
 *
 * JavaScript 的 Date 对公元 0 年到 99 年有特殊行为：new Date(25, 0, 1)
 * 会被解释成 1925 年。因此先创建 1970 年的 Date，再用 setFullYear，
 * 才能正确表达古代年份和公元前年份。
 */
function yearDate(year: number): Date {
  const date = new Date(0);
  date.setFullYear(year < 0 ? year + 1 : year, 0, 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function createItems(group: string, periods: Period[], itemClassName: string): DataItem[] {
  // laneEnds[i] 记录第 i 行最后一个朝代的结束年份。
  // 新朝代如果从 previousEnd 开始或更晚，就可以复用这一行。
  const laneEnds: number[] = [];
  return (
    periods
      // 先按开始年份排序，保证分行算法从时间轴左侧向右侧处理。
      .toSorted((a, b) => a[1] - b[1])
      .map(([name, start, end], index) => {
        let lane = laneEnds.findIndex((previousEnd) => previousEnd <= start);
        // 没有空闲行，说明它和现有朝代真实重叠，需要新建一行。
        if (lane === -1) lane = laneEnds.length;
        // 单年事件保留一年占位用于分行，但画面仍以时间点表示。
        laneEnds[lane] = end === start ? start + 1 : end;
        return {
          id: `${group}-${index}`,
          group,
          // subgroup 是组内的固定行。Timeline 会按照 subgroupOrder 排列这些行。
          subgroup: lane,
          content: name,
          start: yearDate(start),
          end: end === start ? undefined : yearDate(end),
          type: end === start ? 'point' : 'range',
          className: itemClassName,
          title: `${name}：${
            start < 0 ? `公元前${-start}年` : `${start}年`
          }至${end}年`,
        };
      })
  );
}

function App() {
  // 这个 ref 最终会指向 JSX 中的 div，Timeline 会把自己的 DOM 渲染到这里。
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = timelineRef.current;
    if (!container) return;

    // 根据数据目录自动生成分组，新增文件无需修改组件。
    const groups = new DataSet<DataGroup>(historyGroups.map(({ id, name, className }) => ({
      id, content: name, className, subgroupOrder: 'subgroup',
    })));
    const items = new DataSet<DataItem>(historyGroups.flatMap(({ id, items, itemClassName }) => createItems(id, items, itemClassName)));
    const options: TimelineOptions = {
      // 年份刻度放在顶部；组内条目仍沿用原来的排列方向。
      orientation: { axis: 'top', item: 'bottom' },
      // 初始可视范围，以及用户拖动时允许到达的边界。
      start: yearDate(-4000),
      end: yearDate(2050),
      min: yearDate(-2000),
      max: yearDate(2050),
      // 只显示年份刻度；rangechanged 中会根据缩放范围动态调整 step。
      timeAxis: { scale: 'year', step: 100 },
      format: {
        minorLabels: (date) => {
          // vis-timeline 实际传入的是 Moment，类型声明兼容为 Date，
          // 所以通过 valueOf() 统一转换成原生 Date。
          const year = new Date(date.valueOf()).getFullYear();
          return `${year}`;
        },
      },
      // 隐藏当前时间线和大刻度，避免历史时间轴出现今天的标记。
      showMajorLabels: false,
      showCurrentTime: false,
      zoomMin: 50 * 365.25 * 24 * 60 * 60 * 1000,
      // zoomFriction 越大，滚轮缩放越慢；默认值约为 5，这里设为 25。
      zoomFriction: 25,
      // 关闭整个分组的自动堆叠，交给 subgroup 处理真实重叠的条目。
      stack: false,
      stackSubgroups: true,
      margin: { item: { horizontal: 0, vertical: 12 }, axis: 16 },
      groupEditable: {remove: true, order: true}
    };

    // Timeline 是一个命令式第三方对象，而 React 是声明式的。
    // 因此 Timeline 必须在 useEffect 中创建，而不是在 render 中创建。
    const timeline = new Timeline(container, items, groups, options);

    // 可视范围变化时，按照当前显示的年份跨度调整刻度密度：
    // 远景显示 100 年一个刻度，放大后逐渐变成 50、20、10、5 年一个刻度。
    const onRangeChanged = () => {
      const { start, end } = timeline.getWindow();
      const years = (end.getTime() - start.getTime()) / (365.25 * 86400000);
      const step =
        years > 1000
          ? 100
          : years > 500
          ? 50
          : years > 200
          ? 20
          : years > 100
          ? 10
          : 5;
      timeline.setOptions({ timeAxis: { scale: 'year', step } });
    };
    timeline.on('rangechanged', onRangeChanged);

    // React StrictMode 开发环境会执行“创建-清理-再次创建”，因此必须完整清理。
    // 组件卸载时也要移除事件监听并销毁 Timeline，避免重复实例和内存泄漏。
    return () => {
      timeline.off('rangechanged', onRangeChanged);
      timeline.destroy();
    };
  }, []);

  return (
    <main className="history-timeline">
      <div
        ref={timelineRef}
        className="timeline-container"
        aria-label="历史时间轴"
      />
    </main>
  );
}

export default App;
