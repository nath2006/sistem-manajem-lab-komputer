import React, { useContext, useEffect, useState } from "react";
import { Monitor, Ticket, Clock3, CircleCheck } from "lucide-react";
import { AuthContext } from "../Context/AuthContext";
import { get } from "../utils/api";
import DashboardChart from "./DashboardChart";
const statuses = {
  new: "Baru",
  assigned: "Ditugaskan",
  in_progress: "Dikerjakan",
  pending: "Menunggu",
  resolved: "Diselesaikan",
  closed: "Ditutup",
  cancelled: "Dibatalkan",
};
const statusTones = {
  new: "info",
  assigned: "info",
  in_progress: "primary",
  pending: "warning",
  resolved: "success",
  closed: "success",
  cancelled: "danger",
};
const total = (rows) => rows.reduce((sum, row) => sum + row.count, 0);
export function DashboardBarChart({
  title,
  rows,
  ticket = false,
  doughnut = false,
  description,
}) {
  return (
    <DashboardChart
      title={title}
      rows={rows.map((row) => ({
        ...row,
        tone: ticket ? statusTones[row.label] || "info" : undefined,
        label: ticket ? statuses[row.label] || row.label : row.label,
      }))}
      doughnut={doughnut}
      description={description}
    />
  );
}
export function DashboardInsightsView({
  data,
  role,
  loading = false,
  error = "",
  onRetry,
}) {
  const scope =
    role === "Guru"
      ? "Hanya tiket yang Anda laporkan."
      : role === "Kepala Lab"
        ? "Tiket Anda dan tiket aset di laboratorium yang Anda pimpin."
        : "Semua tiket yang dapat Anda lihat di menu Bantuan.";
  return (
    <section
      data-tour="dashboard-charts"
      className="dashboard-insights"
      aria-label="Grafik dashboard"
      aria-busy={loading}
    >
      {error && (
        <p role="alert">
          Ringkasan belum dapat dimuat.{" "}
          <button type="button" className="dashboard-retry" onClick={onRetry}>
            Coba lagi
          </button>
        </p>
      )}
      {loading && !data && (
        <div className="dashboard-chart-skeleton" role="status">
          Memuat grafik dashboard…
        </div>
      )}
      {data && (
        <>
          <div className="dashboard-summaries">
            {data.assets && (
              <div className="dashboard-summary" data-summary-tone="primary">
                <Monitor aria-hidden="true" />
                <span>Aset IT</span>
                <strong>
                  {total(data.assets.categories).toLocaleString("id-ID")}
                </strong>
              </div>
            )}
            <div className="dashboard-summary" data-summary-tone="info">
              <Ticket aria-hidden="true" />
              <span>Tiket terlihat</span>
              <strong>
                {data.tickets.available
                  ? total(data.tickets.rows).toLocaleString("id-ID")
                  : "—"}
              </strong>
            </div>
            {data.tickets.available && (
              <div className="dashboard-summary" data-summary-tone="warning">
                <Clock3 aria-hidden="true" />
                <span>Tiket aktif</span>
                <strong>
                  {total(
                    data.tickets.rows.filter(
                      (row) =>
                        !["resolved", "closed", "cancelled"].includes(
                          row.label,
                        ),
                    ),
                  ).toLocaleString("id-ID")}
                </strong>
              </div>
            )}
            {data.tickets.available && (
              <div className="dashboard-summary" data-summary-tone="success">
                <CircleCheck aria-hidden="true" />
                <span>Selesai / ditutup</span>
                <strong>
                  {total(
                    data.tickets.rows.filter((row) =>
                      ["resolved", "closed"].includes(row.label),
                    ),
                  ).toLocaleString("id-ID")}
                </strong>
              </div>
            )}
          </div>
          <div className="dashboard-chart-grid">
            {data.assets && (
              <>
                <DashboardBarChart
                  title="Aset per kategori"
                  rows={data.assets.categories}
                />
                <DashboardBarChart
                  title="Kondisi aset"
                  rows={data.assets.conditions}
                  doughnut
                />
              </>
            )}
            {data.tickets.available ? (
              <DashboardBarChart
                title="Tiket per status"
                rows={data.tickets.rows}
                ticket
                description={scope}
              />
            ) : (
              <section className="dashboard-chart">
                <h3>Tiket per status</h3>
                <p role="status">{data.tickets.reason}</p>
              </section>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default function DashboardInsights() {
  const { state } = useContext(AuthContext);
  // Bind data to the actual session, not just a role shared by many users.
  const session = `${state?.userId}|${state?.role}|${state?.token || ""}`;
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let requestSequence = 0;
    const refresh = async () => {
      const request = ++requestSequence;
      try {
        const response = await get("/dashboard/insights");
        if (active && request === requestSequence) {
          setResult({ session, data: response.data });
          setError("");
        }
      } catch {
        if (active && request === requestSequence)
          setError("Gagal memuat ringkasan.");
      } finally {
        if (active && request === requestSequence) setLoading(false);
      }
    };
    setLoading(true);
    setError("");
    refresh();
    const interval = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [session, retry]);
  return (
    <DashboardInsightsView
      role={state?.role}
      data={result?.session === session ? result.data : null}
      loading={loading}
      error={error}
      onRetry={() => setRetry((value) => value + 1)}
    />
  );
}
