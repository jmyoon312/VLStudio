import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Save, Plus, Trash2, FileAudio, Music, Clock } from 'lucide-react';

export default function StationDetail() {
    const { stationId } = useParams();
    const [station, setStation] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Playlist Editor State
    const [tracks, setTracks] = useState<{ path: string, title: string, weight: number }[]>([]);
    const [newTrackPath, setNewTrackPath] = useState('');

    useEffect(() => {
        if (stationId) fetchStation();
    }, [stationId]);

    const fetchStation = async () => {
        try {
            const res = await axios.get(`/api/stations/${stationId}`);
            setStation(res.data);

            // In a real app, we would fetch the playlist tracks here.
            // For now, if there is a current_playlist_id, we might want to fetch it.
            // But since the API for fetching playlist details isn't fully separated yet,
            // we will simulate or just start empty for adding new tracks.
            // *Enhancement*: Fetch playlist details if ID exists (Future Work)
        } catch (err) {
            console.error("Failed to fetch station", err);
        } finally {
            setLoading(false);
        }
    };

    const addTrack = () => {
        if (!newTrackPath) return;
        setTracks([...tracks, { path: newTrackPath, title: 'Unknown Track', weight: 1 }]);
        setNewTrackPath('');
    };

    const removeTrack = (index: number) => {
        const newTracks = [...tracks];
        newTracks.splice(index, 1);
        setTracks(newTracks);
    };

    const savePlaylist = async () => {
        if (tracks.length === 0) {
            alert("플레이리스트에 최소 1개의 트랙이 필요합니다.");
            return;
        }
        try {
            await axios.post(`/api/stations/${stationId}/playlist`, {
                name: `Playlist ${new Date().toLocaleString()}`,
                tracks_json: tracks
            });
            alert("플레이리스트가 저장 및 적용되었습니다!");
            fetchStation(); // Refresh to show new playlist ID
        } catch (err) {
            alert("저장 실패");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">로딩 중...</div>;
    if (!station) return <div className="p-8 text-center text-red-500 font-bold">스테이션을 찾을 수 없습니다.</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 bg-gray-50 min-h-screen">
            <header className="flex items-center gap-4">
                <Link to="/station-manager" className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                </Link>
                <div>
                    <span className="text-xl font-black text-slate-900 tracking-tight">{station.name}</span>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="bg-gray-200 px-2 py-0.5 rounded text-xs font-mono">ID: {station.id}</span>
                        <span>|</span>
                        <span className={station.status === 'ONLINE' ? 'text-green-600 font-bold' : ''}>
                            {station.status}
                        </span>
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                        <Music className="w-5 h-5 text-indigo-600" />
                        활성 플레이리스트 편집
                    </h2>
                    {station.current_playlist_id && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold">
                            현재 재생 중: #{station.current_playlist_id}
                        </span>
                    )}
                </div>

                {/* Track List */}
                <div className="space-y-2 mb-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {tracks.map((track, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                            <span className="text-gray-400 font-mono text-xs w-6 flex-shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <div className="font-mono text-sm text-gray-700 truncate">{track.path}</div>
                            </div>
                            <button
                                onClick={() => removeTrack(i)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="제거"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {tracks.length === 0 && (
                        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <FileAudio className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">플레이리스트가 비어있습니다.</p>
                            <p className="text-xs mt-1">아래에서 오디오 트랙을 추가해주세요.</p>
                        </div>
                    )}
                </div>

                {/* Add Control */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">새 트랙 추가 (서버 경로)</label>
                    <div className="flex gap-2">
                        <input
                            value={newTrackPath}
                            onChange={e => setNewTrackPath(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTrack()}
                            className="flex-1 border border-gray-300 rounded-lg p-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="C:\music\track01.mp3"
                        />
                        <button
                            onClick={addTrack}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                        >
                            <Plus className="w-4 h-4" /> 추가
                        </button>
                    </div>
                </div>

                <div className="flex justify-end border-t border-gray-100 pt-6 mt-6">
                    <button
                        onClick={savePlaylist}
                        disabled={tracks.length === 0}
                        className={`px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all ${tracks.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                            }`}
                    >
                        <Save className="w-4 h-4" /> 저장 및 적용하기
                    </button>
                </div>
            </div>

        </div>
    );
}
