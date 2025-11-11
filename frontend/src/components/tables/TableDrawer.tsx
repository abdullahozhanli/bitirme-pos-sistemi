import { useEffect, useRef, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStaff, Staff, Table, updateTable } from '@/lib/api/tables';
import { useToast } from '@/components/ui/toast';

export default function TableDrawer({
  table,
  open,
  onOpenChange,
}: {
  table?: Table;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [assignee, setAssignee] = useState<string | undefined>(table?.assigneeId);
  const [note, setNote] = useState<string>(table?.note ?? '');
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) getStaff().then(setStaff);
  }, [open]);

  useEffect(() => {
    setAssignee(table?.assigneeId);
    setNote(table?.note ?? '');
  }, [table?.id]);

  useEffect(() => {
    if (open) setTimeout(() => triggerRef.current?.focus(), 50);
  }, [open]);

  if (!table) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="p-4 space-y-4">
        <DrawerHeader>
          <DrawerTitle>{table.name}</DrawerTitle>
        </DrawerHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-neutral-600">Personel Ata</label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger ref={triggerRef}>
                <SelectValue placeholder="Personel seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Personel yok</SelectItem>
                {staff
                  .filter((s) => s.active)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-neutral-600">Not</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button
              onClick={async () => {
                await updateTable({ id: table.id, assigneeId: assignee, note });
                toast({ title: 'Kaydedildi' });
                onOpenChange(false);
              }}
            >
              Kaydet
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
