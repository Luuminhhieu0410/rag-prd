import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import type { Collection } from '@/types/api.ts';
import { BookOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface CollectionListProps {
  collections: Collection[];
  onEdit: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
}

function formatCardDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function CollectionList({
  collections,
  onEdit,
  onDelete,
}: CollectionListProps) {
  const { i18n, t } = useTranslation();

  return collections.map((item) => (
    <Card key={item.id} className="h-[222px]">
      <CardContent className="flex h-full flex-col justify-between p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-md bg-amber-300 p-3 text-white shadow-sm ring-1 ring-amber-600/30">
            <BookOpen className="size-8" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil />
                {t('home.editTitle')}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(item)}
              >
                <Trash2 />
                {t('home.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Link
          to={`/collection/${item.id}`}
          className="space-y-3 rounded-md  outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h2 className="hover:underline truncate text-2xl leading-tight font-medium">
            {item.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatCardDate(item.updatedAt, i18n.language)} ·{' '}
            {item._count?.documents ?? 0} {t('home.sources')}
          </p>
        </Link>
      </CardContent>
    </Card>
  ));
}
