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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { voiceApi } from "@/lib/api/client"
import type { VoiceDetail, ServerFilesResponse } from "@/lib/api/types"
import { Loader2, ArrowLeft, RefreshCw, HardDrive, BrainCircuit, Activity, Link2 } from "lucide-react"
import Link from "next/link"
import { ServerFileManager } from "./file-manager"
import { TrainingPanel } from "@/components/admin/voice/training-panel"
import { CharacterVoiceManagePanel } from "@/components/admin/voice/character-voice-manage-panel"
import { VoiceListPanel } from "@/components/admin/voice/voice-list-panel"

/**
 * 관리자 음성 관리 페이지
 * DB 관리(훈련 데이터 업로드·Voice 등록·파일 탐색), 모델 학습, 시스템 상태
 */
export default function VoiceManagerPage() {
    // 음성 목록 (ServerFileManager 배지·onVoiceCreated용)
    const [voices, setVoices] = useState<VoiceDetail[]>([])
    const [error, setError] = useState<string | null>(null)

    // Server A 파일 목록 상태
    const [serverFiles, setServerFiles] = useState<ServerFilesResponse | null>(null)
    const [loadingFiles, setLoadingFiles] = useState(false)

    const loadVoices = useCallback(async () => {
        try {
            setError(null)
            const response = await voiceApi.listVoices(false)
            if (response.success && response.data) {
                setVoices(response.data.voices)
            } else {
                setError(response.error?.message || "음성 목록을 불러오는데 실패했습니다")
            }
        } catch (err) {
            setError("네트워크 오류가 발생했습니다")
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

            <Tabs defaultValue="files" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 max-w-[1000px]">
                    <TabsTrigger value="files" className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        음성 DB & 파일
                    </TabsTrigger>
                    <TabsTrigger value="manage" className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        캐릭터 연결
                    </TabsTrigger>
                    <TabsTrigger value="training" className="flex items-center gap-2">
                        <BrainCircuit className="h-4 w-4" />
                        모델 학습
                    </TabsTrigger>
                    <TabsTrigger value="health" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        시스템 상태
                    </TabsTrigger>
                </TabsList>

                {/* DB 및 파일 관리 탭 */}
                <TabsContent value="files" className="space-y-8">
                    {/* 등록된 음성 목록 관리 */}
                    <VoiceListPanel 
                        voices={voices} 
                        serverFiles={serverFiles}
                        onRefresh={() => { loadVoices(); loadServerFiles(); }} 
                    />
                    
                    {/* Server A 파일 탐색 및 등록 */}
                    <ServerFileManager 
                        serverFiles={serverFiles} 
                        refreshFiles={loadServerFiles} 
                        onVoiceCreated={() => { loadVoices(); loadServerFiles(); }} 
                        voices={voices} 
                    />
                </TabsContent>

                {/* 관리 탭: 캐릭터–Voice 연결/교체/해제 */}
                <TabsContent value="manage">
                    <CharacterVoiceManagePanel />
                </TabsContent>

                {/* 모델 학습 탭 */}
                <TabsContent value="training">
                    <TrainingPanel serverFiles={serverFiles} onVoiceCreated={() => { loadVoices(); loadServerFiles(); }} />
                </TabsContent>

                {/* 시스템 상태 탭 */}
                <TabsContent value="health">
                    <SystemStatusPanel />
                </TabsContent>
            </Tabs>
        </div>
    )
}

// 시스템 상태 패널 컴포넌트
function SystemStatusPanel() {
    const [status, setStatus] = useState<import("@/lib/api/types").SystemStatusResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const checkHealth = useCallback(async () => {
        try {
            setLoading(true);
            const response = await import("@/lib/api/client").then(m => m.systemApi.getDetailedHealth());
            // /health/detailed는 { success, timestamp, services }를 최상위로 반환. data 래핑 없음.
            if (response.success && "services" in response) {
                setStatus(response as import("@/lib/api/types").SystemStatusResponse);
            } else if (response.success && response.data && "services" in (response.data as object)) {
                setStatus(response.data as import("@/lib/api/types").SystemStatusResponse);
            }
        } catch (e) {
            console.error(e);
            toast.error("상태 확인 실패");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkHealth();
        // 30초마다 자동 갱신
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, [checkHealth]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            시스템 상태
                        </CardTitle>
                        <CardDescription>
                            연결된 모든 API 서비스의 실시간 상태입니다
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={checkHealth} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        새로고침
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {status ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>서비스</TableHead>
                                    <TableHead>URL</TableHead>
                                    <TableHead>지연시간</TableHead>
                                    <TableHead className="text-right">상태</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(status.services).map(([key, service]) => (
                                    <TableRow key={key}>
                                        <TableCell className="font-medium">
                                            {service.name}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                            {service.url}
                                        </TableCell>
                                        <TableCell>
                                            {service.latency > 0 ? `${service.latency}ms` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={`flex h-2 w-2 rounded-full ${
                                                    service.status === 'online' ? 'bg-green-500' : 
                                                    service.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                                                }`} />
                                                <span className={`text-sm font-medium ${
                                                    service.status === 'online' ? 'text-green-600' : 
                                                    service.status === 'offline' ? 'text-red-600' : 'text-yellow-600'
                                                }`}>
                                                    {service.status.toUpperCase()}
                                                </span>
                                            </div>
                                            {service.message && (
                                                <p className="text-xs text-destructive mt-1">{service.message}</p>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 opacity-50" />
                        <p>상태 정보를 불러오는 중...</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
