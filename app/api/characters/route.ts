import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Character } from '@/lib/api/types';

export async function GET() {
  try {
    const charactersDirectory = path.join(process.cwd(), 'public/characters');
    
    // 디렉토리 존재 확인
    try {
        await fs.promises.access(charactersDirectory);
    } catch {
        // 디렉토리가 없으면 빈 배열 반환
        return NextResponse.json({ characters: [] });
    }

    const fileNames = await fs.promises.readdir(charactersDirectory);
    
    const characterPromises = fileNames
      .filter(fileName => fileName.endsWith('.json'))
      .map(async (fileName) => {
        try {
            const fullPath = path.join(charactersDirectory, fileName);
            const stats = await fs.promises.stat(fullPath);
            if (!stats.isFile()) return null;

            const fileContents = await fs.promises.readFile(fullPath, 'utf8');
            const character = JSON.parse(fileContents);
            return character;
        } catch (e) {
            console.error(`Error loading character ${fileName}:`, e);
            return null;
        }
      });

    const results = await Promise.all(characterPromises);
    const characters = results.filter((char): char is Character => char !== null);

    // 프리셋 우선 정렬 (안전한 정렬 로직)
    characters.sort((a, b) => {
        const aPreset = a.is_preset ?? false;
        const bPreset = b.is_preset ?? false;
        return (aPreset === bPreset) ? 0 : aPreset ? -1 : 1;
    });

    return NextResponse.json({ characters });
  } catch (error) {
    console.error('Critical error in /api/characters:', error);
    // 500 대신 빈 배열이라도 줘서 앱이 안 죽게 할지 고민이지만, 
    // 근본 원인 해결을 위해 에러 로그를 남기고 500 유지
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}
