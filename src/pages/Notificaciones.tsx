import { NotificationsPanel } from '@/components/notifications';

export default function Notificaciones() {
  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full">
        <NotificationsPanel />
      </div>
    </div>
  );
}
