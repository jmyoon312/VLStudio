/**
 * YouTube 쇼츠 알고리즘 추천 및 검색 노출 극대화를 위한 다각화 스마트 태그 생성기
 */
export function generateSmartSeoTags(title: string, lang: string = 'KO', existingTags?: string[]): string {
  const cleanTitle = (title || '').replace(/\.[^/.]+$/, '').replace(/[\[\](){}]/g, ' ').trim();
  const titleWords = cleanTitle.split(/\s+/).filter(w => w.length >= 2);
  
  const tagSet = new Set<string>();
  
  // 1. 기존 태그가 유효하면 추가 (# 제거)
  if (Array.isArray(existingTags)) {
    existingTags.forEach(t => {
      const clean = t.replace(/^#/, '').trim();
      if (clean && clean.length >= 2) tagSet.add(clean);
    });
  }
  
  // 2. 제목 기반 조합 키워드 (연관 롱테일)
  if (titleWords.length >= 2) {
    tagSet.add(titleWords.slice(0, 2).join(' '));
    tagSet.add(titleWords.slice(-2).join(' '));
  }
  titleWords.forEach(w => tagSet.add(w));
  if (cleanTitle.length > 2 && cleanTitle.length < 30) {
    tagSet.add(cleanTitle);
  }
  
  // 3. 언어별/알고리즘별 고유 바이럴 롱테일 태그 주입 (해시태그와 차별화된 검색용)
  const l = (lang || 'KO').toUpperCase();
  if (l === 'KO') {
    ['현실 반응', '실화 레전드', '사이다 실화', '쇼츠 추천', '유튜브 쇼츠', '알고리즘 추천', '꿀잼 쇼츠', '감동 실화', '인기 급상승', 'shorts korea', 'viral shorts', 'korean viral'].forEach(k => tagSet.add(k));
  } else if (l === 'EN') {
    ['viral shorts', 'trending video', 'reaction video', 'storytime', 'must watch', 'funny moments', 'family love', 'shorts algorithm', 'trending shorts', 'viral video'].forEach(k => tagSet.add(k));
  } else if (l === 'JA') {
    ['ショート', 'YouTubeショート', 'おすすめ', 'バズる', '神回', '面白い動画', '感動実話', 'ショート動画', 'shorts japan', 'viral shorts'].forEach(k => tagSet.add(k));
  } else if (l === 'ZH-TW' || l === 'ZH') {
    ['短影音', 'YouTube Shorts', '爆笑日常', '感動實話', '推薦影片', '熱門推薦', '演算法', 'shorts viral'].forEach(k => tagSet.add(k));
  } else if (l === 'ES') {
    ['shorts en espanol', 'videos virales', 'tendencias', 'momentos divertidos', 'historia real', 'shorts viral', 'algoritmo youtube'].forEach(k => tagSet.add(k));
  } else {
    ['viral shorts', 'trending', 'shorts algorithm', 'shorts video', 'must watch', 'recommended'].forEach(k => tagSet.add(k));
  }
  
  return Array.from(tagSet).slice(0, 20).join(', ');
}

/**
 * YouTube 쇼츠 피드 추천용 3~5대 핵심 바이럴 해시태그 생성기
 */
export function generateSmartHashtags(title: string, lang: string = 'KO', existingHashtags?: string[]): string {
  const hashSet = new Set<string>();
  
  // 1. 기존 해시태그 우선 (# 보장)
  if (Array.isArray(existingHashtags) && existingHashtags.length > 0) {
    existingHashtags.forEach(h => {
      const clean = h.trim();
      if (clean) hashSet.add(clean.startsWith('#') ? clean : `#${clean}`);
    });
  }
  
  // 2. 제목 핵심 명사 1~2개 해시태그화
  const cleanTitle = (title || '').replace(/\.[^/.]+$/, '').replace(/[\[\](){}]/g, ' ').trim();
  const words = cleanTitle.split(/\s+/).filter(w => w.length >= 2);
  if (words.length > 0) hashSet.add(`#${words[0]}`);
  if (words.length > 1) hashSet.add(`#${words[1]}`);
  
  // 3. 언어별 핵심 쇼츠 피드 해시태그 (간결한 4~5개)
  const l = (lang || 'KO').toUpperCase();
  if (l === 'KO') {
    ['#shorts', '#쇼츠', '#사이다', '#실화', '#viral'].forEach(h => hashSet.add(h));
  } else if (l === 'JA') {
    ['#shorts', '#ショート', '#おすすめ', '#バズる', '#viral'].forEach(h => hashSet.add(h));
  } else if (l === 'EN') {
    ['#shorts', '#viral', '#trending', '#storytime', '#fyp'].forEach(h => hashSet.add(h));
  } else if (l === 'ZH-TW' || l === 'ZH') {
    ['#shorts', '#短影音', '#推薦', '#viral'].forEach(h => hashSet.add(h));
  } else if (l === 'ES') {
    ['#shorts', '#viral', '#parati', '#tendencia'].forEach(h => hashSet.add(h));
  } else {
    ['#shorts', '#viral', '#trending', '#fyp'].forEach(h => hashSet.add(h));
  }
  
  return Array.from(hashSet).slice(0, 6).join(' ');
}

export function generatePixelingStandardMeta(jobs: any[]): string {
  if (!jobs || jobs.length === 0) return '';
  
  const today = new Date().toISOString().split('T')[0];
  const lines: string[] = [];
  
  lines.push(`저장일: ${today}`);
  lines.push(`소스 수: ${jobs.length}`);
  lines.push(`메타 세트 수: ${jobs.length}`);
  lines.push('');
  
  jobs.forEach((job, idx) => {
    const rawFilename = job.video_filename || `video_${job.id || idx + 1}.mp4`;
    const cleanName = rawFilename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    const langCode = (job.target_lang || 'KO').toUpperCase();
    const datePrefix = today.replace(/-/g, '').slice(2);
    const standardFilename = `${datePrefix}_${langCode}_${cleanName}.mp4`;
    
    // Parse result json & primary_analysis
    let res: any = {};
    let candidates: string[] = [];
    try {
      const raw = job.primary_analysis || (typeof job.result === 'string' ? JSON.parse(job.result) : (job.result || {}));
      res = raw.primary || raw.primary_analysis || raw;
      candidates = job.title_candidates || res.candidate_titles || [];
    } catch (_) {}
    
    // 1. Title
    let title = res.youtube_title || res.main_hook_title || '';
    if (!title && candidates.length > 0) {
      title = candidates[0].replace(/^\([^)]+\)\s*/, '');
    }
    if (!title) {
      title = cleanName;
    }
    
    // 2. Hashtags for Description (3~6 core feed tags)
    const formattedHashtags = generateSmartHashtags(title, langCode, res.hashtags);
    
    // 3. Description (Body + Distinct Hashtags)
    let desc = res.youtube_description || res.description || '';
    if (!desc.includes('#') && formattedHashtags) {
      desc = desc ? `${desc}\n\n${formattedHashtags}` : formattedHashtags;
    }
    if (!desc) {
      desc = `${title} 영상입니다. 끝까지 시청해주세요!\n\n${formattedHashtags}`;
    }
    
    // 4. Tags for YouTube Search / Suggested SEO (15~20 diverse keywords, NO #, distinct from hashtags)
    const tagsStr = generateSmartSeoTags(title, langCode, res.tags);
    
    // 5. Script / Subtitles
    let script = res.full_script || res.script || '';
    if (!script && Array.isArray(res.situation_subtitles)) {
      script = res.situation_subtitles.map((s: any) => s.text).filter(Boolean).join(' ');
    }
    if (!script) script = '(대본 없음)';
    
    const langLabel = job.target_lang === 'en' ? '영어' :
                      job.target_lang === 'ja' ? '일본어' :
                      job.target_lang === 'zh-tw' ? '대만 번체' :
                      job.target_lang === 'es' ? '스페인어' : '원본';
    
    lines.push('========================================');
    lines.push(`${idx + 1}. ${standardFilename}`);
    lines.push(`소스 파일명: ${standardFilename}`);
    lines.push(`포함 메타: ${langLabel}`);
    lines.push('========================================');
    lines.push(`[${langLabel}] 추천 메타`);
    lines.push(`언어: ${langLabel}`);
    lines.push('제목');
    lines.push(title);
    lines.push('설명');
    lines.push(desc);
    lines.push('태그');
    lines.push(tagsStr);
    lines.push('대본');
    lines.push(script);
    lines.push('');
  });
  
  return lines.join('\n');
}
