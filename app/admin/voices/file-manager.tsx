"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
    Accordion, 
    AccordionContent, 
    AccordionItem, 
    AccordionTrigger 
} from "@/components/ui/accordion"
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { voiceApi } from "@/lib/api/client"
import type { ServerFilesResponse, FileInfo, VoiceDetail } from "@/lib/api/types"
import { toast } from "sonner"
import { 
    Loader2, 
    Trash2, 
    FolderPlus, 
    FileAudio, 
    FileCode, 
    HardDrive, 
    AlertTriangle,
    Database,
    Upload,
} from "lucide-react"

interface ServerFileManagerProps {
    serverFiles: ServerFilesResponse | null;
    refreshFiles: () => Promise<void>;
    /** Voice 생성 성공 시 상위에서 loadVoices 등 재호출 */
    onVoiceCreated?: () => void;
    /** 배지용: DB에 등록된 Voice 목록 (DB에 등록 / 등록되지 않음=학습 안됨) */
    voices?: VoiceDetail[];
}

export function ServerFileManager({ serverFiles, refreshFiles, onVoiceCreated, voices = [] }: ServerFileManagerProps) {
    // 훈련 데이터 업로드 (train_voice 전용, 오디오만)
    const [uploadSubPathSelect, setUploadSubPathSelect] = useState("");
    const [uploadSubPathNew, setUploadSubPathNew] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // DB 관리: 기존 디스크 파일 → Voice 연결
    const [dbTrainFolder, setDbTrainFolder] = useState("");
    const [dbModelSource, setDbModelSource] = useState<"logs" | "manual">("logs");
    const [dbLogsModel, setDbLogsModel] = useState("");
    const [dbGptPath, setDbGptPath] = useState("");
    const [dbSovitsPath, setDbSovitsPath] = useState("");
    const [dbVoiceName, setDbVoiceName] = useState("");
    const [dbRegistering, setDbRegistering] = useState(false);

    // 폴더 생성
    const [newFolderName, setNewFolderName] = useState("");
    const [isMkdirOpen, setIsMkdirOpen] = useState(false);
    const [creatingFolder, setCreatingFolder] = useState(false);

    // 삭제
    const [itemToDelete, setItemToDelete] = useState<{ path: string, name: string, isFolder?: boolean } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // 훈련 데이터 업로드 (오디오만)
    const handleTrainVoiceUpload = async () => {
        const subPath = uploadSubPathNew.trim() || uploadSubPathSelect;
        if (!subPath) {
            toast.error("훈련 폴더를 선택하거나 새 폴더명을 입력하세요.");
            return;
        }
        if (!uploadFile) {
            toast.error("오디오 파일을 선택하세요.");
            return;
        }
        try {
            setUploading(true);
            const res = await voiceApi.uploadTrainVoiceFile(uploadFile, subPath);
            if (res.success) {
                toast.success(`업로드 완료: ${res.data?.filename}`);
                setUploadFile(null);
                const el = document.getElementById("train-voice-upload-input") as HTMLInputElement;
                if (el) el.value = "";
                await refreshFiles();
            } else {
                toast.error(res.error?.message || "업로드 실패");
            }
        } catch {
            toast.error("업로드 중 오류가 발생했습니다.");
        } finally {
            setUploading(false);
        }
    };

    // 폴더 생성 핸들러
    const handleMkdir = async () => {
        if (!newFolderName) return;

        try {
            setCreatingFolder(true);
            const response = await voiceApi.createServerFolder(newFolderName);
            if (response.success) {
                toast.success(`폴더 생성 완료: ${newFolderName}`);
                setIsMkdirOpen(false);
                setNewFolderName("");
                await refreshFiles();
            } else {
                toast.error(response.error?.message || "폴더 생성 실패");
            }
        } catch (error) {
            toast.error("오류 발생");
        } finally {
            setCreatingFolder(false);
        }
    };

    // 삭제 핸들러
    const handleDelete = async () => {
        if (!itemToDelete) return;

        try {
            setDeleting(true);
            const response = await voiceApi.deleteServerFile(itemToDelete.path);
            if (response.success) {
                toast.success("삭제되었습니다");
                setItemToDelete(null);
                await refreshFiles();
            } else {
                toast.error(response.error?.message || "삭제 실패");
            }
        } catch (error) {
            toast.error("삭제 중 오류 발생");
        } finally {
            setDeleting(false);
        }
    };

    // DB 관리: 기존 훈련폴더+모델 → createVoice
    const handleDbRegister = async () => {
        if (!dbTrainFolder || !dbVoiceName.trim()) {
            toast.error("훈련 폴더와 음성 이름은 필수입니다.");
            return;
        }
        const voice = serverFiles!.train_voices.voices.find((v) => v.path === dbTrainFolder);
        if (!voice) {
            toast.error("선택한 훈련 폴더를 찾을 수 없습니다.");
            return;
        }
        const files = voice.files && voice.files.length > 0 ? voice.files : [];
        const chosen = files.length ? files.reduce((a, b) => (a.size_bytes >= b.size_bytes ? a : b)) : null;
        if (!chosen) {
            toast.error("해당 폴더에 참조 오디오(파일)가 없습니다.");
            return;
        }
        const ref_audio_path = voice.path + "/" + chosen.name;
        const train_voice_folder = voice.character_name;
        const base = serverFiles!.train_voices.base_path;
        const train_input_dir =
            base && voice.path.startsWith(base) ? voice.path.slice(base.length).replace(/^[/\\]/, "") : undefined;

        let gpt: string | undefined;
        let sovits: string | undefined;
        if (dbModelSource === "logs") {
            const logModel = serverFiles!.logs?.models?.find((m) => m.model_name === dbLogsModel);
            gpt = logModel?.gpt_path ?? undefined;
            sovits = logModel?.sovits_path ?? undefined;
        } else {
            gpt = dbGptPath || undefined;
            sovits = dbSovitsPath || undefined;
        }
        if (!gpt && !sovits) {
            toast.error("모델 1쌍을 지정하세요. (logs에서 선택 또는 GPT·SoVITS 수동 선택)");
            return;
        }

        try {
            setDbRegistering(true);
            const res = await voiceApi.createVoice({
                name: dbVoiceName.trim(),
                ref_audio_path,
                gpt_weights_path: gpt,
                sovits_weights_path: sovits,
                train_voice_folder,
                train_input_dir,
                language: "ko",
                prompt_text: "",
                prompt_lang: "ko",
                is_default: false,
                is_active: true,
            });
            if (res.success) {
                toast.success("Voice가 DB에 등록되었습니다.");
                await refreshFiles();
                onVoiceCreated?.();
            } else {
                toast.error(res.error?.message || "Voice 등록 실패");
            }
        } catch {
            toast.error("Voice 등록 중 오류가 발생했습니다.");
        } finally {
            setDbRegistering(false);
        }
    };

    // 수동용: gpt/sovits 전체 파일 목록 (version/name 표시)
    const allGptFiles = serverFiles
        ? Object.entries(serverFiles.models.gpt).flatMap(([ver, arr]) =>
            arr.map((f) => ({ ...f, version: ver })))
        : [];
    const allSovitsFiles = serverFiles
        ? Object.entries(serverFiles.models.sovits).flatMap(([ver, arr]) =>
            arr.map((f) => ({ ...f, version: ver })))
        : [];

    const basePath = serverFiles?.train_voices?.base_path ?? "";
    /** 훈련 폴더가 DB Voice와 연결돼 있는지: ref_audio_path prefix 또는 train_input_dir로 일치 */
    const isLinkedTrain = (voicePath: string) =>
        voices.some(
            (v) =>
                (v.ref_audio_path && (v.ref_audio_path.startsWith(voicePath + "/") || v.ref_audio_path === voicePath)) ||
                (!!v.train_input_dir && !!basePath && `${basePath.replace(/\/$/, "")}/${v.train_input_dir}` === voicePath)
        );
    const isLinkedGpt = (filePath: string) => voices.some((v) => v.gpt_weights_path === filePath);
    const isLinkedSovits = (filePath: string) => voices.some((v) => v.sovits_weights_path === filePath);

    if (!serverFiles) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>파일 목록을 불러오고 있습니다...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 훈련 데이터 업로드 (train_voice 전용, 오디오만) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        훈련 데이터 업로드
                    </CardTitle>
                    <CardDescription>
                        훈련 폴더에 wav, mp3, flac, ogg 오디오만 업로드합니다. (등록되지 않음=학습 안됨)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>훈련 폴더 (기존 선택 또는 새 이름)</Label>
                        <Select value={uploadSubPathSelect} onValueChange={setUploadSubPathSelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="기존 폴더 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {serverFiles.train_voices.voices.length === 0 ? (
                                    <SelectItem value="_none" disabled>폴더 없음</SelectItem>
                                ) : (
                                    serverFiles.train_voices.voices.map((v) => (
                                        <SelectItem key={v.path} value={v.character_name}>
                                            {v.character_name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="새 폴더명 (기존 선택 시 무시)"
                            value={uploadSubPathNew}
                            onChange={(e) => setUploadSubPathNew(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>오디오 파일</Label>
                        <Input
                            id="train-voice-upload-input"
                            type="file"
                            accept=".wav,.mp3,.flac,.ogg"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                    </div>
                    <Button onClick={handleTrainVoiceUpload} disabled={!uploadFile || uploading}>
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        업로드
                    </Button>
                </CardContent>
            </Card>

            {/* DB 관리: 기존 디스크 파일 → Voice 연결 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        DB 관리
                    </CardTitle>
                    <CardDescription>
                        훈련 폴더와 모델(gpt/sovits)을 선택해 Voice로 등록합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>훈련 폴더 (필수)</Label>
                        <Select value={dbTrainFolder} onValueChange={setDbTrainFolder}>
                            <SelectTrigger>
                                <SelectValue placeholder="훈련 데이터 폴더 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {serverFiles.train_voices.voices.length === 0 ? (
                                    <SelectItem value="_none" disabled>폴더 없음</SelectItem>
                                ) : (
                                    serverFiles.train_voices.voices.map((v) => (
                                        <SelectItem key={v.path} value={v.path}>
                                            {v.character_name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>모델 1쌍 (둘 중 하나)</Label>
                        <Select value={dbModelSource} onValueChange={(v: "logs" | "manual") => setDbModelSource(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="logs">logs에서 1쌍 선택</SelectItem>
                                <SelectItem value="manual">GPT·SoVITS 수동 선택</SelectItem>
                            </SelectContent>
                        </Select>
                        {dbModelSource === "logs" && (
                            <Select value={dbLogsModel} onValueChange={setDbLogsModel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="모델명 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(serverFiles.logs?.models ?? []).length === 0 ? (
                                        <SelectItem value="_none" disabled>logs 모델 없음</SelectItem>
                                    ) : (
                                        serverFiles.logs!.models!.map((m) => (
                                            <SelectItem key={m.model_name} value={m.model_name}>
                                                {m.model_name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                        {dbModelSource === "manual" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">GPT</Label>
                                    <Select value={dbGptPath} onValueChange={setDbGptPath}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="GPT 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allGptFiles.length === 0 ? (
                                                <SelectItem value="_none" disabled>GPT 없음</SelectItem>
                                            ) : (
                                                allGptFiles.map((f) => (
                                                    <SelectItem key={f.path} value={f.path}>
                                                        {(f as FileInfo & { version: string }).version} / {f.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">SoVITS</Label>
                                    <Select value={dbSovitsPath} onValueChange={setDbSovitsPath}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="SoVITS 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allSovitsFiles.length === 0 ? (
                                                <SelectItem value="_none" disabled>SoVITS 없음</SelectItem>
                                            ) : (
                                                allSovitsFiles.map((f) => (
                                                    <SelectItem key={f.path} value={f.path}>
                                                        {(f as FileInfo & { version: string }).version} / {f.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>음성 이름 (필수)</Label>
                        <Input
                            placeholder="등록할 Voice 이름"
                            value={dbVoiceName}
                            onChange={(e) => setDbVoiceName(e.target.value)}
                        />
                    </div>

                    <Button onClick={handleDbRegister} disabled={dbRegistering}>
                        {dbRegistering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Voice로 등록
                    </Button>
                </CardContent>
            </Card>

            {/* 파일 탐색기 섹션 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5" />
                        파일 탐색기
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="train_voice">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="train_voice">훈련 데이터</TabsTrigger>
                            <TabsTrigger value="models">모델 파일</TabsTrigger>
                        </TabsList>

                        {/* 훈련 데이터 탭 */}
                        <TabsContent value="train_voice" className="space-y-4">
                            <div className="flex justify-end mb-2">
                                <Dialog open={isMkdirOpen} onOpenChange={setIsMkdirOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <FolderPlus className="h-4 w-4 mr-2" />
                                            새 캐릭터 폴더
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>새 폴더 생성</DialogTitle>
                                            <DialogDescription>
                                                sample_train_voice 내부에 새 캐릭터용 폴더를 생성합니다.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <Input 
                                            placeholder="폴더명 (영문 소문자 권장)" 
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                        />
                                        <DialogFooter>
                                            <Button onClick={handleMkdir} disabled={!newFolderName || creatingFolder}>
                                                {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : "생성"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <ScrollArea className="h-[400px] border rounded-md p-4">
                                <Accordion type="single" collapsible className="w-full">
                                    {serverFiles.train_voices.voices.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-8">폴더가 없습니다</div>
                                    ) : serverFiles.train_voices.voices.map((voice) => (
                                        <AccordionItem key={voice.path} value={voice.path}>
                                            <AccordionTrigger className="hover:no-underline px-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{voice.file_count} files</Badge>
                                                    <span className="font-medium">{voice.character_name}</span>
                                                    <span className="text-xs text-muted-foreground ml-2">({voice.total_size_mb} MB)</span>
                                                    {isLinkedTrain(voice.path) ? (
                                                        <Badge className="bg-green-600 text-white">(DB에 등록)</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground">(등록되지 않음=학습 안됨)</Badge>
                                                    )}
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-2 bg-muted/20 rounded-md">
                                                <div className="flex justify-between items-center mb-2 px-2">
                                                    <span className="text-xs text-muted-foreground">{voice.path}</span>
                                                    <Button 
                                                        variant="destructive" 
                                                        size="sm" 
                                                        className="h-7 text-xs"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // 아코디언 토글 방지
                                                            setItemToDelete({ path: voice.path, name: voice.character_name, isFolder: true });
                                                        }}
                                                    >
                                                        폴더 삭제
                                                    </Button>
                                                </div>
                                                {/* 파일 리스트는 너무 길어질 수 있으므로 요약 정보만 보여주거나, API 응답 구조에 따라 렌더링 */}
                                                {/* 현재 API는 files 배열을 반환하지 않음 (list_train_voices 수정 필요했었나? 아까 수정 코드에는 files 포함됨) */}
                                                {/* file_scanner_api.py 수정본에는 files 포함됨. types.ts에는 files가 빠져있음. any로 처리하거나 타입 수정 필요 */}
                                                {/* 타입 캐스팅으로 처리 */}
                                                <div className="space-y-1">
                                                    {voice.files?.map((f) => (
                                                        <div key={f.name} className="flex items-center gap-2 text-sm pl-4 py-1 border-l-2 ml-1">
                                                            <FileAudio className="h-3 w-3 text-muted-foreground" />
                                                            <span>{f.name}</span>
                                                            <span className="text-xs text-muted-foreground">({f.size_mb ?? (f.size_bytes / (1024 * 1024)).toFixed(2)} MB)</span>
                                                        </div>
                                                    ))}
                                                    {(!voice.files || voice.files.length === 0) && (
                                                        <div className="text-sm text-muted-foreground pl-4">파일 없음</div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </ScrollArea>
                        </TabsContent>

                        {/* 모델 파일 탭 */}
                        <TabsContent value="models" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 h-[400px]">
                                {/* GPT Models */}
                                <div className="border rounded-md p-4 flex flex-col">
                                    <h3 className="font-medium mb-2 flex items-center gap-2">
                                        <FileCode className="h-4 w-4" />
                                        GPT Models
                                    </h3>
                                    <ScrollArea className="flex-1">
                                        <Accordion type="multiple" className="w-full">
                                            {Object.entries(serverFiles.models.gpt).map(([version, files]) => (
                                                <AccordionItem key={version} value={version}>
                                                     <AccordionTrigger className="py-2 text-sm">
                                                        {version} ({files.length})
                                                     </AccordionTrigger>
                                                     <AccordionContent>
                                                        {files.map(file => (
                                                            <div key={file.path} className="flex justify-between items-center py-1 px-2 hover:bg-muted rounded text-xs group">
                                                                <span className="truncate max-w-[150px]" title={file.name}>{file.name}</span>
                                                                <div className="flex items-center gap-1">
                                                                    {isLinkedGpt(file.path) ? (
                                                                        <Badge className="bg-green-600 text-white text-[10px]">(DB에 등록)</Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">(등록되지 않음=학습 안됨)</Badge>
                                                                    )}
                                                                    <span className="text-muted-foreground">{file.size_mb}MB</span>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                                                                        onClick={() => setItemToDelete({ path: file.path, name: file.name })}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                     </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </ScrollArea>
                                </div>

                                {/* SoVITS Models */}
                                <div className="border rounded-md p-4 flex flex-col">
                                    <h3 className="font-medium mb-2 flex items-center gap-2">
                                        <FileCode className="h-4 w-4" />
                                        SoVITS Models
                                    </h3>
                                    <ScrollArea className="flex-1">
                                        <Accordion type="multiple" className="w-full">
                                            {Object.entries(serverFiles.models.sovits).map(([version, files]) => (
                                                <AccordionItem key={version} value={version}>
                                                     <AccordionTrigger className="py-2 text-sm">
                                                        {version} ({files.length})
                                                     </AccordionTrigger>
                                                     <AccordionContent>
                                                        {files.map(file => (
                                                            <div key={file.path} className="flex justify-between items-center py-1 px-2 hover:bg-muted rounded text-xs group">
                                                                <span className="truncate max-w-[150px]" title={file.name}>{file.name}</span>
                                                                <div className="flex items-center gap-1">
                                                                    {isLinkedSovits(file.path) ? (
                                                                        <Badge className="bg-green-600 text-white text-[10px]">(DB에 등록)</Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">(등록되지 않음=학습 안됨)</Badge>
                                                                    )}
                                                                    <span className="text-muted-foreground">{file.size_mb}MB</span>
                                                                     <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                                                                        onClick={() => setItemToDelete({ path: file.path, name: file.name })}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                     </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </ScrollArea>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* 삭제 확인 모달 */}
            <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            삭제 확인
                        </DialogTitle>
                        <DialogDescription>
                            정말로 <strong>{itemToDelete?.name}</strong> {itemToDelete?.isFolder ? "폴더와 내부 파일을 모두" : "파일을"} 삭제하시겠습니까?
                            <br />
                            <span className="text-destructive font-bold mt-2 block">이 작업은 복구할 수 없습니다.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded break-all">
                        경로: {itemToDelete?.path}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemToDelete(null)}>
                            취소
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "영구 삭제"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
