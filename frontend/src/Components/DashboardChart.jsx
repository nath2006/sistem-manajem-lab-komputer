import React, { useEffect, useId, useRef } from "react";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useSettings } from "../Context/SettingsContext";
import { dashboardTokens, conditionTone } from "../utils/dashboardTheme";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
);

/** Canvas is an enhancement: the same labeled counts remain available in HTML. */
export default function DashboardChart({
  title,
  rows,
  doughnut = false,
  description,
}) {
  const canvas = useRef(null);
  const instance = useRef(null);
  const id = useId();
  const { settings } = useSettings();
  const tokens = dashboardTokens(settings.primary_color);
  const signature = JSON.stringify({ rows, tokens, doughnut });
  useEffect(() => {
    if (!canvas.current || !rows.some((row) => row.count > 0)) return;
    const chart = new Chart(canvas.current, {
      type: doughnut ? "doughnut" : "bar",
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
      },
    });
    instance.current = chart;
    return () => {
      chart.destroy();
      instance.current = null;
    };
    // Changes of color/data update the mounted instance, never recreate the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doughnut, rows.some((row) => row.count > 0)]);
  useEffect(() => {
    const chart = instance.current;
    if (!chart) return;
    const token = (key) => tokens[`--dashboard-${key}`];
    const tone = (row) =>
      row.tone || (doughnut ? conditionTone(row.label) : null);
    const outlines = rows.map((row, i) =>
      token(
        tone(row) === "primary" ? "accent" : tone(row) || `series-${i % 4}`,
      ),
    );
    chart.data = {
      labels: rows.map((row) => row.label),
      datasets: [
        {
          label: "Jumlah",
          data: rows.map((row) => row.count),
          backgroundColor: rows.map((row, i) =>
            token(
              tone(row) === "primary"
                ? "primary"
                : tone(row)
                  ? `fill-${tone(row)}`
                  : `chart-${i % 4}`,
            ),
          ),
          borderColor: outlines,
          borderWidth: 2,
          borderRadius: doughnut ? 0 : 3,
          maxBarThickness: 28,
          hoverBackgroundColor: outlines,
        },
      ],
    };
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    chart.options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduced ? false : { duration: 200 },
      indexAxis: doughnut ? "x" : "y",
      cutout: doughnut ? "64%" : undefined,
      layout: { padding: 4 },
      plugins: {
        legend: {
          display: doughnut,
          position: "bottom",
          labels: {
            color: token("text"),
            boxWidth: 12,
            padding: 14,
            font: { family: "inherit", size: 11 },
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) =>
              `Jumlah: ${Number(context.raw).toLocaleString("id-ID")}`,
          },
        },
      },
      scales: doughnut
        ? {}
        : {
            x: {
              beginAtZero: true,
              ticks: { color: token("muted"), precision: 0 },
              grid: { color: token("track") },
              border: { display: false },
            },
            y: {
              ticks: {
                color: token("text"),
                autoSkip: false,
                font: { size: 11 },
              },
              grid: { display: false },
              border: { display: false },
            },
          },
    };
    chart.update(reduced ? "none" : undefined);
    // The serialized signature captures all reactive canvas colors and values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  const nonempty = rows.some((row) => row.count > 0);
  return (
    <section className="dashboard-chart" aria-label={title}>
      <h3>{title}</h3>
      {description && <p className="dashboard-chart-note">{description}</p>}
      {nonempty ? (
        <div className="dashboard-canvas-container">
          <canvas
            ref={canvas}
            role="img"
            aria-label={`${title}. Rincian jumlah tersedia di bawah grafik.`}
            aria-describedby={id}
          />
        </div>
      ) : (
        <p className="dashboard-chart-empty" role="status">
          Belum ada data.
        </p>
      )}
      <details id={id} className="dashboard-chart-data">
        <summary>Lihat rincian jumlah</summary>
        <ul>
          {rows.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <strong>{row.count.toLocaleString("id-ID")}</strong>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
