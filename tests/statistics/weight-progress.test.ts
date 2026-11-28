import test from "node:test";
import assert from "node:assert/strict";
import { dailyWeights, weeklyChange, loggingStreak, rangeWeights, estimateGoal, weightMilestones } from "../../lib/statistics/weight-progress";

const points = [{date:"2026-11-01",weight:100},{date:"2026-11-08",weight:99},{date:"2026-11-15",weight:98}];
test("weekly change respects actual elapsed days and sign", () => {
  assert.equal(weeklyChange(points),-1);
  assert.equal(weeklyChange([{date:"2026-11-01",weight:100},{date:"2026-11-03",weight:101}]),3.5);
  assert.equal(weeklyChange(points.slice(0,1)),null);
});
test("daily weights use latest local measurement, ignore future and invalid", () => {
  const now=new Date("2026-11-04T12:00:00Z");
  const logs=[{date:"2026-11-03T01:00:00Z",weight:99},{date:"2026-11-02T23:00:00Z",weight:100},{date:"2026-11-05T00:00:00Z",weight:97},{date:"invalid",weight:1}];
  assert.deepEqual(dailyWeights(logs,"America/Campo_Grande",now),[{date:"2026-11-02",weight:99}]);
});
test("period includes today, ignores older readings",()=>{
  assert.equal(rangeWeights(points,7,"2026-11-15").points.length,1);
  assert.equal(rangeWeights(points,30,"2026-11-15").points.length,3);
});
test("streak counts days, with yesterday grace and gaps",()=>{
  const logs=[1,2,3,5,6].map(d=>({date:"2026-11-0"+d,weight:99}));
  assert.equal(loggingStreak(logs,"2026-11-07").current,2);
  assert.equal(loggingStreak(logs,"2026-11-07").best,3);
  assert.equal(loggingStreak(logs,"2026-11-08").current,0);
});
test("projection requires a week and progress toward goal",()=>{
  assert.equal(estimateGoal(points,96),"2026-11-29");
  assert.equal(estimateGoal(points,101),null);
  assert.equal(estimateGoal(points.slice(0,1),96),null);
});
test("milestones adapt to loss and gain targets",()=>{
  assert.equal(weightMilestones(points,100,95).filter(m=>m.date).length,2);
  assert.equal(weightMilestones([{date:"2026-11-01",weight:102}],100,105).filter(m=>m.date).length,2);
  assert.deepEqual(weightMilestones(points,100,100),[]);
});
