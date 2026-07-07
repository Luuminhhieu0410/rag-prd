import {AppShell} from '@/layouts/AppShell';
import {Card, CardContent} from '@/components/ui/card.tsx';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import {Button} from '@/components/ui/button.tsx';
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog.tsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {Input} from '@/components/ui/input.tsx';
import {api} from '@/helpers';
import useFetchApi from '@/hooks/api/useFetchApi.ts';
import type {Collection} from '@/types/api.ts';
import {useQueryClient} from '@tanstack/react-query';
import {BookOpen, CirclePlus, MoreVertical, Pencil, Trash2} from 'lucide-react';
import {useState} from 'react';

function formatCardDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN', {dateStyle: 'medium'}).format(new Date(value));
}

export default function HomePage() {
    const queryClient = useQueryClient();
    const {data} = useFetchApi<Collection[]>({url: '/api/collection/', defaultData: []});
    const [editing, setEditing] = useState<Collection | null>(null);
    const [deleting, setDeleting] = useState<Collection | null>(null);
    const [title, setTitle] = useState('');

    async function refreshCollections() {
        await queryClient.invalidateQueries({queryKey: ['/api/collection/']});
    }

    async function createCollection() {
        await api<Collection>({url: '/api/collection/', method: 'POST'});
        await refreshCollections();
    }

    async function saveTitle() {
        if (!editing) return;
        await api<Collection>({
            url: `/api/collection/${editing.id}`,
            method: 'PATCH',
            data: {name: title},
        });
        setEditing(null);
        await refreshCollections();
    }

    async function deleteCollection() {
        if (!deleting) return;
        await api({url: `/api/collection/${deleting.id}`, method: 'DELETE'});
        setDeleting(null);
        await refreshCollections();
    }

    return (
        <AppShell>
            <div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="h-[222px] flex cursor-pointer flex-col items-center justify-center gap-2" onClick={createCollection}>
                        <CardContent className="p-0"><CirclePlus /></CardContent>
                        <CardContent className="p-0 text-xl">Create a new notebook</CardContent>
                    </Card>
                    {data.map((item) => (
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
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setEditing(item);
                                                    setTitle(item.name);
                                                }}
                                            >
                                                <Pencil />
                                                Chỉnh sửa tiêu đề
                                            </DropdownMenuItem>
                                            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(item)}>
                                                <Trash2 />
                                                Xóa
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="space-y-3">
                                    <h2 className="line-clamp-2 text-2xl leading-tight font-medium text-pretty">
                                        {item.name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {formatCardDate(item.updatedAt)} · {item._count?.documents ?? 0} nguồn
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa tiêu đề</DialogTitle>
                    </DialogHeader>
                    <Input
                        autoFocus
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') saveTitle();
                        }}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)}>
                            Hủy
                        </Button>
                        <Button onClick={saveTitle} disabled={!title.trim()}>
                            Lưu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa sổ ghi chú?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Sổ "{deleting?.name}" và toàn bộ nguồn bên trong sẽ bị xóa.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={deleteCollection}>
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppShell>
    );
}
