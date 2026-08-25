import { DailyReportList } from '@/components/Reports/DailyReportList';
// Layout is handled in App.tsx

export function ReportsPage() {
    return (
        <div className="min-h-screen flex-1 flex-col space-y-4 sm:space-y-6 p-3 sm:p-6 bg-background text-foreground">
            <DailyReportList />
        </div>
    );
}
