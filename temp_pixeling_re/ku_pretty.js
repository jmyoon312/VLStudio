function KU({
reservedCredits:e,settledCredits:t,estimatedRemainingSeconds:r,exportedCount:a,canBatchExport:n,exportVideoCreativeBatch:s,resultCount:o,totalUsedCredits:l,selectedSurfaces:d,searchLanguageCount:c,targetSourceSummary:u,exportingCount:m,totalProgress:p,jobs:h,nowMs:g,queueRunning:f,openJobIds:x,toggleVideoCreativeJobOpen:b,retryVideoCreativeJob:y,exportVideoCreativeJob:v,removeVideoCreativeJob:w,handleLoadJobSettings:j,handleOpenCapcutDraftFolder:k,handleRevealCapcutDraft:C}
){
return
(0,i.jsxs)("div",{
className:"space-y-3",children:[
(0,i.jsxs)("div",{
className:"rounded-lg border border-border bg-background p-4 shadow-sm",children:[
(0,i.jsxs)("div",{
className:"flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",children:[
(0,i.jsxs)("div",{
className:"flex items-center gap-3",children:[
(0,i.jsx)("div",{
className:"flex h-10 w-10 items-center justify-center rounded-md bg-muted",children:
(0,i.jsx)(mG.A,{
className:"h-5 w-5"}
)}
),
(0,i.jsxs)("div",{
children:[
(0,i.jsx)("div",{
className:"font-semibold",children:"실행 현황"}
),
(0,i.jsxs)("div",{
className:"text-muted-foreground text-xs",children:["예약 ",e," 크레딧 \xb7 현재 사용 ",t," 크레딧 \xb7 남은 예상"," ",(0,KN.oz)(r)," \xb7 내보내기 ",a,"개"]}
)]}
)]}
),
(0,i.jsxs)(M.$,{
type:"button",onClick:s,disabled:!n,className:"gap-2","data-pixi-video-creative-batch-export":!0,children:[
(0,i.jsx)(mH.A,{
className:"h-4 w-4"}
),"CapCut 일괄 내보내기"]}
)]}
),
(0,i.jsxs)("div",{
className:"mt-3 grid gap-2 md:grid-cols-2",children:[
(0,i.jsx)(KA,{
label:"결과",metricId:"result",value:o}
),
(0,i.jsx)(KA,{
label:"총 사용 크레딧",metricId:"total-used-credits",value:l}
)]}
),
(0,i.jsxs)("div",{
className:"mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground",children:[
(0,i.jsxs)("span",{
className:"rounded-full border border-border bg-muted/40 px-2 py-1",children:["검색 채널 ",d.length,"개"]}
),
(0,i.jsxs)("span",{
className:"rounded-full border border-border bg-muted/40 px-2 py-1",children:["검색 언어 ",c,"개"]}
),
(0,i.jsxs)("span",{
className:"rounded-full border border-border bg-muted/40 px-2 py-1",children:["원본 목표 ",u]}
),
(0,i.jsxs)("span",{
className:"rounded-full border border-border bg-muted/40 px-2 py-1",children:["내보내기 중 ",m,"개"]}
)]}
),
(0,i.jsx)("div",{
className:"mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",children:
(0,i.jsxs)("div",{
className:"grid grid-cols-5 gap-1.5 text-[11px] text-muted-foreground",children:[
(0,i.jsxs)("span",{
className:"inline-flex items-center gap-1",children:[
(0,i.jsx)(aS.A,{
className:"h-3.5 w-3.5"}
),"검색"]}
),
(0,i.jsxs)("span",{
className:"inline-flex items-center gap-1",children:[
(0,i.jsx)(Kz.A,{
className:"h-3.5 w-3.5"}
),"다운로드"]}
),
(0,i.jsxs)("span",{
className:"inline-flex items-center gap-1",children:[
(0,i.jsx)(K_.A,{
className:"h-3.5 w-3.5"}
),"매칭"]}
),
(0,i.jsxs)("span",{
className:"inline-flex items-center gap-1",children:[
(0,i.jsx)(KD.A,{
className:"h-3.5 w-3.5"}
),"편집"]}
),
(0,i.jsxs)("span",{
className:"inline-flex items-center gap-1",children:[
(0,i.jsx)(mG.A,{
className:"h-3.5 w-3.5"}
),"CapCut"]}
)]}
)}
),
(0,i.jsxs)("div",{
className:"mt-4 space-y-1.5",children:[
(0,i.jsxs)("div",{
className:"flex justify-between text-muted-foreground text-xs",children:[
(0,i.jsx)("span",{
children:"전체 진행률"}
),
(0,i.jsxs)("span",{
className:"tabular-nums",children:[p,"%"]}
)]}
),
(0,i.jsx)(mv.k,{
value:p}
)]}
)]}
),
(0,i.jsx)("div",{
className:"overflow-hidden rounded-lg border border-border bg-background shadow-sm",children:
(0,i.jsx)("div",{
className:"lg:overflow-x-auto",children:
(0,i.jsxs)("div",{
className:"lg:min-w-[760px]",children:[
(0,i.jsxs)("div",{
className:"hidden grid-cols-[minmax(0,1.3fr)_92px_120px_92px_200px] gap-2 border-border border-b px-4 py-2 font-medium text-muted-foreground text-xs lg:grid",children:[
(0,i.jsx)("div",{
children:"작업"}
),
(0,i.jsx)("div",{
children:"상태"}
),
(0,i.jsx)("div",{
children:"진행"}
),
(0,i.jsx)("div",{
children:"예상 시간"}
),
(0,i.jsx)("div",{
children:"내보내기"}
)]}
),
(0,i.jsx)("div",{
className:"max-h-[520px] overflow-y-auto",children:0===h.length?
(0,i.jsxs)("div",{
className:"flex min-h-56 flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground text-sm",children:[
(0,i.jsx)(b_.A,{
className:"h-8 w-8"}
),
(0,i.jsx)("div",{
children:"대본을 넣고 작업을 추가하면 큐가 여기에 쌓입니다."}
)]}
):h.map(e=>
(0,i.jsx)(KO,{
job:e,nowMs:g,queueRunning:f,isOpen:x.includes(e.id),onToggleOpen:b,onRetry:y,onExport:v,onRemove:w,onLoadSettings:j,onOpenDraftFolder:k,onRevealDraft:C}
,e.id))}
)]}
)}
)}
)]}
)}
