"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { voiceApi } from "@/lib/api/client"
import type { VoiceDetail, ServerFilesResponse } from "@/lib/api/types"
import { EditVoiceDialog } from "./edit-voice-dialog"
import { Edit, Trash2, Loader2, RefreshCw, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface VoiceListPanelProps {
    voices: VoiceDetail[]
    serverFiles: ServerFilesResponse | null
    onRefresh: () => void
}

export function VoiceListPanel({ voices, serverFiles, onRefresh }: VoiceListPanelProps) {
    // Edit Dialog State
    const [selectedVoice, setSelectedVoice] = useState<VoiceDetail | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    // Delete Dialog State
    const [voiceToDelete, setVoiceToDelete] = useState<VoiceDetail | null>(null)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isPermanentDelete, setIsPermanentDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const handleEditClick = (voice: VoiceDetail) => {
        setSelectedVoice(voice)
        setIsEditOpen(true)
    }

    const handleDeleteClick = (voice: VoiceDetail) => {
        setVoiceToDelete(voice)
        setIsPermanentDelete(false) // Reset to soft delete by default
        setIsDeleteOpen(true)
    }

    const confirmDelete = async () => {
        if (!voiceToDelete) return

        try {
            setDeleting(true)
            const res = await voiceApi.deleteVoice(voiceToDelete.id, isPermanentDelete)
            if (res.success) {
                toast.success(isPermanentDelete ? "완전 삭제되었습니다." : "비활성화되었습니다.")
                setIsDeleteOpen(false)
                setVoiceToDelete(null)
                onRefresh()
            } else {
                toast.error(res.error?.message || "삭제 실패")
            }
        } catch (error) {
            toast.error("삭제 중 오류가 발생했습니다.")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>등록된 음성 목록 (DB)</CardTitle>
                            <CardDescription>
                                DB에 등록된 Voice 모델을 관리합니다. (총 {voices.length}개)
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={onRefresh}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            새로고침
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">이름 / ID</TableHead>
                                    <TableHead>경로 정보 (Ref / GPT / SoVITS)</TableHead>
                                    <TableHead className="w-[100px]">상태</TableHead>
                                    <TableHead className="w-[100px] text-right">관리</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {voices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            등록된 음성이 없습니다.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    voices.map((voice) => (
                                        <TableRow key={voice.id}>
                                            <TableCell>
                                                <div className="font-medium">{voice.name}</div>
                                                <div className="text-xs text-muted-foreground font-mono truncate w-[160px]" title={voice.id}>
                                                    {voice.id}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 text-xs font-mono text-muted-foreground">
                                                    <div className="flex gap-2">
                                                        <span className="font-semibold w-10">REF:</span> 
                                                        <span className="truncate max-w-[300px]" title={voice.ref_audio_path}>{voice.ref_audio_path}</span>
                                                    </div>
                                                    {voice.gpt_weights_path && (
                                                        <div className="flex gap-2">
                                                            <span className="font-semibold w-10">GPT:</span>
                                                            <span className="truncate max-w-[300px]" title={voice.gpt_weights_path}>{voice.gpt_weights_path}</span>
                                                        </div>
                                                    )}
                                                    {voice.sovits_weights_path && (
                                                        <div className="flex gap-2">
                                                            <span className="font-semibold w-10">SoVITS:</span>
                                                            <span className="truncate max-w-[300px]" title={voice.sovits_weights_path}>{voice.sovits_weights_path}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {voice.is_active ? (
                                                    <Badge className="bg-green-600">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                                {voice.is_default && (
                                                    <Badge variant="outline" className="ml-1 border-blue-500 text-blue-500">Default</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(voice)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(voice)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            <EditVoiceDialog 
                open={isEditOpen} 
                onOpenChange={setIsEditOpen} 
                voice={selectedVoice} 
                serverFiles={serverFiles}
                onSuccess={onRefresh} 
            />

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            음성 삭제 확인
                        </DialogTitle>
                        <DialogDescription>
                            <strong>&apos;{voiceToDelete?.name}&apos;</strong> 음성을 삭제하시겠습니까?
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="flex items-center space-x-2 border p-4 rounded-md">
                            <Checkbox 
                                id="permanent" 
                                checked={isPermanentDelete} 
                                onCheckedChange={(checked) => setIsPermanentDelete(checked as boolean)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="permanent" className="font-bold text-destructive">
                                    완전 삭제 (Permanent Delete)
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    체크하면 DB에서 완전히 제거됩니다. (체크 해제 시 비활성화만 처리)
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>취소</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "삭제 실행"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
