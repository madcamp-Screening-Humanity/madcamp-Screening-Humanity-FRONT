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
    SelectValue,
    SelectGroup,
    SelectLabel
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
import type { ServerFilesResponse, FileInfo } from "@/lib/api/types"
import { toast } from "sonner"
import { 
    Loader2, 
    Trash2, 
    Upload, 
    FolderPlus, 
    FileAudio, 
    FileCode, 
    HardDrive, 
    AlertTriangle,
    File
} from "lucide-react"

type Category = 'ref_audio' | 'train_voice' | 'gpt_weights' | 'sovits_weights';

interface ServerFileManagerProps {
    serverFiles: ServerFilesResponse | null;
    refreshFiles: () => Promise<void>;
}

export function ServerFileManager({ serverFiles, refreshFiles }: ServerFileManagerProps) {
    const [category, setCategory] = useState<Category>('ref_audio');
    const [file, setFile] = useState<File | null>(null);
    const [subPath, setSubPath] = useState("");
    const [modelVersion, setModelVersion] = useState("v2");
    const [uploading, setUploading] = useState(false);
    
    // 폴더 생성
    const [newFolderName, setNewFolderName] = useState("");
    const [isMkdirOpen, setIsMkdirOpen] = useState(false);
    const [creatingFolder, setCreatingFolder] = useState(false);

    // 삭제
    const [itemToDelete, setItemToDelete] = useState<{ path: string, name: string, isFolder?: boolean } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // 업로드 핸들러
    const handleUpload = async () => {
        if (!file) {
            toast.error("파일을 선택해주세요");
            return;
        }

        if (category === 'train_voice' && !subPath) {
            toast.error("훈련 음성 업로드 시 캐릭터 폴더명(sub_path)은 필수입니다");
            return;
        }

        try {
            setUploading(true);
            const response = await voiceApi.uploadServerFile(file, category, subPath, modelVersion);
            
            if (response.success) {
                toast.success(`업로드 완료: ${response.data?.filename}`);
                setFile(null);
                // 파일 인풋 초기화 (Ref 사용 대신 key 변경 등의 트릭 사용 가능하지만 간단히 상태만)
                const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                
                await refreshFiles();
            } else {
                toast.error(response.error?.message || "업로드 실패");
            }
        } catch (error) {
            toast.error("업로드 중 오류가 발생했습니다");
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
            {/* 업로드 섹션 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        파일 업로드
                    </CardTitle>
                    <CardDescription>
                        Server A로 파일을 직접 전송합니다. 대용량 모델 파일도 지원합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>카테고리</Label>
                            <Select 
                                value={category} 
                                onValueChange={(v: Category) => setCategory(v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ref_audio">참조 오디오 (ref_audio)</SelectItem>
                                    <SelectItem value="train_voice">훈련 데이터 (train_voice)</SelectItem>
                                    <SelectItem value="gpt_weights">GPT 모델 (.ckpt)</SelectItem>
                                    <SelectItem value="sovits_weights">SoVITS 모델 (.pth)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {category === 'train_voice' && (
                            <div className="space-y-2">
                                <Label>캐릭터 폴더명 (필수)</Label>
                                <Select 
                                    value={subPath} 
                                    onValueChange={setSubPath}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="폴더 선택 또는 직접입력" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="p-2">
                                            <Input 
                                                placeholder="새 폴더명 입력..." 
                                                className="mb-2 h-8 text-sm"
                                                onChange={(e) => {
                                                    // 셀렉트가 닫히지 않도록 주의해야 하나, 여기선 Input만 렌더링하도록 커스텀 필요.
                                                    // 간단히 기존 폴더만 선택하게 하고, 새 폴더는 Mkdir 버튼으로 유도하는게 나음.
                                                    // 하지만 여기서는 직접 입력을 지원해야 함.
                                                    setSubPath(e.target.value);
                                                }}
                                                // value 바인딩 대신 셀렉트 내부 Input은 복잡함.
                                                // 따라서 Select 대신 Input + Datalist 느낌으로 가거나
                                                // 콤보박스를 구현해야 함. 여기서는 심플하게 Select로 기존폴더 선택 + Input으로 직접입력 분리.
                                            />
                                        </div>
                                        {serverFiles.train_voices.voices.map(v => (
                                            <SelectItem key={v.character_name} value={v.character_name}>
                                                {v.character_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {/* Select로는 커스텀 입력이 어려우므로 Input으로 변경 */}
                                <div className="text-xs text-muted-foreground mt-1">
                                    * 위 드롭다운 대신 아래에 직접 입력 가능
                                </div>
                                <Input 
                                    placeholder="폴더명 직접 입력 (예: new_char)" 
                                    value={subPath}
                                    onChange={(e) => setSubPath(e.target.value)}
                                />
                            </div>
                        )}

                        {(category === 'gpt_weights' || category === 'sovits_weights') && (
                            <div className="space-y-2">
                                <Label>모델 버전</Label>
                                <Select value={modelVersion} onValueChange={setModelVersion}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="v1">v1</SelectItem>
                                        <SelectItem value="v2">v2 (기본)</SelectItem>
                                        <SelectItem value="v2Pro">v2Pro</SelectItem>
                                        <SelectItem value="v2ProPlus">v2ProPlus</SelectItem>
                                        <SelectItem value="v3">v3</SelectItem>
                                        <SelectItem value="v4">v4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>파일 선택</Label>
                        <Input 
                            id="file-upload-input"
                            type="file" 
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                         {(category === 'gpt_weights' || category === 'sovits_weights') && (
                            <p className="text-xs text-amber-500 mt-1">
                                * 대용량 모델 파일은 업로드에 수 분이 걸릴 수 있습니다. 창을 닫지 마세요.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleUpload} disabled={!file || uploading}>
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    업로드 중...
                                </>
                            ) : (
                                "업로드 시작"
                            )}
                        </Button>
                    </div>
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
                    <Tabs defaultValue="ref_audio">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                            <TabsTrigger value="ref_audio">참조 오디오</TabsTrigger>
                            <TabsTrigger value="train_voice">훈련 데이터</TabsTrigger>
                            <TabsTrigger value="models">모델 파일</TabsTrigger>
                        </TabsList>

                        {/* 참조 오디오 탭 */}
                        <TabsContent value="ref_audio" className="space-y-4">
                            <ScrollArea className="h-[400px] border rounded-md p-4">
                                {serverFiles.ref_audio.ref_audio.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">파일이 없습니다</div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {serverFiles.ref_audio.ref_audio.map((file) => (
                                            <div key={file.path} className="flex items-center justify-between p-2 hover:bg-muted rounded-md border">
                                                <div className="flex items-center gap-3">
                                                    <FileAudio className="h-5 w-5 text-blue-500" />
                                                    <div>
                                                        <div className="font-medium text-sm">{file.name}</div>
                                                        <div className="text-xs text-muted-foreground">{file.size_mb} MB • {new Date(file.modified_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setItemToDelete({ path: file.path, name: file.name })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>

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
                                                    {(voice as any).files?.map((f: any) => (
                                                        <div key={f.name} className="flex items-center gap-2 text-sm pl-4 py-1 border-l-2 ml-1">
                                                            <FileAudio className="h-3 w-3 text-muted-foreground" />
                                                            <span>{f.name}</span>
                                                            <span className="text-xs text-muted-foreground">({f.size_mb} MB)</span>
                                                        </div>
                                                    ))}
                                                    {(! (voice as any).files || (voice as any).files.length === 0) && (
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
