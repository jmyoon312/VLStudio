import React, { useState } from 'react';
import { useEditorStore, Template } from '../hooks/useEditorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Play, FileSpreadsheet, ArrowRight } from 'lucide-react';
import axios from 'axios';

const BulkCreator = () => {
    const { templates } = useEditorStore();
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [status, setStatus] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim());
                setHeaders(headers);

                const data = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const row: any = {};
                    headers.forEach((h, i) => row[h] = values[i]);
                    return row;
                });
                setCsvData(data);
            }
        };
        reader.readAsText(file);
    };

    const handleGenerate = async () => {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) return;

        setStatus('Generating jobs...');
        try {
            // Construct the template object from the store's template structure
            // Note: The store's template might need to be fully serializable.
            // We assume 'template' is the full state.

            // We need to map the store's template format to what the backend expects.
            // The backend expects { tracks: [...] } which matches the store.

            const payload = {
                template: { tracks: template.tracks },
                csv_data: csvData,
                mapping: mapping
            };

            await axios.post('/queue/bulk', payload);
            setStatus(`Successfully queued ${csvData.length} jobs! Check the Queue Manager.`);
        } catch (error) {
            console.error(error);
            setStatus('Error generating jobs.');
        }
    };

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    const mappableClips = selectedTemplate?.tracks.flatMap(t => t.clips).filter(c => c.type === 'text' || c.type === 'image' || c.type === 'video') || [];

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-end">
                <Button onClick={handleGenerate} disabled={!selectedTemplateId || csvData.length === 0} className="bg-blue-600 hover:bg-blue-700">
                    <Play className="w-4 h-4 mr-2" /> Start Batch Generation
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Step 1: Template */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">1. Select Template</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a template..." />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                                {templates.length === 0 && <div className="p-2 text-sm text-gray-500">No templates saved. Save one in the Editor first.</div>}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Step 2: Data */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">2. Upload Data (CSV)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <FileSpreadsheet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">{csvData.length > 0 ? `${csvData.length} rows loaded` : "Drop CSV here"}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 3: Mapping */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-lg">3. Map Variables</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedTemplateId && csvData.length > 0 ? (
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="font-medium text-sm text-gray-500 uppercase">Template Layers</h4>
                                    {mappableClips.map(clip => (
                                        <div key={clip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-8 rounded ${clip.type === 'text' ? 'bg-purple-400' : 'bg-blue-400'}`} />
                                                <div>
                                                    <div className="font-medium text-sm">{clip.name}</div>
                                                    <div className="text-xs text-gray-400">{clip.type}</div>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-gray-300" />
                                            <Select
                                                value={mapping[clip.id] || ''}
                                                onValueChange={(v) => setMapping(prev => ({ ...prev, [clip.id]: v }))}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Select Column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {headers.map(h => (
                                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium text-sm text-gray-500 uppercase">Data Preview (Row 1)</h4>
                                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-auto h-[300px]">
                                        {mappableClips.map(clip => {
                                            const col = mapping[clip.id];
                                            const val = col ? csvData[0][col] : '(Unmapped)';
                                            return (
                                                <div key={clip.id} className="mb-2">
                                                    <span className="text-blue-400">{clip.name}:</span> <span className="text-green-400">"{val}"</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                Select a template and upload data to start mapping.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {status && (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 text-center font-medium">
                    {status}
                </div>
            )}
        </div>
    );
};

export default BulkCreator;
