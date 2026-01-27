"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { voiceApi, characterApi, modelMakeApi } from "@/lib/api/client"
import type {
    Character,
    CreateCharacterRequest,
    UpdateCharacterRequest,
    VoiceLinkOption,
    ModelMakeMyVoice,
} from "@/lib/api/types"
import { Plus, Pencil, Trash2, ArrowLeft, User, UserPlus, Upload, Loader2 } from "lucide-react"
import { CharacterCreationWizard } from "@/components/character-creation-wizard"

export default function MyVoicesPage() {
    const [authOk, setAuthOk] = useState<boolean | null>(null)

    // 내 캐릭터 페르소나
    const [characters, setCharacters] = useState<Character[]>([])
    const [loadingChars, setLoadingChars] = useState(false)
    const [charForm, setCharForm] = useState<CreateCharacterRequest>({ name: "", persona: "", voice_id: "" })
    const [charModal, setCharModal] = useState<"create" | "edit" | null>(null)
    const [editingChar, setEditingChar] = useState<Character | null>(null)
    const [showCharWizard, setShowCharWizard] = useState(false)
    const [hasWizardDirty, setHasWizardDirty] = useState(false)
    const [linkOptions, setLinkOptions] = useState<VoiceLinkOption[]>([])

    // 모델 제작
    const [version, setVersion] = useState("v2Pro")
    const [files, setFiles] = useState<File[]>([])
    const [dragOver, setDragOver] = useState(false)
    const [uploadResult, setUploadResult] = useState<{ train_input_dir: string; first_file: string } | null>(null)
    const [modelName, setModelName] = useState("")
    const [uploading, setUploading] = useState(false)
    const [starting, setStarting] = useState(false)
    const [trainingStatus, setTrainingStatus] = useState<string | null>(null)
    const [trainingProgress, setTrainingProgress] = useState(0)
    const [trainingMessage, setTrainingMessage] = useState("")
    const [tabValue, setTabValue] = useState("characters")
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const hasAutoRegisteredRef = useRef(false)
    const [myVoices, setMyVoices] = useState<ModelMakeMyVoice[]>([])
    const [loadingMy, setLoadingMy] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const loadChars = useCallback(async () => {
        const r = await characterApi.listMyCharacters()
        if (r.success && r.data?.characters) setCharacters(r.data.characters)
    }, [])

    const loadMy = useCallback(async () => {
        const r = await modelMakeApi.my()
        if (r.success && r.data) setMyVoices(r.data.voices || [])
    }, [])

    useEffect(() => {
        (async () => {
            const r = await voiceApi.getVoiceLinkOptions()
            if (!r.success && (r.error?.message?.includes("401") || r.error?.message?.includes("인증"))) {
                setAuthOk(false)
                return
            }
            setAuthOk(true)
            if (r.success && r.data) setLinkOptions(r.data)
        })()
    }, [])

    useEffect(() => {
        if (!authOk) return
        setLoadingChars(true)
        loadChars().finally(() => setLoadingChars(false))
    }, [authOk, loadChars])

    useEffect(() => {
        if (!authOk) return
        voiceApi.getVoiceLinkOptions().then((r) => { if (r.success && r.data) setLinkOptions(r.data) })
    }, [authOk])

    useEffect(() => {
        if (!authOk) return
        setLoadingMy(true)
        loadMy().finally(() => setLoadingMy(false))
    }, [authOk, loadMy])

    // 폴링 정리
    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

    if (authOk === false) {
        return (
            <div className="container py-16 text-center">
                <p className="text-muted-foreground mb-4">로그인이 필요합니다.</p>
                <Link href="/"><Button>홈으로</Button></Link>
            </div>
        )
    }

    const openCharCreate = () => setShowCharWizard(true)
    const openCharEdit = (c: Character) => {
        setEditingChar(c)
        setCharForm({ name: c.name, persona: c.persona || "", voice_id: c.voice_id || "" })
        setCharModal("edit")
    }
    const saveChar = async () => {
        if (!charForm.name) { toast.error("이름은 필수입니다"); return }
        if (editingChar) {
            const r = await characterApi.updateCharacter(editingChar.id, charForm as UpdateCharacterRequest)
            if (r.success) { toast.success("수정되었습니다"); setCharModal(null); setEditingChar(null); loadChars() }
            else toast.error(r.error?.message || "수정 실패")
        }
    }
    const deleteChar = async (id: string) => {
        const r = await characterApi.deleteCharacter(id)
        if (r.success) { toast.success("삭제되었습니다"); loadChars() }
        else toast.error(r.error?.message || "삭제 실패")
    }

    const voiceName = (id: string | null | undefined) => linkOptions.find((o) => o.id === id)?.name || "-"

    // 모델 제작: DnD
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const list = Array.from(e.dataTransfer.files).filter((f) => f.name.toLowerCase().endsWith(".wav"))
        setFiles((prev) => [...prev, ...list])
    }
    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
    const onDragLeave = () => setDragOver(false)

    const onUpload = async () => {
        if (files.length < 3) { toast.error("WAV 파일 3개 이상이 필요합니다"); return }
        setUploading(true)
        setUploadResult(null)
        hasAutoRegisteredRef.current = false
        const r = await modelMakeApi.upload(files)
        setUploading(false)
        if (r.success && r.data) { setUploadResult({ train_input_dir: r.data.train_input_dir, first_file: r.data.first_file }); toast.success("업로드 완료") }
        else toast.error(r.error?.message || "업로드 실패")
    }

    const resetModelMakeState = () => {
        setUploadResult(null)
        setModelName("")
        setFiles([])
        setTrainingStatus(null)
        setTrainingProgress(0)
        setTrainingMessage("")
        hasAutoRegisteredRef.current = false
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const runAutoRegister = useCallback(async () => {
        if (!uploadResult || !modelName.trim()) return
        if (hasAutoRegisteredRef.current) return
        hasAutoRegisteredRef.current = true
        const r = await modelMakeApi.register({
            model_name: modelName.trim(),
            voice_name: "내 음성 (" + modelName.trim() + ")",
            train_input_dir: uploadResult.train_input_dir,
            ref_audio_file: uploadResult.first_file,
        })
        if (r.success) {
            toast.success("Voice가 등록되었습니다")
            setUploadResult(null)
            setModelName("")
            setFiles([])
            setTrainingStatus(null)
            setTrainingProgress(0)
            setTrainingMessage("")
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
            if (fileInputRef.current) fileInputRef.current.value = ""
            loadMy()
            voiceApi.getVoiceLinkOptions().then((x) => { if (x.success && x.data) setLinkOptions(x.data) })
        } else {
            hasAutoRegisteredRef.current = false
            toast.error(r.error?.message || "등록 실패")
        }
    }, [uploadResult, modelName, loadMy])

    const handleCancelAndLeave = async () => {
        if (!uploadResult) return
        if (!confirm("나가시면 업로드한 음성과 학습(중·완료) 모델이 삭제됩니다. 계속할까요?")) return
        const res = await modelMakeApi.abort({ train_input_dir: uploadResult.train_input_dir, model_name: modelName.trim() || undefined })
        if (!res.success) { toast.error(res.error?.message || "취소 처리 실패"); return }
        resetModelMakeState()
        toast.info("취소되었습니다.")
    }

    const handleTabChange = async (v: string) => {
        if (v === tabValue) return
        if (tabValue === "model-make" && v === "characters" && uploadResult) {
            if (!confirm("나가시면 업로드한 음성과 학습(중·완료) 모델이 삭제됩니다. 계속할까요?")) return
            const res = await modelMakeApi.abort({ train_input_dir: uploadResult.train_input_dir, model_name: modelName.trim() || undefined })
            if (!res.success) { toast.error(res.error?.message || "취소 처리 실패"); return }
            resetModelMakeState()
            toast.info("취소되었습니다.")
        }
        setTabValue(v)
    }

    const onStart = async () => {
        if (!uploadResult || !modelName.trim() || !version) { toast.error("업로드 후 모델명과 버전을 입력·선택하세요"); return }
        setStarting(true)
        setTrainingStatus("starting")
        setTrainingProgress(0)
        setTrainingMessage("시작 중...")
        const r = await modelMakeApi.start({ model_name: modelName.trim(), train_input_dir: uploadResult.train_input_dir, version })
        setStarting(false)
        if (!r.success) { setTrainingStatus(null); setTrainingProgress(0); setTrainingMessage(""); toast.error(r.error?.message || "학습 시작 실패"); return }
        setTrainingStatus("processing")
        const poll = () => {
            modelMakeApi.status(modelName.trim()).then((s) => {
                if (!s.success || !s.data) return
                const d = s.data as { status?: string; progress?: number; message?: string }
                const st = d.status || "processing"
                setTrainingStatus(st)
                setTrainingProgress((d.progress ?? 0) * 100)
                setTrainingMessage(d.message ?? "")
                if (st === "completed" || st === "failed") {
                    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
                    if (st === "completed") {
                        toast.info("학습 완료. Voice 등록 중...")
                        runAutoRegister()
                    } else {
                        toast.info("학습 실패")
                    }
                }
            })
        }
        pollRef.current = setInterval(poll, 3000)
    }

    const onDeleteMy = async (voiceId: string) => {
        const r = await modelMakeApi.deleteMy(voiceId)
        if (r.success) { toast.success("삭제되었습니다"); loadMy(); voiceApi.getVoiceLinkOptions().then((x) => { if (x.success && x.data) setLinkOptions(x.data) }) }
        else toast.error(r.error?.message || "삭제 실패")
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
                    <div>
                        <h1 className="text-2xl font-bold">내 음성 관리</h1>
                        <p className="text-muted-foreground text-sm">캐릭터 페르소나와 모델 제작을 관리합니다</p>
                    </div>
                </div>
            </div>

            <Tabs value={tabValue} onValueChange={handleTabChange} className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="characters" className="flex items-center gap-2"><User className="h-4 w-4" />내 캐릭터</TabsTrigger>
                    <TabsTrigger value="model-make" className="flex items-center gap-2">모델 제작</TabsTrigger>
                </TabsList>

                <TabsContent value="characters">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>내 캐릭터 페르소나</CardTitle>
                                <CardDescription>캐릭터를 생성하거나 수정하거나 음성을 연결합니다</CardDescription>
                            </div>
                            <Button onClick={openCharCreate}><Plus className="h-4 w-4 mr-2" />추가</Button>
                        </CardHeader>
                        <CardContent>
                            {loadingChars ? <div className="flex justify-center py-12"><span className="animate-spin">⏳</span></div> : characters.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">캐릭터가 없습니다.</p>
                            ) : (
                                <Table>
                                    <TableHeader><TableRow><TableHead>이름</TableHead><TableHead>페르소나</TableHead><TableHead>연결 음성</TableHead><TableHead className="text-right">작업</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {characters.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium">{c.name}</TableCell>
                                                <TableCell className="max-w-[220px] truncate text-muted-foreground text-sm">{c.persona || "-"}</TableCell>
                                                <TableCell className="text-sm">{voiceName(c.voice_id)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => openCharEdit(c)}><Pencil className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => deleteChar(c.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="model-make">
                    <div className="relative space-y-6">
                        {/* 1. 업로드 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>1. WAV 업로드</CardTitle>
                                <CardDescription>3개 이상 .wav, 한 번에 총 100MB 이하, 각 5초 이상 (서버 검증)</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div
                                    onDrop={onDrop}
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${dragOver ? "border-primary bg-muted/50" : "border-muted-foreground/30"}`}
                                >
                                    <input ref={fileInputRef} type="file" accept=".wav" multiple className="hidden" onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files || [])])} />
                                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">WAV 파일을 끌어오거나 클릭해서 선택 ({files.length}개)</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={onUpload} disabled={uploading || files.length < 3}>
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        업로드
                                    </Button>
                                    {files.length > 0 && <Button variant="outline" onClick={() => { setFiles([]); setUploadResult(null) }}>초기화</Button>}
                                </div>
                                {uploadResult && <p className="text-sm text-muted-foreground">업로드됨: {uploadResult.train_input_dir} (참조: {uploadResult.first_file})</p>}
                            </CardContent>
                        </Card>
                        {/* 2. 학습 시작 & 폴링 & 3. 등록 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>2. 학습 시작 · 3. Voice 자동 등록</CardTitle>
                                <CardDescription>모델명 입력 후 학습을 시작하면, 완료 시 &quot;내 음성 (모델명)&quot;으로 자동 등록됩니다</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <Input placeholder="모델명 (영문 등)" value={modelName} onChange={(e) => setModelName(e.target.value)} className="max-w-[200px]" />
                                    <Select value={version} onValueChange={setVersion}>
                                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="v1">v1</SelectItem>
                                            <SelectItem value="v2">v2</SelectItem>
                                            <SelectItem value="v4">v4</SelectItem>
                                            <SelectItem value="v2Pro">v2Pro</SelectItem>
                                            <SelectItem value="v2ProPlus">v2ProPlus</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={onStart} disabled={starting || !uploadResult || !modelName.trim() || !version}>
                                        {starting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        학습 시작
                                    </Button>
                                    {trainingStatus && trainingStatus !== "starting" && trainingStatus !== "processing" && trainingStatus !== "queued" && trainingStatus !== "training_sovits" && trainingStatus !== "training_gpt" && (
                                        <span className="text-sm text-muted-foreground">상태: {trainingStatus}</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        {/* 내 모델 목록 */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>내 모델 제작 Voice</CardTitle>
                                    <CardDescription>등록한 음성 목록</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => { setLoadingMy(true); loadMy().finally(() => setLoadingMy(false)) }}>새로고침</Button>
                            </CardHeader>
                            <CardContent>
                                {loadingMy ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : myVoices.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">등록된 Voice가 없습니다.</p>
                                ) : (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>이름</TableHead><TableHead>train_input_dir</TableHead><TableHead>training_model_name</TableHead><TableHead className="text-right">작업</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {myVoices.map((v) => (
                                                <TableRow key={v.id}>
                                                    <TableCell className="font-medium">{v.name}</TableCell>
                                                    <TableCell className="max-w-[180px] truncate text-muted-foreground text-sm">{v.train_input_dir || "-"}</TableCell>
                                                    <TableCell className="text-sm">{v.training_model_name || "-"}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => onDeleteMy(v.id)}><Trash2 className="h-4 w-4" /></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {/* 학습 중 로딩 오버레이: Status·로딩바·취소하고 나가기 */}
                        {uploadResult && ["starting", "processing", "queued", "training_sovits", "training_gpt"].includes(trainingStatus || "") && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/95 min-h-[220px]">
                                <Progress value={trainingProgress} className="w-64" />
                                <p className="text-sm text-muted-foreground">Status: {trainingMessage || "—"}</p>
                                <Button variant="outline" onClick={handleCancelAndLeave}>취소하고 나가기</Button>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* 나만의 캐릭터 만들기 */}
            <Dialog open={showCharWizard} onOpenChange={(o) => { if (!o) { if (hasWizardDirty && !window.confirm("저장하지 않고 나가시겠습니까? 입력한 데이터가 사라집니다.")) return; setShowCharWizard(false); } }}>
                <DialogContent className="w-full h-full sm:h-auto sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <UserPlus className="h-6 w-6 text-primary" />
                            나만의 캐릭터 만들기
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">단계별로 캐릭터 정보를 입력하세요</DialogDescription>
                    </DialogHeader>
                    <CharacterCreationWizard
                        onComplete={() => {
                            setShowCharWizard(false)
                            loadChars()
                            voiceApi.getVoiceLinkOptions().then((r) => { if (r.success && r.data) setLinkOptions(r.data) })
                        }}
                        onCancel={() => setShowCharWizard(false)}
                        onDirtyChange={setHasWizardDirty}
                    />
                </DialogContent>
            </Dialog>

            {/* 캐릭터 수정 모달 */}
            <Dialog open={!!charModal} onOpenChange={(o) => { if (!o) { setCharModal(null); setEditingChar(null) } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>캐릭터 수정</DialogTitle><DialogDescription>이름, 페르소나, 연결할 음성을 설정합니다</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>이름 *</Label><Input value={charForm.name} onChange={(e) => setCharForm((f) => ({ ...f, name: e.target.value }))} /></div>
                        <div><Label>페르소나</Label><Textarea value={charForm.persona} onChange={(e) => setCharForm((f) => ({ ...f, persona: e.target.value }))} rows={4} placeholder="성격, 말투, 배경 등" /></div>
                        <div><Label>연결 음성</Label><Select value={charForm.voice_id || "none"} onValueChange={(v) => setCharForm((f) => ({ ...f, voice_id: v === "none" ? "" : v }))}><SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger><SelectContent><SelectItem value="none">없음</SelectItem>{linkOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setCharModal(null)}>취소</Button><Button onClick={saveChar}>저장</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
