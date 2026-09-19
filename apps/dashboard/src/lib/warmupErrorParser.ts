/**
 * 웜업 오류 지능형 분류 및 한글 진단 유틸리티 (Warmup Error Diagnostic Explainer)
 * 
 * 기술적 시스템 에러(AUTH_DROPPED, net::ERR_FAILED, Timeout 등)를
 * 사용자가 직관적으로 이해할 수 있는 한글 원인 및 즉각 조치 가이드로 변환합니다.
 */

export interface WarmupErrorDiagnostic {
    type: 'AUTH_DROPPED' | 'NETWORK_PROXY' | 'TIMEOUT' | 'BROWSER_CLOSED' | 'INTERRUPTED' | 'UNKNOWN';
    badge: string;
    badgeVariant: 'default' | 'destructive' | 'outline';
    badgeClass: string;
    title: string;
    description: string;
    solution: string;
    primaryAction: 'OPEN_BROWSER' | 'ROTATE_IP' | 'RETRY' | 'CLEAR_LOCK';
    primaryActionLabel: string;
    rawError: string;
}

export function parseWarmupError(rawError?: string | null): WarmupErrorDiagnostic {
    const raw = (rawError || '').trim();
    const lower = raw.toLowerCase();

    // 1. 구글 / 유튜브 로그인 세션 만료
    if (
        lower.includes('auth_dropped') ||
        lower.includes('로그인') ||
        lower.includes('login') ||
        lower.includes('credential') ||
        lower.includes('인증 세션') ||
        lower.includes('password') ||
        lower.includes('sign in')
    ) {
        return {
            type: 'AUTH_DROPPED',
            badge: '🔑 계정 세션 만료',
            badgeVariant: 'outline',
            badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
            title: '구글/유튜브 로그인 세션이 만료되었습니다',
            description: '유튜브 계정의 로그인 세션이 풀렸거나 2단계 보안 인증, 비밀번호 확인 등이 필요하여 자동화가 중단되었습니다.',
            solution: '아래 [브라우저 열기] 버튼을 눌러 전용 창에서 1회 직접 로그인 상태를 확인하고 재시도하세요.',
            primaryAction: 'OPEN_BROWSER',
            primaryActionLabel: '🌐 브라우저 열어 로그인 확인',
            rawError: raw || '인증 세션 만료 (AUTH_DROPPED)'
        };
    }

    // 2. EveryProxy / SOCKS5 모바일 프록시 또는 네트워크 단절
    if (
        lower.includes('err_failed') ||
        lower.includes('net::') ||
        lower.includes('proxy') ||
        lower.includes('econnrefused') ||
        lower.includes('socks') ||
        lower.includes('socket') ||
        lower.includes('dns') ||
        lower.includes('network') ||
        lower.includes('connectex')
    ) {
        return {
            type: 'NETWORK_PROXY',
            badge: '🌐 프록시/네트워크 단절',
            badgeVariant: 'destructive',
            badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
            title: '모바일 테더링 프록시 통신 실패',
            description: '스마트폰의 EveryProxy(SOCKS5 1080/8080 포트) 또는 모바일 데이터 테더링 연결이 끊어져 유튜브에 접속할 수 없습니다.',
            solution: '스마트폰의 프록시 앱 실행 상태를 확인하고, [IP 재할당] 버튼을 눌러 비행기 모드를 토글한 뒤 재시도하세요.',
            primaryAction: 'ROTATE_IP',
            primaryActionLabel: '📱 IP 재할당 (비행기 모드)',
            rawError: raw || 'net::ERR_FAILED'
        };
    }

    // 3. 페이지 로딩 응답 시간 초과
    if (
        lower.includes('timeout') ||
        lower.includes('timed out') ||
        lower.includes('waiting for selector') ||
        lower.includes('wait_for')
    ) {
        return {
            type: 'TIMEOUT',
            badge: '⏱️ 페이지 응답 시간 초과',
            badgeVariant: 'outline',
            badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
            title: '유튜브 응답 시간 30초 초과',
            description: '모바일 통신 속도 저하 또는 유튜브 트래픽 지연으로 인해 30초 내에 페이지나 영상 로딩이 완료되지 못했습니다.',
            solution: '일시적인 네트워크 지연일 수 있습니다. 인터넷 상태를 점검하거나 바로 [재시도]를 실행해보세요.',
            primaryAction: 'RETRY',
            primaryActionLabel: '🔄 웜업 즉시 재시도',
            rawError: raw || 'Timeout exceeded'
        };
    }

    // 4. 브라우저 프로세스 강제 종료 또는 크래시
    if (
        lower.includes('target closed') ||
        lower.includes('browser has been closed') ||
        lower.includes('crash') ||
        lower.includes('session closed') ||
        lower.includes('process exited')
    ) {
        return {
            type: 'BROWSER_CLOSED',
            badge: '⚠️ 브라우저 프로세스 종료',
            badgeVariant: 'outline',
            badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
            title: '브라우저 창이 닫혔거나 강제 종료되었습니다',
            description: '웜업 작업이 진행되는 동안 크롬 브라우저 창이 사용자에 의해 닫혔거나, 메모리 부족으로 프로세스가 종료되었습니다.',
            solution: '창을 닫지 마시고 [재시도]를 눌러 백그라운드 또는 화면 표시 모드로 다시 실행하세요.',
            primaryAction: 'RETRY',
            primaryActionLabel: '🔄 웜업 다시 시작',
            rawError: raw || 'Target browser closed'
        };
    }

    // 5. 이전 작업 비정상 중단 (레거시 로그)
    if (
        lower.includes('interrupted') ||
        lower.includes('encountered an error or was interrupted') ||
        lower.includes('중단')
    ) {
        return {
            type: 'INTERRUPTED',
            badge: '⏸️ 이전 작업 비정상 중단',
            badgeVariant: 'outline',
            badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
            title: '이전 릴리즈 버전의 웜업 중단 기록',
            description: '이전 버전 실행 중 시스템이 재시작되었거나 백그라운드 작업이 완료되지 못하고 멈춘 상태입니다.',
            solution: '최신 안정화 패치가 적용되었으므로 아래 [웜업 새로 실행] 버튼을 눌러 작업을 재개하세요.',
            primaryAction: 'RETRY',
            primaryActionLabel: '🔄 웜업 새로 실행',
            rawError: raw || 'Automated warmup encountered an error or was interrupted.'
        };
    }

    // 6. 기타 일반 오류
    return {
        type: 'UNKNOWN',
        badge: '⚠️ 웜업 루틴 오류',
        badgeVariant: 'destructive',
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        title: '웜업 실행 중 오류가 발생했습니다',
        description: raw || '원인을 특정할 수 없는 오류가 발생했습니다. 로그 상세 내용을 확인해주세요.',
        solution: '에러 내용을 복사해 확인하거나 [브라우저 열기]로 채널 상태를 직접 점검해보세요.',
        primaryAction: 'RETRY',
        primaryActionLabel: '🔄 재시도',
        rawError: raw || 'Unknown warmup error'
    };
}
