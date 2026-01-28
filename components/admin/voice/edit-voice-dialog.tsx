import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { voiceApi } from "@/lib/api/client"
import type { VoiceDetail, ServerFilesResponse, FileInfo } from "@/lib/api/types"
import { toast } from "sonner"
import { Loader2, AlertTriangle } from "lucide-react"

interface EditVoiceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    voice: VoiceDetail | null
    serverFiles: ServerFilesResponse | null
    onSuccess: () => void
}

export function EditVoiceDialog({ open, onOpenChange, voice, serverFiles, onSuccess }: EditVoiceDialogProps) {
    const [loading, setLoading] = useState(false)
    
    // Form States
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [promptText, setPromptText] = useState("")
    const [isActive, setIsActive] = useState(true)

    // Selection States
    const [selectedTrainFolder, setSelectedTrainFolder] = useState<string>("_manual") // folder path or _manual
    const [selectedAudioFile, setSelectedAudioFile] = useState<string>("") // full path
    
    const [modelSource, setModelSource] = useState<"logs" | "manual">("manual")
    const [selectedLogModel, setSelectedLogModel] = useState<string>("")
    const [gptPath, setGptPath] = useState("")
    const [sovitsPath, setSovitsPath] = useState("")

    // Initialize form when opening
    useEffect(() => {
        if (open && voice && serverFiles) {
            setName(voice.name)
            setDescription(voice.description || "")
            setPromptText(voice.prompt_text || "")
            setIsActive(voice.is_active)

            // 1. Train Folder & Audio Logic
            // Try to match voice.train_voice_folder or ref_audio_path parent to existing folders
            const matchedFolder = serverFiles.train_voices.voices.find(v => 
                (voice.train_voice_folder && v.character_name === voice.train_voice_folder) ||
                (voice.ref_audio_path.startsWith(v.path))
            )

            if (matchedFolder) {
                setSelectedTrainFolder(matchedFolder.path)
                // Check if ref_audio_path is exactly one of the files in this folder
                // (Note: APIs might return full path vs relative path, consistency check needed)
                // Assuming voice.ref_audio_path is full absolute path
                setSelectedAudioFile(voice.ref_audio_path)
            } else {
                // Not found in server lists (e.g. manually set or deleted folder), revert to manual text input logic?
                // For now, let's treat it as "Manual / Unknown" but still keep the value in the state
                setSelectedTrainFolder("_manual")
                setSelectedAudioFile(voice.ref_audio_path)
            }

            // 2. Model Logic
            // Check if current weights match any Log model pair exactly
            const matchedLog = serverFiles.logs?.models?.find(m => 
                m.gpt_path === voice.gpt_weights_path && m.sovits_path === voice.sovits_weights_path
            )

            if (matchedLog) {
                setModelSource("logs")
                setSelectedLogModel(matchedLog.model_name)
                setGptPath(voice.gpt_weights_path || "")
                setSovitsPath(voice.sovits_weights_path || "")
            } else {
                setModelSource("manual")
                setGptPath(voice.gpt_weights_path || "")
                setSovitsPath(voice.sovits_weights_path || "")
            }
        }
    }, [open, voice, serverFiles])

    // Update GPT/SoVITS when Log Model changes
    useEffect(() => {
        if (modelSource === "logs" && selectedLogModel && serverFiles?.logs?.models) {
            const m = serverFiles.logs.models.find(x => x.model_name === selectedLogModel)
            if (m) {
                setGptPath(m.gpt_path || "")
                setSovitsPath(m.sovits_path || "")
            }
        }
    }, [modelSource, selectedLogModel, serverFiles])

    // derived lists
    const currentFolderFiles = useMemo(() => {
        if (!serverFiles || selectedTrainFolder === "_manual") return []
        const folder = serverFiles.train_voices.voices.find(v => v.path === selectedTrainFolder)
        if (!folder || !folder.files) return []
        // Convert filename to full path for comparison/value
        return folder.files.map(f => ({
            name: f.name,
            fullPath: `${folder.path}/${f.name}` // Adjust separator if needed, usually / works
        }))
    }, [serverFiles, selectedTrainFolder])

    const allGptFiles = useMemo(() => 
        serverFiles ? Object.entries(serverFiles.models.gpt).flatMap(([ver, arr]) => arr.map(f => ({...f, version: ver}))) : []
    , [serverFiles])

    const allSovitsFiles = useMemo(() => 
        serverFiles ? Object.entries(serverFiles.models.sovits).flatMap(([ver, arr]) => arr.map(f => ({...f, version: ver}))) : []
    , [serverFiles])

    const handleSubmit = async () => {
        if (!voice) return
        if (!name.trim()) return toast.error("이름은 필수입니다.")
        if (!selectedAudioFile.trim()) return toast.error("참조 오디오는 필수입니다.")

        try {
            setLoading(true)
            
            // If selectedFolder is valid, use its character_name as train_voice_folder
            // otherwise keep existing or null?
            let train_voice_folder = voice.train_voice_folder
            if (selectedTrainFolder !== "_manual" && serverFiles) {
                const folder = serverFiles.train_voices.voices.find(v => v.path === selectedTrainFolder)
                if (folder) train_voice_folder = folder.character_name
            }

            const res = await voiceApi.updateVoice(voice.id, {
                name,
                description,
                ref_audio_path: selectedAudioFile, // This is the full path
                prompt_text: promptText,
                gpt_weights_path: gptPath || undefined,
                sovits_weights_path: sovitsPath || undefined,
                train_voice_folder, // Update hidden field too
                is_active: isActive
            })

            if (res.success) {
                toast.success("음성 정보가 수정되었습니다.")
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(res.error?.message || "수정 실패")
            }
        } catch (error) {
            toast.error("수정 중 오류가 발생했습니다.")
        } finally {
            setLoading(false)
        }
    }

    if (!voice) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>음성 정보 수정</DialogTitle>
                    <DialogDescription>
                        등록된 데이터(DB)를 수정합니다. 훈련 폴더나 모델 파일을 변경할 수 있습니다.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                    {/* 1. 기본 정보 */}
                    <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                        <Label className="text-base font-semibold">1. 기본 정보</Label>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">이름</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="desc" className="text-right">설명</Label>
                            <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="active" className="text-right">상태</Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                                <Label htmlFor="active">{isActive ? "사용 가능" : "비활성화"}</Label>
                            </div>
                        </div>
                    </div>

                    {/* 2. 참조 오디오 (폴더 선택 -> 파일 선택) */}
                    <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                        <Label className="text-base font-semibold">2. 참조 오디오 설정</Label>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">훈련 폴더</Label>
                            <div className="col-span-3">
                                <Select value={selectedTrainFolder} onValueChange={setSelectedTrainFolder}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="폴더 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_manual" className="text-muted-foreground font-style-italic">
                                            (직접 입력 모드 / 폴더 없음)
                                        </SelectItem>
                                        {serverFiles?.train_voices.voices.map(v => (
                                            <SelectItem key={v.path} value={v.path}>
                                                {v.character_name} ({v.files?.length || 0} files)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selectedTrainFolder !== "_manual" ? (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">오디오 파일</Label>
                                <div className="col-span-3">
                                    <Select value={selectedAudioFile} onValueChange={setSelectedAudioFile}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="파일 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currentFolderFiles.length === 0 ? (
                                                <SelectItem value="_none" disabled>파일 없음</SelectItem>
                                            ) : (
                                                currentFolderFiles.map(f => (
                                                    <SelectItem key={f.fullPath} value={f.fullPath}>
                                                        {f.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right text-yellow-600">직접 경로 입력</Label>
                                <Input 
                                    className="col-span-3 font-mono text-xs border-yellow-300 focus-visible:ring-yellow-400" 
                                    value={selectedAudioFile} 
                                    onChange={(e) => setSelectedAudioFile(e.target.value)} 
                                    placeholder="/opt/GPT-SoVITS/..."
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="p_text" className="text-right">참조 텍스트</Label>
                            <Textarea 
                                id="p_text" 
                                value={promptText} 
                                onChange={(e) => setPromptText(e.target.value)} 
                                className="col-span-3 h-16" 
                                placeholder="오디오 내용 받아적기 (선택)"
                            />
                        </div>
                    </div>

                    {/* 3. 모델 파일 (Logs or Manual) */}
                    <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                        <Label className="text-base font-semibold">3. 모델 파일 설정</Label>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">선택 방식</Label>
                            <div className="col-span-3">
                                <Select value={modelSource} onValueChange={(v: "logs"|"manual") => setModelSource(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="logs">Logs에서 선택 (추천)</SelectItem>
                                        <SelectItem value="manual">파일 직접 선택</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {modelSource === "logs" ? (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Logs 모델</Label>
                                <div className="col-span-3">
                                    <Select value={selectedLogModel} onValueChange={setSelectedLogModel}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="학습된 모델 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(!serverFiles?.logs?.models || serverFiles.logs.models.length === 0) ? (
                                                <SelectItem value="_none" disabled>학습 기록 없음</SelectItem>
                                            ) : (
                                                serverFiles.logs.models.map(m => (
                                                    <SelectItem key={m.model_name} value={m.model_name}>
                                                        {m.model_name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {selectedLogModel && (
                                        <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                            <div>GPT: {gptPath ? "✅ 연결됨" : "❌ 없음"}</div>
                                            <div>SoVITS: {sovitsPath ? "✅ 연결됨" : "❌ 없음"}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">GPT</Label>
                                    <div className="col-span-3">
                                        <Select value={gptPath || "_none"} onValueChange={(v) => setGptPath(v === "_none" ? "" : v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="GPT 파일 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_none">(없음)</SelectItem>
                                                {allGptFiles.map(f => (
                                                    <SelectItem key={f.path} value={f.path} className="text-xs">
                                                        [{f.version}] {f.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">SoVITS</Label>
                                    <div className="col-span-3">
                                        <Select value={sovitsPath || "_none"} onValueChange={(v) => setSovitsPath(v === "_none" ? "" : v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="SoVITS 파일 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_none">(없음)</SelectItem>
                                                {allSovitsFiles.map(f => (
                                                    <SelectItem key={f.path} value={f.path} className="text-xs">
                                                        [{f.version}] {f.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        수정 완료
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
