/** Record one round's first submitted result. Retries must not inflate mastery. */
export function updateMastery(mastery,concept,correct,hints,context='standard',record=true){
 if(!record)return mastery;
 const previous=mastery[concept],m=previous??{attempts:0,correct:0,firstAttemptCorrect:0,hintsUsed:0,recentResults:[],misconceptionCounts:{},contextsSeen:[],lastPractisedAt:null,masteryState:'not-introduced'};
 m.attempts++;
 if(correct)m.correct++;
 if(correct&&hints===0)m.firstAttemptCorrect++;
 m.hintsUsed+=hints;
 m.recentResults=[...m.recentResults,Boolean(correct)].slice(-10);
 m.contextsSeen=[...new Set([...m.contextsSeen,context])];
 m.lastPractisedAt=new Date().toISOString();
 const acc=m.recentResults.filter(Boolean).length/m.recentResults.length;
 m.masteryState=m.recentResults.length>=5&&acc>=.8?'mastered':m.attempts>=2?'practising':'introduced';
 mastery[concept]=m;
 return mastery;
}
export function overallMastery(mastery){const vals=Object.values(mastery);if(!vals.length)return 0;return Math.round(vals.reduce((a,m)=>a+(m.masteryState==='mastered'?100:m.masteryState==='practising'?55:25),0)/vals.length);}
export function adaptiveRecommendations(game){const labels={wrongOrientation:'Practise Shape Relay to reinforce numerator-layout rows.',missingMean:'Revisit Mean Station and trace the single 1/n checkpoint.',wrongOperand:'Practise both dot-product targets and name the vector that remains.',dotVsElementwise:'Rebuild Dot Product Forward Pass as product vector then sum.',upstreamOmitted:'Practise Incoming Gradient Relay and multiply g along every path.',wrongLane:'Revisit Weighted Sum and preserve lane order.'};return Object.entries(game.misconceptions||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key,count])=>({key,count,text:labels[key]||'Retry a repair round focused on the earliest inconsistent checkpoint.'}));}
