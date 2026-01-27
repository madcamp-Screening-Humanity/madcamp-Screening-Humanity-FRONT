"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { voiceApi } from "@/lib/api/client"
import type { VoiceDetail, VoiceCreateRequest, VoiceUpdateRequest, ServerFilesResponse } from "@/lib/api/types"
import { Plus, Pencil, Trash2, Play, Loader2, Volume2, ArrowLeft, RefreshCw, Server, Database, HardDrive } from "lucide-react"
import Link from "next/link"
import { ServerFileManager } from "./file-manager"

/**
 * 관리자 음성 관리 페이지
 * 음성 목록 조회, 생성, 수정, 삭제, 테스트 기능 제공
 * Server A 파일 관리자 기능 통합
 */
export default function VoiceManagerPage() {
    // 음성 목록 상태
    const [voices, setVoices] = useState<VoiceDetail[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Server A 파일 목록 상태
    const [serverFiles, setServerFiles] = useState<ServerFilesResponse | null>(null)
    const [loadingFiles, setLoadingFiles] = useState(false)
    
    // 모달 상태
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedVoice, setSelectedVoice] = useState<VoiceDetail | null>(null)
    
    // 폼 상태
    const [formData, setFormData] = useState<VoiceCreateRequest>({
        name: "",
        description: "",
        language: "ko",
        ref_audio_path: "",
        prompt_text: "",
        prompt_lang: "ko",
        gpt_weights_path: "",
        sovits_weights_path: "",
        model_version: "v2",
        train_voice_folder: "",
        is_default: false,
        is_active: true,
    })
    
    // 테스트 재생 상태
    const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null)
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

    // 음성 목록 로드
    const loadVoices = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await voiceApi.listVoices(false) // 비활성화된 것도 포함
            if (response.success && response.data) {
                setVoices(response.data.voices)
            } else {
                setError(response.error?.message || "음성 목록을 불러오는데 실패했습니다")
            }
        } catch (err) {
            setError("네트워크 오류가 발생했습니다")
        } finally {
            setLoading(false)
        }
    }, [])

    // Server A 파일 목록 로드
    const loadServerFiles = useCallback(async () => {
        try {
            setLoadingFiles(true)
            const response = await voiceApi.getServerFiles()
            if (response.success && response.data) {
                setServerFiles(response.data)
            } else {
                toast.error("Server A 파일 목록을 불러오는데 실패했습니다")
            }
        } catch (err) {
            console.error(err)
            toast.error("Server A 연결 오류")
        } finally {
            setLoadingFiles(false)
        }
    }, [])

    useEffect(() => {
        loadVoices()
        loadServerFiles()
    }, [loadVoices, loadServerFiles])

    // 폼 초기화
    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            language: "ko",
            ref_audio_path: "",
            prompt_text: "",
            prompt_lang: "ko",
            gpt_weights_path: "",
            sovits_weights_path: "",
            model_version: "v2",
            train_voice_folder: "",
            is_default: false,
            is_active: true,
        })
    }

    // 음성 생성
    const handleCreate = async () => {
        if (!formData.name || !formData.ref_audio_path) {
            toast.error("이름과 참조 오디오 경로는 필수입니다")
            return
        }

        try {
            const response = await voiceApi.createVoice(formData)
            if (response.success) {
                toast.success("음성이 생성되었습니다")
                setIsCreateModalOpen(false)
                resetForm()
                loadVoices()
            } else {
                toast.error(response.error?.message || "음성 생성에 실패했습니다")
            }
        } catch (err) {
            toast.error("네트워크 오류가 발생했습니다")
        }
    }

    // 음성 수정
    const handleEdit = async () => {
        if (!selectedVoice) return

        try {
            const updateData: VoiceUpdateRequest = {
                name: formData.name,
                description: formData.description,
                language: formData.language,
                ref_audio_path: formData.ref_audio_path,
                prompt_text: formData.prompt_text,
                prompt_lang: formData.prompt_lang,
                gpt_weights_path: formData.gpt_weights_path || null,
                sovits_weights_path: formData.sovits_weights_path || null,
                model_version: formData.model_version,
                train_voice_folder: formData.train_voice_folder || null,
                is_default: formData.is_default,
                is_active: formData.is_active,
            }

            const response = await voiceApi.updateVoice(selectedVoice.id, updateData)
            if (response.success) {
                toast.success("음성이 수정되었습니다")
                setIsEditModalOpen(false)
                setSelectedVoice(null)
                resetForm()
                loadVoices()
            } else {
                toast.error(response.error?.message || "음성 수정에 실패했습니다")
            }
        } catch (err) {
            toast.error("네트워크 오류가 발생했습니다")
        }
    }

    // 음성 삭제
    const handleDelete = async () => {
        if (!selectedVoice) return

        try {
            const response = await voiceApi.deleteVoice(selectedVoice.id, false)
            if (response.success) {
                toast.success("음성이 비활성화되었습니다")
                setIsDeleteModalOpen(false)
                setSelectedVoice(null)
                loadVoices()
            } else {
                toast.error(response.error?.message || "음성 삭제에 실패했습니다")
            }
        } catch (err) {
            toast.error("네트워크 오류가 발생했습니다")
        }
    }

    // 음성 테스트
    const handleTest = async (voiceId: string) => {
        // 기존 오디오 정지
        if (audioElement) {
            audioElement.pause()
            setAudioElement(null)
        }

        setTestingVoiceId(voiceId)

        try {
            const response = await voiceApi.testVoice(voiceId)
            if (response.success && response.data) {
                const audioUrl = voiceApi.base64ToAudioUrl(response.data.audio_base64, response.data.format)
                const audio = new Audio(audioUrl)
                audio.onended = () => {
                    setTestingVoiceId(null)
                    setAudioElement(null)
                }
                audio.onerror = () => {
                    toast.error("오디오 재생에 실패했습니다")
                    setTestingVoiceId(null)
                    setAudioElement(null)
                }
                setAudioElement(audio)
                audio.play()
            } else {
                toast.error(response.error?.message || "음성 테스트에 실패했습니다")
                setTestingVoiceId(null)
            }
        } catch (err) {
            toast.error("네트워크 오류가 발생했습니다")
            setTestingVoiceId(null)
        }
    }

    // 수정 모달 열기
    const openEditModal = (voice: VoiceDetail) => {
        setSelectedVoice(voice)
        setFormData({
            name: voice.name,
            description: voice.description || "",
            language: voice.language,
            ref_audio_path: voice.ref_audio_path,
            prompt_text: voice.prompt_text || "",
            prompt_lang: voice.prompt_lang,
            gpt_weights_path: voice.gpt_weights_path || "",
            sovits_weights_path: voice.sovits_weights_path || "",
            model_version: voice.model_version || "v2",
            train_voice_folder: voice.train_voice_folder || "",
            is_default: voice.is_default,
            is_active: voice.is_active,
        })
        setIsEditModalOpen(true)
    }

    // 삭제 모달 열기
    const openDeleteModal = (voice: VoiceDetail) => {
        setSelectedVoice(voice)
        setIsDeleteModalOpen(true)
    }

    return (
        <div className="container mx-auto py-8 px-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">음성 관리</h1>
                        <p className="text-muted-foreground">TTS 음성 및 Server A 파일을 관리합니다</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadServerFiles} disabled={loadingFiles}>
                        {loadingFiles ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        서버 파일 갱신
                    </Button>
                </div>
            </div>

            {/* 에러 표시 */}
            {error && (
                <Card className="border-destructive mb-6">
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error}</p>
                        <Button variant="outline" className="mt-2" onClick={loadVoices}>
                            다시 시도
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="db" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="db" className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        음성 데이터베이스
                    </TabsTrigger>
                    <TabsTrigger value="files" className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        서버 파일 관리
                    </TabsTrigger>
                </TabsList>

                {/* 음성 데이터베이스 탭 */}
                <TabsContent value="db">
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => { resetForm(); setIsCreateModalOpen(true); }}>
                            <Plus className="h-4 w-4 mr-2" />
                            새 음성 추가
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Volume2 className="h-5 w-5" />
                                등록된 음성 ({voices.length}개)
                            </CardTitle>
                            <CardDescription>
                                캐릭터에 사용할 수 있는 TTS 음성 목록입니다
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : voices.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>등록된 음성이 없습니다</p>
                                    <p className="text-sm">새 음성을 추가하세요</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>이름</TableHead>
                                            <TableHead>언어</TableHead>
                                            <TableHead>참조 오디오</TableHead>
                                            <TableHead>모델</TableHead>
                                            <TableHead>상태</TableHead>
                                            <TableHead className="text-right">작업</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {voices.map((voice) => (
                                            <TableRow key={voice.id}>
                                                <TableCell className="font-medium">
                                                    {voice.name}
                                                    {voice.is_default && (
                                                        <Badge variant="secondary" className="ml-2">기본</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>{voice.language}</TableCell>
                                                <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                                                    {voice.ref_audio_path}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {voice.model_version} 
                                                    {voice.gpt_weights_path ? " (Fine-tuned)" : ""}
                                                </TableCell>
                                                <TableCell>
                                                    {voice.is_active ? (
                                                        <Badge variant="default">활성</Badge>
                                                    ) : (
                                                        <Badge variant="outline">비활성</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleTest(voice.id)}
                                                            disabled={testingVoiceId === voice.id}
                                                        >
                                                            {testingVoiceId === voice.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Play className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditModal(voice)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openDeleteModal(voice)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 서버 파일 관리 탭 */}
                <TabsContent value="files">
                    <ServerFileManager serverFiles={serverFiles} refreshFiles={loadServerFiles} />
                </TabsContent>
            </Tabs>

            {/* 생성 모달 */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>새 음성 추가</DialogTitle>
                        <DialogDescription>
                            GPT-SoVITS에서 사용할 새 음성을 등록합니다
                        </DialogDescription>
                    </DialogHeader>
                    <VoiceForm formData={formData} setFormData={setFormData} serverFiles={serverFiles} />
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            취소
                        </Button>
                        <Button onClick={handleCreate}>생성</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 수정 모달 */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>음성 수정</DialogTitle>
                        <DialogDescription>
                            음성 정보를 수정합니다
                        </DialogDescription>
                    </DialogHeader>
                    <VoiceForm formData={formData} setFormData={setFormData} serverFiles={serverFiles} />
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            취소
                        </Button>
                        <Button onClick={handleEdit}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 삭제 확인 모달 */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>음성 비활성화</DialogTitle>
                        <DialogDescription>
                            &apos;{selectedVoice?.name}&apos; 음성을 비활성화하시겠습니까?
                            <br />
                            비활성화된 음성은 목록에서 숨겨지지만 데이터는 유지됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            취소
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            비활성화
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

/**
 * 음성 폼 컴포넌트
 */
function VoiceForm({
    formData,
    setFormData,
    serverFiles,
}: {
    formData: VoiceCreateRequest
    setFormData: React.Dispatch<React.SetStateAction<VoiceCreateRequest>>
    serverFiles: ServerFilesResponse | null
}) {
    // 참조 오디오 선택 핸들러
    const handleRefAudioChange = (value: string) => {
        // 직접 입력인 경우 (value가 "custom"이면 무시)
        if (value === "custom") return;
        
        setFormData(prev => ({ ...prev, ref_audio_path: value }));
    };

    return (
        <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="basic">기본 설정</TabsTrigger>
                <TabsTrigger value="model">모델 설정 (고급)</TabsTrigger>
            </TabsList>

            {/* 기본 설정 탭 */}
            <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">이름 *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="예: 차분한 남성"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="language">언어</Label>
                        <Select 
                            value={formData.language} 
                            onValueChange={(value) => setFormData({ ...formData, language: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="언어 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ko">한국어 (Korean)</SelectItem>
                                <SelectItem value="en">영어 (English)</SelectItem>
                                <SelectItem value="ja">일본어 (Japanese)</SelectItem>
                                <SelectItem value="zh">중국어 (Chinese)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="ref_audio_path">참조 오디오 (Server A) *</Label>
                    
                    {serverFiles ? (
                        <div className="flex gap-2">
                            <Select 
                                value={serverFiles.ref_audio.ref_audio.some(f => f.path === formData.ref_audio_path) ? formData.ref_audio_path : "custom"} 
                                onValueChange={handleRefAudioChange}
                            >
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="참조 오디오 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">직접 입력...</SelectItem>
                                    <SelectGroup>
                                        <SelectLabel>서버 파일</SelectLabel>
                                        {serverFiles.ref_audio.ref_audio.map((file) => (
                                            <SelectItem key={file.path} value={file.path}>
                                                {file.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <p className="text-xs text-yellow-500 mb-1">서버 파일 목록을 불러오지 못했습니다. 직접 입력하세요.</p>
                    )}
                    
                    <Input
                        id="ref_audio_path"
                        value={formData.ref_audio_path}
                        onChange={(e) => setFormData({ ...formData, ref_audio_path: e.target.value })}
                        placeholder="/opt/GPT-SoVITS/ref_audio/character_name.wav"
                        className="mt-1"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="prompt_text">참조 오디오 텍스트</Label>
                    <Textarea
                        id="prompt_text"
                        value={formData.prompt_text}
                        onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                        placeholder="참조 오디오에서 말하는 텍스트 (정확도 향상용)"
                        rows={2}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">설명</Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="음성에 대한 설명"
                        rows={2}
                    />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="is_default"
                            checked={formData.is_default}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                        />
                        <Label htmlFor="is_default">기본 음성으로 설정</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active">활성화</Label>
                    </div>
                </div>
            </TabsContent>

            {/* 모델 설정 탭 */}
            <TabsContent value="model" className="space-y-4">
                <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                    <h3 className="font-medium flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        파인튜닝 모델 설정
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        특정 캐릭터를 위해 파인튜닝된 모델이 있다면 경로를 선택하세요.
                        설정하지 않으면 기본 모델을 사용합니다.
                    </p>
                    
                    <div className="space-y-2">
                        <Label htmlFor="gpt_weights_path">GPT 모델 가중치 (.ckpt)</Label>
                        {serverFiles ? (
                            <Select 
                                value={formData.gpt_weights_path || "none"}
                                onValueChange={(value) => setFormData({ ...formData, gpt_weights_path: value === "none" ? undefined : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="GPT 모델 선택 (선택사항)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">사용 안 함 (기본 모델 사용)</SelectItem>
                                    {Object.entries(serverFiles.models.gpt).map(([version, files]) => (
                                        <SelectGroup key={version}>
                                            <SelectLabel>{version}</SelectLabel>
                                            {files.map((file) => (
                                                <SelectItem key={file.path} value={file.path}>
                                                    {file.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input 
                                placeholder="서버 파일 로딩 실패. 경로 직접 입력..."
                                value={formData.gpt_weights_path || ""}
                                onChange={(e) => setFormData({...formData, gpt_weights_path: e.target.value})}
                            />
                        )}
                        <p className="text-xs text-muted-foreground break-all">{formData.gpt_weights_path}</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sovits_weights_path">SoVITS 모델 가중치 (.pth)</Label>
                        {serverFiles ? (
                            <Select 
                                value={formData.sovits_weights_path || "none"}
                                onValueChange={(value) => setFormData({ ...formData, sovits_weights_path: value === "none" ? undefined : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="SoVITS 모델 선택 (선택사항)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">사용 안 함 (기본 모델 사용)</SelectItem>
                                    {Object.entries(serverFiles.models.sovits).map(([version, files]) => (
                                        <SelectGroup key={version}>
                                            <SelectLabel>{version}</SelectLabel>
                                            {files.map((file) => (
                                                <SelectItem key={file.path} value={file.path}>
                                                    {file.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input 
                                placeholder="서버 파일 로딩 실패. 경로 직접 입력..."
                                value={formData.sovits_weights_path || ""}
                                onChange={(e) => setFormData({...formData, sovits_weights_path: e.target.value})}
                            />
                        )}
                        <p className="text-xs text-muted-foreground break-all">{formData.sovits_weights_path}</p>
                    </div>
                </div>

                <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                    <h3 className="font-medium">기타 설정</h3>
                    
                    <div className="space-y-2">
                        <Label htmlFor="train_voice_folder">훈련 음성 폴더 (sample_train_voice)</Label>
                        {serverFiles?.train_voices?.voices ? (
                            <Select 
                                value={formData.train_voice_folder || "none"}
                                onValueChange={(value) => setFormData({ ...formData, train_voice_folder: value === "none" ? undefined : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="훈련 폴더 연결 (선택사항)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">연결 안 함</SelectItem>
                                    {serverFiles.train_voices.voices.map((voice) => (
                                        <SelectItem key={voice.character_name} value={voice.character_name}>
                                            {voice.character_name} ({voice.file_count}개 파일)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                             <Input 
                                placeholder="직접 입력..."
                                value={formData.train_voice_folder || ""}
                                onChange={(e) => setFormData({...formData, train_voice_folder: e.target.value})}
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="model_version">모델 버전</Label>
                         <Select 
                            value={formData.model_version} 
                            onValueChange={(value) => setFormData({ ...formData, model_version: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="모델 버전 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="v1">v1</SelectItem>
                                <SelectItem value="v2">v2 (권장)</SelectItem>
                                <SelectItem value="v2Pro">v2Pro</SelectItem>
                                <SelectItem value="v2ProPlus">v2ProPlus</SelectItem>
                                <SelectItem value="v3">v3</SelectItem>
                                <SelectItem value="v4">v4</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    )
}
