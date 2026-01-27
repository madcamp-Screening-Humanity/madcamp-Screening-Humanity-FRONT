"use client"

import { useState, useEffect, useCallback } from "react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { characterApi, voiceApi } from "@/lib/api/client"
import type { AdminCharacterListItem } from "@/lib/api/types"
import type { VoiceDetail } from "@/lib/api/types"
import { toast } from "sonner"
import { Loader2, Link2, RefreshCw } from "lucide-react"

/**
 * 관리자: 캐릭터–Voice 연결·교체·해제 전용 패널.
 * DB 캐릭터 + Preset 캐릭터 모두 대상. 행별 Voice 선택 후 적용.
 */
export function CharacterVoiceManagePanel() {
    const [characters, setCharacters] = useState<AdminCharacterListItem[]>([])
    const [voices, setVoices] = useState<VoiceDetail[]>([])
    const [loading, setLoading] = useState(true)
    /** characterId -> 선택값 (voice id 또는 "__none__") */
    const [selections, setSelections] = useState<Record<string, string>>({})
    const [applyingId, setApplyingId] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [cr, vr] = await Promise.all([
                characterApi.listAdminCharacters(),
                voiceApi.listVoices(false),
            ])
            const list = cr.success && cr.data ? cr.data.characters : []
            const vlist = vr.success && vr.data ? vr.data.voices : []
            setCharacters(list)
            setVoices(vlist)
            setSelections((prev) => {
                const next = { ...prev }
                list.forEach((c) => {
                    next[c.id] = c.voice_id || "__none__"
                })
                return next
            })
        } catch (e) {
            console.error(e)
            toast.error("목록을 불러오는데 실패했습니다.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const apply = async (c: AdminCharacterListItem) => {
        const raw = selections[c.id] ?? "__none__"
        const voiceId = raw === "__none__" ? null : raw
        setApplyingId(c.id)
        try {
            const res = await characterApi.updateCharacterVoice(c.id, voiceId)
            if (res.success) {
                toast.success(`적용: ${c.name} → ${voiceId ? "Voice 연결" : "연결 해제"}`)
                await load()
            } else {
                toast.error(res.error?.message || "적용 실패")
            }
        } catch {
            toast.error("적용 중 오류가 발생했습니다.")
        } finally {
            setApplyingId(null)
        }
    }

    const currentVoiceName = (c: AdminCharacterListItem) => {
        if (!c.voice_id) return "없음"
        const v = voices.find((x) => x.id === c.voice_id)
        return v?.name ?? c.voice_id
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">목록을 불러오는 중...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5" />
                            캐릭터–Voice 연결
                        </CardTitle>
                        <CardDescription>
                            DB 캐릭터와 사전설정 캐릭터에 Voice를 연결·교체·해제합니다.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        새로고침
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>캐릭터 이름</TableHead>
                            <TableHead>소유</TableHead>
                            <TableHead>현재 Voice</TableHead>
                            <TableHead>Voice 선택</TableHead>
                            <TableHead className="w-[100px]">적용</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {characters.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        캐릭터가 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                characters.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {c.is_preset ? "Preset" : (c.user_id ?? "—")}
                                        </TableCell>
                                        <TableCell>{currentVoiceName(c)}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={selections[c.id] ?? "__none__"}
                                                onValueChange={(v) =>
                                                    setSelections((p) => ({ ...p, [c.id]: v }))
                                                }
                                            >
                                                <SelectTrigger className="w-[200px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">
                                                        없음 (연결 해제)
                                                    </SelectItem>
                                                    {voices.map((v) => (
                                                        <SelectItem key={v.id} value={v.id}>
                                                            {v.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                onClick={() => apply(c)}
                                                disabled={applyingId === c.id}
                                            >
                                                {applyingId === c.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    "적용"
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
