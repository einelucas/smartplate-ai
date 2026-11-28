import test from "node:test";
import assert from "node:assert/strict";
import { dailyWeights, weeklyChange, lastSevenDayChange, resolveWeightTimezone, loggingStreak, rangeWeights, estimateGoal, weightMilestones } from "../../lib/statistics/weight-progress";

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

test("week 22–28 uses actual loss, not extrapolation, and excludes 21", () => {
  const entries = [{date:"2026-11-21",weight:112},{date:"2026-11-23",weight:110.5},{date:"2026-11-27",weight:106}];
  const result = rangeWeights(entries,7,"2026-11-28");
  assert.equal(result.start,"2026-11-22");
  assert.equal(result.end,"2026-11-28");
  assert.equal(lastSevenDayChange(entries,"2026-11-28"),-4.5);
  assert.equal(lastSevenDayChange(entries,"2026-11-29"),-4.5);
  assert.equal(lastSevenDayChange(entries,"2026-11-30"),null);
});
test("streak handles duplicate and unordered days and pending today", () => {
  const entries=[27,23,25,24,26,27,29].map(d=>({date:"2026-11-"+d,weight:100}));
  const pending=loggingStreak(entries,"2026-11-28");
  assert.equal(pending.current,5);
  assert.equal(pending.best,5);
  assert.equal(pending.todayLogged,false);
  assert.deepEqual(pending.recent.map(d=>d.logged),[false,true,true,true,true,true,false]);
  assert.equal(loggingStreak([...entries,{date:"2026-11-28",weight:99}],"2026-11-28").current,6);
});
test("device timezone fallback and local day near midnight", () => {
  const zone=resolveWeightTimezone("UTC","America/Campo_Grande");
  assert.equal(zone,"America/Campo_Grande");
  assert.equal(resolveWeightTimezone("America/Sao_Paulo","America/Campo_Grande"),"America/Sao_Paulo");
  assert.deepEqual(dailyWeights([{date:"2026-11-28T02:00:00Z",weight:106},{date:"2026-11-28T14:00:00Z",weight:105}],zone,new Date("2026-11-28T15:00:00Z")),[{date:"2026-11-27",weight:106},{date:"2026-11-28",weight:105}]);
});
