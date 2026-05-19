import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Loader2, Play, LayoutTemplate, Video, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface RenderJob {
  id: str;
  script: string;
  status: string;
  progress: number;
  created_at: string;
  video_url: string | null;
  error_message: string | null;
}

export function PixelingTab() {
  const [script, setScript] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/pixeling/gallery');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) {
      console.error('Failed to fetch pixeling gallery', e);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartRender = async () => {
    if (!script.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/pixeling/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, template_id: 'default' })
      });
      if (!res.ok) throw new Error('Render failed to start');
      setScript('');
      await fetchJobs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 font-black italic uppercase tracking-tighter text-[10px] text-slate-900">
                <LayoutTemplate className="w-3.5 h-3.5 text-indigo-500" />
                New Render Task
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="Enter the script for Pixie..." 
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="min-h-[200px]"
              />
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button 
                onClick={handleStartRender} 
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={isSubmitting || !script.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Trigger Pixeling Render
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-500" />
                Render Queue & Gallery
              </CardTitle>
              <CardDescription>Live status of your Pixeling jobs.</CardDescription>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No renders yet. Submit a script to start.
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map(job => (
                    <div key={job.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="font-medium truncate max-w-[60%]">
                          {job.script.substring(0, 50)}...
                        </div>
                        <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                          {job.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      {job.status === 'processing' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Rendering...</span>
                            <span>{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      )}
                      
                      {job.status === 'completed' && job.video_url && (
                        <div className="mt-2">
                          <a 
                            href={job.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" /> View Result Video
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
