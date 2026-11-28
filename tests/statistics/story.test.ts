import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStorySvg, getStoryWeights, goalProgress } from "../../lib/statistics/story";

test("weight story uses latest local-day measurement and ignores old data",()=>{
 const result=getStoryWeights([
  {date:"2025-01-01T12:00:00Z",weight:82},
  {date:"2025-02-08T15:00:00Z",weight:80},
  {date:"2025-02-12T01:00:00Z",weight:79},
  {date:"2025-02-12T02:00:00Z",weight:78.75},
  {date:"2025-02-14T23:00:00Z",weight:78},
 ],7,"America/Campo_Grande",new Date("2025-02-14T23:30:00Z"));
 assert.deepEqual(result.points,[{date:"2025-02-08",weight:80},{date:"2025-02-11",weight:78.75},{date:"2025-02-14",weight:78}]);
});
test("goal supports both directions and equal goals",()=>{
 assert.equal(goalProgress(80,75,70),50);
 assert.equal(goalProgress(60,65,70),50);
 assert.equal(goalProgress(100,100,100),null);
});
test("achievement text is escaped and story has fixed resolution",()=>{
 const svg=buildStorySvg({kind:"achievement",theme:"dark",period:7,showWeight:false,logs:[],achievement:{title:"A < B & C",description:"Test",unlockedAt:null}});
 assert.match(svg,/width="1080" height="1920"/);
 assert.ok(svg.includes("A &lt; B &amp; C"));
});
