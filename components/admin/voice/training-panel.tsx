"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { voiceApi } from "@/lib/api/client"
import { toast } from "sonner"
import type { ServerFilesResponse } from "@/lib/api/types"
import { Loader2, Terminal, Play, Square, RefreshCw } from "lucide-react"

interface TrainingPanelProps {
    serverFiles: ServerFilesResponse | null;
    /** Voice 생성 성공 시 상위에서 loadVoices/refreshFiles 재호출용 */
    onVoiceCreated?: () => void;
}

export function TrainingPanel({ serverFiles, onVoiceCreated }: TrainingPanelProps) {
    // Form States
    const [modelName, setModelName] = useState("");
    const [uploadPath, setUploadPath] = useState("");
    const [version, setVersion] = useState("v2Pro");
    // 사용자가 건들지 못하게 고정 (Server A 기본값 준수)
    const [batchSize] = useState(11); 
    const [totalEpochs] = useState(8); // SoVITS Epochs (GPT is fixed to 15 in server)
    const [dryRun, setDryRun] = useState(false);

    // Execution States
    const [isTraining, setIsTraining] = useState(false);
    const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [currentModel, setCurrentModel] = useState<string | null>(null);
    
    // Auto-scroll logic
    const logScrollRef = useRef<HTMLDivElement>(null);
    // 학습 완료 시 createVoice 1회만 수행
    const hasAutoCreatedVoiceRef = useRef(false);

    // ... (useEffect poling logic omitted, keep existing) ...
    // Polling Interval
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (currentModel && (status === 'queued' || status === 'processing')) {
            interval = setInterval(async () => {
                await checkStatusAndLogs(currentModel);
            }, 1000); // 1초마다 갱신
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [currentModel, status]);

    // Scroll to bottom on new logs
    useEffect(() => {
        if (logScrollRef.current) {
            logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
        }
    }, [logs]);

    const checkStatusAndLogs = async (name: string) => {
        try {
            // 1. Check Status
            const statusRes = await voiceApi.getTrainingStatus(name);
            if (statusRes.success && statusRes.data) {
                setStatus(statusRes.data.status);
                setProgress(statusRes.data.progress * 100);
                
                if (statusRes.data.status === 'completed' || statusRes.data.status === 'failed') {
                    setIsTraining(false);
                    if (statusRes.data.status === 'completed') {
                        toast.success("학습이 완료되었습니다!");
                        // 완료 시 1회만 Voice 자동 생성: ref=폴더 내 max 파일, name=폴더명, gpt/sovits=logs
                        if (!hasAutoCreatedVoiceRef.current) {
                            hasAutoCreatedVoiceRef.current = true;
                            (async () => {
                                try {
                                    const voice = serverFiles?.train_voices?.voices?.find((v) => v.path === uploadPath);
                                    if (!voice) {
                                        toast.error("훈련 폴더를 찾을 수 없습니다.");
                                        return;
                                    }
                                    const files = voice.files && voice.files.length > 0 ? voice.files : [];
                                    const chosen = files.length ? files.reduce((a, b) => (a.size_bytes >= b.size_bytes ? a : b)) : null;
                                    if (!chosen) {
                                        toast.error("참조 오디오를 찾을 수 없습니다.");
                                        return;
                                    }
                                    const ref_audio_path = voice.path + "/" + chosen.name;
                                    const character_name = voice.character_name;
                                    const logModel = serverFiles?.logs?.models?.find((m) => m.model_name === name);
                                    const gpt = logModel?.gpt_path ?? undefined;
                                    const sovits = logModel?.sovits_path ?? undefined;
                                    const base = serverFiles?.train_voices?.base_path;
                                    let train_input_dir: string | undefined;
                                    if (base && uploadPath.startsWith(base)) {
                                        train_input_dir = uploadPath.slice(base.length).replace(/^[/\\]/, "");
                                    } else {
                                        train_input_dir = uploadPath.split(/[/\\]/).filter(Boolean).pop() || undefined;
                                    }
                                    const res = await voiceApi.createVoice({
                                        name: character_name,
                                        ref_audio_path,
                                        gpt_weights_path: gpt,
                                        sovits_weights_path: sovits,
                                        train_voice_folder: character_name,
                                        train_input_dir,
                                        training_model_name: name,
                                        language: "ko",
                                        prompt_text: "",
                                        prompt_lang: "ko",
                                        is_default: false,
                                        is_active: true,
                                        model_version: version,
                                    });
                                    if (res.success) {
                                        toast.success("Voice가 DB에 등록되었습니다.");
                                        onVoiceCreated?.();
                                    } else {
                                        toast.error(res.error?.message || "Voice 등록 실패");
                                    }
                                } catch {
                                    toast.error("Voice 등록 중 오류가 발생했습니다.");
                                }
                            })();
                        }
                    } else {
                        toast.error(`학습 실패: ${statusRes.data.message}`);
                    }
                }
            }

            // 2. Get Logs
            const logRes = await voiceApi.getTrainingLog(name);
            if (logRes.success && logRes.data) {
                const logLines = logRes.data.log.split('\n');
                setLogs(logLines);
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    };

    const handleStartTraining = async () => {
        if (!modelName || !uploadPath) {
            toast.error("모델 이름과 참조 오디오 경로는 필수입니다.");
            return;
        }

        try {
            setIsTraining(true);
            setLogs(["Initializing training request...", "Waiting for server response..."]);
            setStatus('queued');
            setProgress(0);
            setCurrentModel(modelName);
            hasAutoCreatedVoiceRef.current = false;

            const response = await voiceApi.startTraining({
                model_name: modelName,
                upload_path: uploadPath,
                version: version,
                batch_size: batchSize,
                total_epochs: totalEpochs,
                dry_run: dryRun
            });

            if (response.success) {
                toast.success("학습 요청이 전송되었습니다.");
            } else {
                toast.error(response.error?.message || "학습 시작 실패");
                setIsTraining(false);
                setStatus('failed');
                setLogs(prev => [...prev, `Error: ${response.error?.message}`]);
            }
        } catch (error) {
            toast.error("통신 오류가 발생했습니다.");
            setIsTraining(false);
            setStatus('failed');
        }
    };

    const handleStop = () => {
        setIsTraining(false);
        setStatus('idle');
        toast.info("상태 모니터링을 중단했습니다. (서버 작업은 계속될 수 있습니다)");
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[700px]">
            {/* 좌측: 설정 패널 */}
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5 text-primary" />
                        학습 설정
                    </CardTitle>
                    <CardDescription>
                        GPT-SoVITS 모델 파인튜닝 파라미터를 설정합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 overflow-y-auto p-6">
                    <div className="space-y-2">
                        <Label>모델 이름 (영어 권장)</Label>
                        <Input 
                            value={modelName} 
                            onChange={(e) => setModelName(e.target.value)}
                            placeholder="my-character-v1"
                            disabled={isTraining}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>설정 파일 선택 (Server A 내 경로)</Label>
                        <Select value={uploadPath} onValueChange={setUploadPath} disabled={isTraining}>
                             <SelectTrigger>
                                <SelectValue placeholder="학습 데이터 폴더 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {serverFiles?.train_voices.voices.length === 0 ? (
                                    <SelectItem value="none" disabled>폴더 없음 (파일 탐색기에서 생성 필요)</SelectItem>
                                ) : (
                                    serverFiles?.train_voices.voices.map(v => (
                                        <SelectItem key={v.path} value={v.path}>
                                            {v.character_name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            * '훈련 데이터' 탭에서 생성한 캐릭터 폴더를 선택하세요.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>모델 버전</Label>
                            <Select value={version} onValueChange={setVersion} disabled={isTraining}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="v1">v1</SelectItem>
                                    <SelectItem value="v2">v2</SelectItem>
                                    <SelectItem value="v4">v4</SelectItem>
                                    <SelectItem value="v2Pro">v2Pro (Default)</SelectItem>
                                    <SelectItem value="v2ProPlus">v2ProPlus</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label>Batch Size (Fixed)</Label>
                            <Input 
                                type="number" 
                                value={batchSize} 
                                disabled={true}
                                className="bg-muted text-muted-foreground"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Epochs (SoVITS Fixed)</Label>
                         <Input 
                                type="number" 
                                value={totalEpochs} 
                                disabled={true}
                                className="bg-muted text-muted-foreground"
                            />
                        <p className="text-xs text-muted-foreground">SoVITS: 8 Epochs / GPT: 15 Epochs (Fixed)</p>
                    </div>

                    <div className="flex items-center space-x-2 border p-4 rounded-md">
                        <Switch 
                            id="dry_run" 
                            checked={dryRun} 
                            onCheckedChange={setDryRun}
                            disabled={isTraining}
                        />
                        <Label htmlFor="dry_run">Dry Run (테스트 모드)</Label>
                    </div>

                    <Button 
                        className="w-full h-12 text-lg font-bold" 
                        onClick={handleStartTraining} 
                        disabled={isTraining}
                    >
                        {isTraining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" />}
                        {isTraining ? "학습 중..." : "학습 시작"}
                    </Button>
                </CardContent>
            </Card>

            {/* 우측: 로그 뷰어 */}
            <Card className="flex flex-col h-full bg-black border-zinc-800">
                <CardHeader className="border-b border-zinc-800 pb-4">
                     <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Terminal className="h-5 w-5 text-green-500" />
                            실시간 로그
                        </CardTitle>
                        {isTraining && (
                             <Button variant="destructive" size="sm" onClick={handleStop}>
                                <Square className="h-3 w-3 mr-1" /> 모니터링 중지
                             </Button>
                        )}
                    </div>
                    <div className="space-y-2 mt-2">
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span>Status: <span className={`font-bold ${status === 'completed' ? 'text-blue-400' : status === 'failed' ? 'text-red-400' : 'text-green-400'}`}>{status.toUpperCase()}</span></span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-zinc-800 [&>[data-slot=progress-indicator]]:bg-green-500" />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden relative">
                    <div 
                        ref={logScrollRef}
                        className="h-full overflow-y-auto p-4 font-mono text-sm space-y-1"
                    >
                        {logs.length === 0 ? (
                            <div className="text-zinc-600 italic text-center mt-20">
                                대기 중... 학습을 시작하면 로그가 표시됩니다.
                            </div>
                        ) : (
                            logs.map((line, i) => (
                                <div key={i} className="text-zinc-300 break-words leading-tight">
                                    {line}
                                </div>
                            ))
                        )}
                        {status === 'processing' && (
                             <div className="animate-pulse text-green-500">_</div>
                        )}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
