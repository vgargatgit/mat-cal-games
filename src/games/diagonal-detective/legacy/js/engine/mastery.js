export function createConceptMastery() {
  return {attempts:0,correct:0,firstAttemptCorrect:0,hintsUsed:0,recentResults:[],misconceptionCounts:{},contextsSeen:[],lastPractisedAt:null,masteryState:'not-introduced'};
}

export function updateMastery(existing, concepts, {correct,firstAttempt,hintsUsed,misconception,context}) {
  const mastery=structuredClone(existing??{});
  for(const concept of concepts){const item=mastery[concept]??createConceptMastery();item.attempts+=1;if(correct)item.correct+=1;if(correct&&firstAttempt)item.firstAttemptCorrect+=1;if(hintsUsed)item.hintsUsed+=1;item.recentResults=[...item.recentResults,Boolean(correct)].slice(-5);if(misconception)item.misconceptionCounts[misconception]=(item.misconceptionCounts[misconception]??0)+1;if(context&&!item.contextsSeen.includes(context))item.contextsSeen.push(context);item.lastPractisedAt=new Date().toISOString();const accuracy=item.recentResults.filter(Boolean).length/item.recentResults.length;item.masteryState=item.attempts<2?'introduced':item.attempts>=5&&accuracy>=.8?'mastered':accuracy>=.6?'developing':'needs-review';mastery[concept]=item;}
  return mastery;
}

export function masteryPercentage(mastery) {
  const entries=Object.values(mastery??{});if(!entries.length)return 0;const weights={"not-introduced":0,introduced:.25,"needs-review":.35,developing:.65,mastered:1};return Math.round(100*entries.reduce((sum,item)=>sum+(weights[item.masteryState]??0),0)/entries.length);
}

export function mostFrequentMisconception(mastery) {
  const counts={};for(const item of Object.values(mastery??{}))for(const[key,value]of Object.entries(item.misconceptionCounts??{}))counts[key]=(counts[key]??0)+value;return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]??null;
}
