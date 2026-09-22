function KO({
job:e,nowMs:t,queueRunning:r,isOpen:a,onToggleOpen:n,onRetry:s,onExport:o,onRemove:l,onLoadSettings:d,onOpenDraftFolder:c,onRevealDraft:u}
){
var m;
let p=e.startedAtMs?((e.completedAtMs??t)-e.startedAtMs)/1e3:0,h=e.capcutDraftPath?KR(e.capcutDraftPath):"";
return
(0,i.jsxs)("div",{
className:"border-border border-b last:border-b-0","data-pixi-video-creative-job":e.id,"data-pixi-video-creative-job-status":e.status,children:[
(0,i.jsxs)("div",{
className:"grid grid-cols-2 gap-3 px-4 py-3 text-sm lg:grid-cols-[minmax(0,1.3fr)_92px_120px_92px_200px] lg:gap-2",children:[
(0,i.jsxs)("button",{
type:"button",onClick:()=>n(e.id),"aria-expanded":a,className:"col-span-2 flex min-w-0 items-start gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:col-span-1","data-pixi-video-creative-job-toggle":e.id,children:[
(0,i.jsx)(a_.A,{
className:`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
a?"rotate-0":"-rotate-90"}
`}
),
(0,i.jsxs)("span",{
className:"min-w-0",children:[
(0,i.jsx)("span",{
className:"block truncate font-medium",children:e.title}
),
(0,i.jsxs)("span",{
className:"mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-muted-foreground text-xs",children:[
(0,i.jsxs)("span",{
children:[e.sourceCount,"채널"]}
),
(0,i.jsxs)("span",{
children:[e.languageCount,"언어"]}
),
(0,i.jsxs)("span",{
children:["목표 ",e.targetSourceCount,"파일"]}
),
(0,i.jsxs)("span",{
children:[e.candidateUrls.length,"URL"]}
),
(0,i.jsxs)("span",{
children:[e.downloadedSources.length,"파일"]}
),e.audioSource?
(0,i.jsxs)("span",{
children:["음성 ",(0,KN.oz)(e.audioSource.durationMs/1e3)]}
):null,
(0,i.jsx)("span",{
children:KN.BA[e.stage]}
),e.error?
(0,i.jsx)("span",{
className:"truncate text-red-600",children:"오류 있음"}
):null,e.warning?
(0,i.jsx)("span",{
className:"truncate text-amber-600",children:"경고 있음"}
):null]}
)]}
)]}
),
(0,i.jsxs)("div",{
className:"flex items-center justify-between gap-2 lg:items-start lg:justify-start",children:[
(0,i.jsx)("span",{
className:"text-muted-foreground text-xs lg:hidden",children:"상태"}
),
(0,i.jsx)(K$,{
paused:!r&&"running"===e.status,status:e.status}
)]}
),
(0,i.jsxs)("div",{
className:"space-y-1.5",children:[
(0,i.jsxs)("div",{
className:"flex items-center justify-between gap-1.5 text-muted-foreground text-xs lg:justify-start",children:[
(0,i.jsx)("span",{
className:"lg:hidden",children:"진행"}
),
(0,i.jsxs)("span",{
className:"inline-flex items-center gap-1.5",children:["running"===e.status&&r?
(0,i.jsx)(k.A,{
className:"h-3.5 w-3.5 animate-spin"}
):"success"===e.status?
(0,i.jsx)(bz.A,{
className:"h-3.5 w-3.5 text-emerald-600"}
):"failed"===e.status?
(0,i.jsx)(KL.A,{
className:"h-3.5 w-3.5 text-red-600"}
):
(0,i.jsx)(b_.A,{
className:"h-3.5 w-3.5"}
),
(0,i.jsxs)("span",{
className:"tabular-nums",children:[e.progress,"%"]}
)]}
)]}
),
(0,i.jsx)(mv.k,{
value:e.progress}
)]}
),
(0,i.jsxs)("div",{
className:"flex items-center justify-between gap-2 text-muted-foreground tabular-nums lg:block",children:[
(0,i.jsx)("span",{
className:"text-xs lg:hidden",children:"예상 시간"}
),
(0,i.jsx)("span",{
children:function(e){
if(("success"===e.status||"failed"===e.status)&&"number"==typeof e.startedAtMs&&"number"==typeof e.completedAtMs&&e.completedAtMs>=e.startedAtMs)return`소요 ${
(0,KN.oz)((e.completedAtMs-e.startedAtMs)/1e3)}
`;
if("running"===e.status){
let t=Math.max(0,Math.min(100,e.progress)),r=Math.max(0,e.estimatedSeconds*(1-t/100));
return`남은 ${
(0,KN.oz)(r)}
`}
return"queued"===e.status?`예상 ${
(0,KN.oz)(e.estimatedSeconds)}
`:(0,KN.oz)(e.estimatedSeconds)}
(e)}
)]}
),
(0,i.jsxs)("div",{
className:"flex items-start justify-end gap-1.5 lg:justify-start",children:["failed"===e.status?
(0,i.jsxs)(M.$,{
type:"button",size:"sm",onClick:()=>s(e.id),className:"h-8 flex-1 gap-1.5 px-2 text-xs lg:flex-none","data-pixi-video-creative-job-retry":e.id,children:[
(0,i.jsx)(bs.A,{
className:"h-3.5 w-3.5"}
),"재시도"]}
):
(0,i.jsxs)(M.$,{
type:"button",size:"sm",variant:"exported"===e.exportStatus?"outline":"default",onClick:()=>o(e.id),disabled:"success"!==e.status||"exporting"===e.exportStatus,className:"h-8 flex-1 gap-1.5 px-2 text-xs lg:flex-none",children:["exporting"===e.exportStatus?
(0,i.jsx)(k.A,{
className:"h-3.5 w-3.5 animate-spin"}
):
(0,i.jsx)(mH.A,{
className:"h-3.5 w-3.5"}
),"exported"===(m=e.exportStatus)?"다시 내보내기":"exporting"===m?"내보내는 중":"CapCut 내보내기"]}
),
(0,i.jsx)(M.$,{
type:"button",size:"icon",variant:"ghost",onClick:()=>l(e.id),disabled:"running"===e.status||"exporting"===e.exportStatus,className:"h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive","aria-label":`${
e.title}
 작업 제거`,"data-pixi-video-creative-job-remove":e.id,children:
(0,i.jsx)(br.A,{
className:"h-3.5 w-3.5"}
)}
)]}
)]}
),a?
(0,i.jsxs)("div",{
className:"border-border border-t bg-muted/20 px-4 py-3",children:[e.error?
(0,i.jsx)("div",{
className:"mb-3 rounded-md border border-red-500/25 bg-red-500/10 p-3 text-red-700 dark:text-red-300",children:
(0,i.jsxs)("div",{
className:"flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",children:[
(0,i.jsxs)("div",{
className:"min-w-0",children:[
(0,i.jsx)("div",{
className:"font-semibold text-sm",children:"작업을 완료하지 못했습니다"}
),
(0,i.jsx)("div",{
className:"mt-1 text-sm leading-5",children:e.error}
),
(0,i.jsx)("div",{
className:"mt-1 text-xs opacity-80",children:"같은 설정으로 재시도하거나 설정을 불러와 검색 조건과 후보 URL을 수정하세요."}
)]}
),
(0,i.jsxs)("div",{
className:"flex shrink-0 gap-1.5",children:[
(0,i.jsxs)(M.$,{
type:"button",size:"sm",onClick:()=>s(e.id),className:"h-8 gap-1.5 px-2 text-xs",children:[
(0,i.jsx)(bs.A,{
className:"h-3.5 w-3.5"}
),"재시도"]}
),
(0,i.jsx)(M.$,{
type:"button",size:"sm",variant:"outline",onClick:()=>d(e),className:"h-8 gap-1.5 border-red-500/25 bg-background px-2 text-xs text-foreground","data-pixi-video-creative-job-load-settings":e.id,children:"설정 불러오기"}
)]}
)]}
)}
):null,e.warning&&e.warning!==e.error?
(0,i.jsxs)("div",{
className:"mb-3 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-amber-700 text-sm dark:text-amber-300",children:[
(0,i.jsx)("div",{
className:"font-semibold text-xs",children:"추가 안내"}
),
(0,i.jsx)("div",{
className:"mt-1",children:e.warning}
)]}
):null,
(0,i.jsxs)("div",{
className:"grid gap-3 md:grid-cols-[1.2fr_0.8fr]",children:[
(0,i.jsxs)("div",{
className:"rounded-md border border-border bg-background p-3",children:[
(0,i.jsx)("div",{
className:"font-medium text-[11px] text-muted-foreground",children:"대본"}
),
(0,i.jsx)("div",{
className:"mt-1 line-clamp-3 text-sm leading-6",children:e.script}
)]}
),
(0,i.jsxs)("div",{
className:"grid grid-cols-2 gap-2",children:[
(0,i.jsx)(KA,{
label:"검색 채널",value:e.sourceCount}
),
(0,i.jsx)(KA,{
label:"검색 언어",value:e.languageCount}
),
(0,i.jsx)(KA,{
label:"원본 목표",value:e.targetSourceCount}
),
(0,i.jsx)(KA,{
label:"화면 구성",value:"fill"===e.framingMode?"꽉 채우기":"장면 전체"}
),
(0,i.jsx)(KA,{
label:"후보 URL",value:e.candidateUrls.length}
),
(0,i.jsx)(KA,{
label:"다운로드",value:e.downloadedSources.length}
),
(0,i.jsx)(KA,{
label:"음성 길이",value:e.audioSource?(0,KN.oz)(e.audioSource.durationMs/1e3):"-"}
),
(0,i.jsx)(KA,{
label:"크레딧",value:e.creditsUsed}
),
(0,i.jsx)(KA,{
label:"단계",value:KN.BA[e.stage]}
),
(0,i.jsx)(KA,{
label:"예상 시간",value:(0,KN.oz)(e.estimatedSeconds)}
),
(0,i.jsx)(KA,{
label:"경과",value:(0,KN.oz)(p)}
)]}
)]}
),
(0,i.jsxs)("div",{
className:"mt-3 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]",children:[
(0,i.jsxs)("div",{
className:"rounded-md border border-border bg-background p-3",children:[
(0,i.jsx)("div",{
className:"font-medium text-[11px] text-muted-foreground",children:"분석 대상"}
),
(0,i.jsx)("div",{
className:"mt-2 flex flex-wrap gap-1.5",children:e.analysis.entities.length>0?e.analysis.entities.map(e=>
(0,i.jsx)("span",{
className:"rounded-full border border-border bg-muted/40 px-2 py-1 font-medium text-[11px]",children:e.label}
,`${
e.type}
-${
e.label}
`)):
(0,i.jsx)("span",{
className:"text-muted-foreground text-xs",children:"대본에서 인물/키워드를 더 뽑는 중"}
)}
),
(0,i.jsxs)("div",{
className:"mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground",children:[e.searchSurfaceLabels.map(e=>
(0,i.jsx)("span",{
className:"rounded-full border border-border bg-muted/40 px-2 py-1",children:e}
,e)),e.searchLanguageLabels.map(e=>
(0,i.jsx)("span",{
className:"rounded-full border border-border bg-muted/40 px-2 py-1",children:e}
,e))]}
)]}
),
(0,i.jsxs)("div",{
className:"rounded-md border border-border bg-background p-3",children:[
(0,i.jsx)("div",{
className:"font-medium text-[11px] text-muted-foreground",children:"장면 매칭"}
),
(0,i.jsx)("div",{
className:"mt-2 space-y-2",children:e.analysis.scenes.slice(0,6).map(e=>
(0,i.jsxs)("div",{
className:"grid gap-2 rounded-md bg-muted/35 p-2 text-xs md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",children:[
(0,i.jsxs)("div",{
className:"min-w-0",children:[
(0,i.jsx)("div",{
className:"truncate font-medium",children:e.line}
),
(0,i.jsx)("div",{
className:"mt-0.5 text-muted-foreground",children:e.target}
)]}
),
(0,i.jsx)("div",{
className:"min-w-0 truncate text-muted-foreground",children:e.query}
)]}
,e.id))}
)]}
)]}
),e.candidateUrls.length>0||e.downloadedSources.length>0?
(0,i.jsxs)("div",{
className:"mt-3 grid gap-3 lg:grid-cols-2",children:[
(0,i.jsxs)("div",{
className:"rounded-md border border-border bg-background p-3",children:[
(0,i.jsx)("div",{
className:"font-medium text-[11px] text-muted-foreground",children:"다운로드 원본"}
),
(0,i.jsx)("div",{
className:"mt-2 space-y-1.5",children:e.downloadedSources.length>0?e.downloadedSources.slice(0,8).map(e=>{
let t;
return
(0,i.jsxs)("div",{
className:"min-w-0 rounded-md bg-muted/35 px-2 py-1.5 text-xs",children:[
(0,i.jsx)("div",{
className:"truncate font-medium",children:e.title||e.filename}
),
(0,i.jsx)("div",{
className:"mt-0.5 truncate text-muted-foreground",children:(t=[e.filename],"number"==typeof e.durationMs&&Number.isFinite(e.durationMs)&&e.durationMs>0&&t.push((0,KN.oz)(e.durationMs/1e3)),t.join(" \xb7 "))}
)]}
,`${
e.sourceUrl}
-${
e.filePath}
`)}
):
(0,i.jsx)("div",{
className:"text-muted-foreground text-xs",children:"아직 다운로드된 원본이 없습니다."}
)}
)]}
),
(0,i.jsxs)("div",{
className:"rounded-md border border-border bg-background p-3",children:[
(0,i.jsx)("div",{
className:"font-medium text-[11px] text-muted-foreground",children:"후보 URL"}
),
(0,i.jsx)("div",{
className:"mt-2 space-y-1.5",children:e.candidateUrls.slice(0,8).map(t=>{
var r;
let a,n,s=(a=e.autoCandidates?.find(e=>e.url===t),{
meta:(n=[(r=a?.surface,KN.Mk.find(e=>e.value===r)?.label),a?.language?.trim()||void 0].filter(e=>!!e)).length>0?n.join("/"):void 0,title:a?.title?.trim()||void 0}
);
return
(0,i.jsxs)("div",{
className:"min-w-0 rounded-md bg-muted/35 px-2 py-1.5 text-xs",title:t,children:[
(0,i.jsxs)("div",{
className:"truncate font-medium",children:[s.meta?`[${
s.meta}
] `:"",s.title??t]}
),s.title?
(0,i.jsx)("div",{
className:"mt-0.5 truncate text-muted-foreground",children:t}
):null]}
,t)}
)}
)]}
)]}
):null,e.capcutDraftPath?
(0,i.jsx)("div",{
className:"mt-3 rounded-md border border-border bg-background p-3",children:
(0,i.jsxs)("div",{
className:"flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",children:[
(0,i.jsxs)("div",{
className:"min-w-0",children:[
(0,i.jsx)("div",{
className:"font-medium text-[11px] text-muted-foreground",children:"CapCut 초안"}
),
(0,i.jsx)("div",{
className:"mt-1 truncate text-sm",title:h,"data-pixi-video-creative-capcut-draft":e.id,children:h}
)]}
),
(0,i.jsxs)("div",{
className:"flex shrink-0 items-center gap-1.5",children:[
(0,i.jsxs)(M.$,{
type:"button",size:"sm",variant:"outline",onClick:()=>c(e.capcutDraftPath??""),disabled:!(0,iB.isTauri)(),className:"h-8 gap-1.5 px-2 text-xs",title:"초안 폴더 열기",children:[
(0,i.jsx)(mX.A,{
className:"h-3.5 w-3.5"}
),"폴더"]}
),
(0,i.jsxs)(M.$,{
type:"button",size:"sm",variant:"ghost",onClick:()=>u(e.capcutDraftPath??""),disabled:!(0,iB.isTauri)(),className:"h-8 gap-1.5 px-2 text-xs",title:"초안 파일 위치 보기",children:[
(0,i.jsx)(tZ.A,{
className:"h-3.5 w-3.5"}
),"위치"]}
)]}
)]}
)}
):null]}
):null]}
)}
