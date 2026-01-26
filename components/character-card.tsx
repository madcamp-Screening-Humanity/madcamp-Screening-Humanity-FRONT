"use client"

import { Character } from "@/lib/store"
import { useState } from "react"
import { ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react"
import { IMAGE_FALLBACK } from "@/lib/config/character"

interface CharacterCardProps {
  character: Character
  isSelected?: boolean
  onClick?: () => void
  onEdit?: (character: Character) => void
  onDelete?: (characterId: string) => void
  showSampleDialogue?: boolean
}

export function CharacterCard({
  character,
  isSelected = false,
  onClick,
  onEdit,
  onDelete,
  showSampleDialogue = true,
}: CharacterCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const imageUrl = character.image_url || IMAGE_FALLBACK.CHARACTER_PLACEHOLDER
  const tags = character.tags || []

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${character.name} 캐릭터 선택`}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={`
        relative flex flex-col rounded-xl border-2 transition-all cursor-pointer group
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${isSelected
          ? "border-primary bg-primary/10 scale-102 shadow-lg"
          : "border-border bg-secondary/30 hover:border-muted-foreground hover:bg-secondary/50"
        }
      `}
    >
      {/* 액션 버튼 (수정/삭제) */}
      {!character.is_preset && (onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(character)
              }}
              className="p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground shadow-sm"
              title="수정"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(character.id)
              }}
              className="p-1.5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-destructive shadow-sm"
              title="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 이미지 */}
      <div className="relative w-full aspect-square overflow-hidden rounded-t-xl">
        <img
          src={imageUrl}
          alt={`${character.name} 캐릭터 이미지`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            // 이미지 로드 실패 시 fallback 체인 적용
            const target = e.target as HTMLImageElement
            const currentSrc = target.src

            // 1단계: 카테고리별 placeholder 시도
            if (character.category && IMAGE_FALLBACK.CATEGORY_PLACEHOLDERS[character.category as keyof typeof IMAGE_FALLBACK.CATEGORY_PLACEHOLDERS]) {
              const categoryPlaceholder = IMAGE_FALLBACK.CATEGORY_PLACEHOLDERS[character.category as keyof typeof IMAGE_FALLBACK.CATEGORY_PLACEHOLDERS]
              if (currentSrc !== categoryPlaceholder) {
                target.src = categoryPlaceholder
                return
              }
            }

            // 2단계: 기본 placeholder
            if (currentSrc !== IMAGE_FALLBACK.CHARACTER_PLACEHOLDER) {
              target.src = IMAGE_FALLBACK.CHARACTER_PLACEHOLDER
            }
          }}
        />
        {isSelected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xl">✓</span>
            </div>
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="p-4 space-y-2">
        {/* 이름 */}
        <h3 className="font-semibold text-foreground text-base line-clamp-1">
          {character.name}
        </h3>

        {/* 설명 */}
        {character.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {character.description}
          </p>
        )}

        {/* 태그 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 샘플 대화 (확장 가능) */}
        {showSampleDialogue && character.sample_dialogue && (
          <div className="pt-2 border-t border-border">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "샘플 대화 접기" : "샘플 대화 펼치기"}
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              <span>샘플 대화</span>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {isExpanded && (
              <p className="mt-2 text-sm text-foreground italic">
                "{character.sample_dialogue}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
