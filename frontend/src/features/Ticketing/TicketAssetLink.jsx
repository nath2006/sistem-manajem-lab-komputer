import { Link } from 'react-router-dom';

export default function TicketAssetLink({ ticket }) {
  if (!ticket.perangkat_id) return null;
  return (
    <Link
      to={`/aset-it?asset=${encodeURIComponent(ticket.perangkat_id)}`}
      className="inline-flex min-h-11 items-center break-words text-maroon underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-maroon"
    >
      Lihat aset: {ticket.nama_perangkat || `#${ticket.perangkat_id}`}
    </Link>
  );
}
