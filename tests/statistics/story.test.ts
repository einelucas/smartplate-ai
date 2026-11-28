import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStorySvg, getStoryWeights, goalProgress, STORY_THEMES } from "../../lib/statistics/story";

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
 const svg=buildStorySvg({kind:"achievement",theme:"performance",period:7,showWeight:false,logs:[],achievement:{title:"A < B & C",description:"Test",unlockedAt:null}});
 assert.match(svg,/width="1080" height="1920"/);
 assert.ok(svg.includes("A &lt; B &amp; C"));
});

test("three themes export distinct self-contained 1080x1920 stories",()=>{
 const base={kind:"weight" as const,period:7 as const,showWeight:false,logs:[]};
 const outputs=STORY_THEMES.map(theme=>buildStorySvg({...base,theme:theme.id}));
 assert.equal(new Set(outputs).size,3);
 for(const svg of outputs){
   assert.match(svg,/width="1080" height="1920"/);
   assert.match(svg,/id="brand"/);
   assert.match(svg,/SmartPlateAI/);
   assert.ok(!svg.includes('M96 208h9'));
 }
});
test("weight story respects graph, goal and exact weight visibility",()=>{
 const now=new Date();
 const logs=[{date:new Date(now.getTime()-86400000).toISOString(),weight:83},{date:now.toISOString(),weight:81}];
 const base={kind:"weight" as const,theme:"signature" as const,period:7 as const,timezone:"UTC",logs,startWeight:83,currentWeight:81,targetWeight:79,showWeight:false};
 const hidden=buildStorySvg({...base,showGraph:false,showGoal:false});
 assert.ok(!hidden.includes("Progresso da meta"));
 assert.ok(!hidden.includes("INÍCIO DO PERÍODO"));
 assert.ok(!hidden.includes('stroke-width="10"'));
 assert.ok(!hidden.includes("Meta: 79 kg"));
 const visible=buildStorySvg({...base,showGraph:true,showGoal:true,showWeight:true});
 assert.ok(visible.includes("INÍCIO DO PERÍODO"));
 assert.ok(visible.includes("Meta: 79 kg"));
 assert.ok(visible.includes("50%"));
 assert.ok(visible.includes('stroke-width="10"'));
});
